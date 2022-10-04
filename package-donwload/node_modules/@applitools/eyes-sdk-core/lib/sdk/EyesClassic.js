const utils = require('@applitools/utils')
const {takeScreenshot} = require('@applitools/screenshoter')
const {Driver} = require('@applitools/driver')
const TypeUtils = require('../utils/TypeUtils')
const ArgumentGuard = require('../utils/ArgumentGuard')
const Location = require('../geometry/Location')
const ClassicRunner = require('../runner/ClassicRunner')
const takeDomCapture = require('../utils/takeDomCapture')
const EyesCore = require('./EyesCore')
const CheckSettingsUtils = require('./CheckSettingsUtils')
const EyesUtils = require('./EyesUtils')
const {lazyLoad} = require('@applitools/snippets')
const makeLazyLoadOptions = require('../config/LazyLoadOptions')
const {appendUserTestIdToTestResults} = require('../utils/amend-test-results')

class EyesClassic extends EyesCore {
  static specialize({agentId, cwd, spec}) {
    return class extends EyesClassic {
      static get spec() {
        return spec
      }
      get spec() {
        return spec
      }
      getCwd() {
        return cwd
      }
      /**
       * @return {string} base agent id
       */
      getBaseAgentId() {
        return agentId
      }
    }
  }

  constructor(serverUrl, isDisabled = false, runner = new ClassicRunner()) {
    super(serverUrl, isDisabled)
    /** @private */
    this._runner = runner
    this._runner.attachEyes(this, this._serverConnector)

    /** @private @type {string}*/
    this._domUrl
    /** @private @type {EyesWrappedElement<TDriver, TElement, TSelector>} */
    this._scrollRootElement = undefined
    /** @private @type {Promise<void>} */
    this._closePromise = Promise.resolve()
  }

  async open(driver, appName, testName, viewportSize, sessionType) {
    ArgumentGuard.notNull(driver, 'driver')
    const useCeilForViewportSize = this._configuration.getUseCeilForViewportSize()
    const keepPlatformNameAsIs = this._configuration.getKeepPlatformNameAsIs()
    const customConfig = {useCeilForViewportSize, keepPlatformNameAsIs}
    this._driver = await new Driver({spec: this.spec, driver, logger: this._logger, customConfig}).init()
    this._context = this._driver.currentContext

    this._configuration.setAppName(TypeUtils.getOrDefault(appName, this._configuration.getAppName()))
    this._configuration.setTestName(TypeUtils.getOrDefault(testName, this._configuration.getTestName()))
    this._configuration.setViewportSize(TypeUtils.getOrDefault(viewportSize, this._configuration.getViewportSize()))
    this._configuration.setSessionType(TypeUtils.getOrDefault(sessionType, this._configuration.getSessionType()))

    if (!this._configuration.getViewportSize()) {
      const vs = await this._driver.getViewportSize()
      this._configuration.setViewportSize(utils.geometry.round(utils.geometry.scale(vs, this._driver.viewportScale)))
    }

    if (!this._configuration.getUserTestId()) {
      this._configuration.setUserTestId(utils.general.guid())
    }

    if (this._driver.isMobile) {
      // set viewportSize to null if browser is mobile
      this._configuration.setViewportSize(null)
    }

    await this.openBase(
      this._configuration.getAppName(),
      this._configuration.getTestName(),
      this._configuration.getViewportSize(),
      this._configuration.getSessionType(),
    )
  }

  // set waitBeofreCpature from checkSettings in configuration.
  async _check(checkSettings = {}, driver, closeAfterMatch = false, throwEx = true) {
    if (driver) {
      const useCeilForViewportSize = this._configuration.getUseCeilForViewportSize()
      const keepPlatformNameAsIs = this._configuration.getKeepPlatformNameAsIs()
      const customConfig = {useCeilForViewportSize, keepPlatformNameAsIs}
      this._driver = new Driver({spec: this.spec, driver, logger: this._logger, customConfig})
    }
    await this._driver.init()

    this._context = await this._driver.refreshContexts()
    await this._context.main.setScrollingElement(this._scrollRootElement)
    await this._context.setScrollingElement(checkSettings.scrollRootElement)
    if (checkSettings.pageId) {
      const scrollingElement = await this._context.main.getScrollingElement()
      const contentSize = scrollingElement
        ? await scrollingElement.getContentSize()
        : await this._driver.getViewportSize()
      this.pageCoverageInfo = {
        pageId: checkSettings.pageId,
        width: contentSize.width,
        height: contentSize.height,
      }
    }

    this._checkSettings = checkSettings
    const result = await this.checkWindowBase({
      name: checkSettings.name,
      url: await this._driver.getUrl(),
      renderId: checkSettings.renderId,
      variationGroupId: checkSettings.variationGroupId,
      sendDom: checkSettings.sendDom,
      retryTimeout: checkSettings.timeout,
      closeAfterMatch,
      throwEx,
    })

    await this._context.main.setScrollingElement(null)
    await this._context.setScrollingElement(null)

    return result
  }

  async getScreenshot() {
    this._logger.log('getScreenshot()')

    const screenshotSettings = {
      frames:
        this._checkSettings.frames &&
        this._checkSettings.frames.map(frame => ({
          reference: utils.types.has(frame, 'frame') ? frame.frame : frame,
          scrollingElement: frame.scrollRootElement,
        })),
      region: this._checkSettings.region,
      fully: TypeUtils.getOrDefault(this._checkSettings.fully, this._configuration.getForceFullPageScreenshot()),
      framed: this._driver.isNative,
      hideScrollbars: this._configuration.getHideScrollbars(),
      hideCaret: this._configuration.getHideCaret(),
      scrollingMode: this._configuration.getStitchMode().toLocaleLowerCase(),
      overlap: {top: 10, bottom: this._configuration.getStitchOverlap()},
      wait: this._configuration.getWaitBeforeScreenshots(),
      stabilization: {
        crop: this.getCut(),
        scale: this.getScaleRatio(),
        rotation: this.getRotation(),
      },
    }

    const lazyLoadOptions = makeLazyLoadOptions(this._checkSettings.lazyLoad)

    if (lazyLoadOptions) {
      this._logger.log('lazy loading the page before capturing a screenshot')
      const scripts = {
        main: {
          script: lazyLoad,
          args: [[lazyLoadOptions]],
        },
        poll: {
          script: lazyLoad,
          args: [[]],
        },
      }
      await EyesUtils.executePollScript(this._logger, this._driver, scripts, {pollTimeout: lazyLoadOptions.waitingTime})
    }

    let dom
    let afterScreenShotScrollingOffeset = null
    const screenshot = await takeScreenshot({
      ...screenshotSettings,
      driver: this._driver,
      hooks: {
        afterScreenshot: async ({driver, scroller, screenshot}) => {
          this._checkSettings = await CheckSettingsUtils.toScreenshotCheckSettings({
            context: driver.currentContext,
            checkSettings: this._checkSettings,
            screenshot,
          })
          if (driver.isWeb && TypeUtils.getOrDefault(this._checkSettings.sendDom, this._configuration.getSendDom())) {
            this._logger.log('Getting window DOM...')
            if (screenshotSettings.fully) {
              await scroller.element.setAttribute('data-applitools-scroll', true)
            }
            dom = await takeDomCapture(this._logger, driver.mainContext).catch(() => null)
          }
          if (this._checkSettings.pageId) {
            const scrollingElement = await driver.mainContext.getScrollingElement()
            // In case driver.isNative the scrolling element does not use 'preserveState' and 'restoreState'.
            // as result, at this point the scrolling element will be at its scroll-most status
            afterScreenShotScrollingOffeset = driver.isNative ? {x: 0, y: 0} : await scrollingElement.getScrollOffset()
          }
        },
      },
      debug: this.getDebugScreenshots(),
      logger: this._logger,
    })
    this._imageLocation = new Location(Math.round(screenshot.region.x), Math.round(screenshot.region.y))
    if (afterScreenShotScrollingOffeset) {
      const imagePositionInPage_x = Math.round(afterScreenShotScrollingOffeset.x + screenshot.region.x)
      const imagePositionInPage_y = Math.round(afterScreenShotScrollingOffeset.y + screenshot.region.y)
      this._logger.log('>>> imagePositionInPage', imagePositionInPage_x, imagePositionInPage_y)
      this.pageCoverageInfo.imagePositionInPage = {x: imagePositionInPage_x, y: imagePositionInPage_y}
    }
    this._matchSettings = await CheckSettingsUtils.toMatchSettings({
      checkSettings: this._checkSettings,
      configuration: this._configuration,
    })

    return {...screenshot, dom}
  }

  async close() {
    const userTestId = this._configuration.getUserTestId()
    let isErrorCaught = false
    this._closePromise = super
      .close(true)
      .catch(err => {
        isErrorCaught = true
        return err
      })
      .then(results => {
        if (isErrorCaught) {
          if (results.info && results.info.testResult) {
            let testResults = results.info.testResult
            testResults = appendUserTestIdToTestResults(testResults, userTestId)
            return {testResults, userTestId}
          } else return {exception: results}
        }
        let testResults = results.toJSON()
        testResults = appendUserTestIdToTestResults(testResults, userTestId)
        return {testResults, userTestId}
      })
      .then(container => {
        if (this._runner) {
          this._runner._allTestResult.push(container)
        }

        if (container.testResults) {
          return [container.testResults]
        } else {
          throw container.exception
        }
      })

    return this._closePromise
  }

  async abort() {
    const userTestId = this._configuration.getUserTestId()
    return (this._abortPromise = super.abort().then(results => {
      if (results) {
        let resultsJson = results.toJSON()
        resultsJson = appendUserTestIdToTestResults(resultsJson, userTestId)
        this._runner._allTestResult.push({testResults: resultsJson, userTestId})
        return [resultsJson]
      } else {
        return results
      }
    }))
  }

  async getAppEnvironment() {
    const appEnv = await super.getAppEnvironment()

    if (!appEnv._deviceInfo && this._driver.deviceName) {
      appEnv.setDeviceInfo(this._driver.deviceName)
    }

    if (!appEnv._os && this._driver.isNative) {
      let os = this._driver.platformName
      if (this._driver.platformVersion) {
        os += ` ${this._driver.platformVersion}`
      }
      if (os) {
        appEnv.setOs(os)
      }
    }
    return appEnv
  }

  setFailureReport(mode) {
    if (mode === 'IMMEDIATE') {
      this._failureReportOverridden = true
      mode = 'ON_CLOSE'
    }

    EyesCore.prototype.setFailureReport.call(this, mode)
  }

  getSendDom() {
    return !this._driver.isNative && super.getSendDom()
  }

  getImageLocation() {
    if (this._imageLocation) {
      return new Location(Math.round(this._imageLocation.getX()), Math.round(this._imageLocation.getY()))
    }
    return Location.ZERO
  }

  getMatchSettings() {
    return this._matchSettings
  }

  async getInferredEnvironment() {
    try {
      const userAgent = this._driver.userAgent
      return userAgent ? 'useragent:' + userAgent : userAgent
    } catch (err) {
      return null
    }
  }

  async getRegionByLocator(locator) {
    const element = await this._driver.element(locator)
    const rect = await element.getElementRect()
    return rect
  }
}

module.exports = EyesClassic
