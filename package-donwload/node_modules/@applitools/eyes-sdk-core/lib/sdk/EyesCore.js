'use strict'
const {Driver, specUtils} = require('@applitools/driver')
const {makeLogger} = require('@applitools/logger')
const utils = require('@applitools/utils')
const {takeScreenshot} = require('@applitools/screenshoter')
const ArgumentGuard = require('../utils/ArgumentGuard')
const Region = require('../geometry/Region')
const Location = require('../geometry/Location')
const RectangleSize = require('../geometry/RectangleSize')
const ReadOnlyPropertyHandler = require('../handler/ReadOnlyPropertyHandler')
const EyesBase = require('./EyesBase')
const GeneralUtils = require('../utils/GeneralUtils')
const TypeUtils = require('../utils/TypeUtils')
const takeDomCapture = require('../utils/takeDomCapture')
const EyesError = require('../errors/EyesError')

class EyesCore extends EyesBase {
  constructor(serverUrl, isDisabled) {
    super(serverUrl, isDisabled)

    /** @type {EyesWrappedDriver<TDriver, TElement, TSelector>} */
    this._driver = undefined
    /** @private @type {EyesBrowsingContext<TDriver, TElement, TSelector>} */
    this._context = undefined
    /** @private */
    this._rotation = undefined
  }

  async check(checkSettings = {}, driver) {
    return this._check(checkSettings, driver)
  }

  async checkAndClose(checkSettings, throwEx) {
    this._logger.log(`checkAndClose(checkSettings) - begin`)
    return this._check(checkSettings, undefined, true, throwEx)
  }

  async locate(visualLocatorSettings) {
    ArgumentGuard.notNull(visualLocatorSettings, 'visualLocatorSettings')
    this._logger.log('Get locators with given names: ', visualLocatorSettings.locatorNames)
    await this._driver.init()
    const screenshot = await takeScreenshot({
      logger: this._logger,
      driver: this._driver,
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
      debug: this.getDebugScreenshots(),
    })
    await this.getAndSaveRenderingInfo()
    const imageUrl = await this._serverConnector.uploadScreenshot(GeneralUtils.guid(), await screenshot.image.toPng())
    const appName = this._configuration.getAppName()
    return this._serverConnector.postLocators({
      appName,
      imageUrl,
      locatorNames: visualLocatorSettings.locatorNames,
      firstOnly: visualLocatorSettings.firstOnly,
    })
  }

  async extractText(regions) {
    if (!TypeUtils.isArray(regions)) regions = [regions]

    await this._driver.init()
    await this._driver.refreshContexts()

    const extractTextInputs = []

    for (const userRegion of regions) {
      const region = {...userRegion}

      let dom
      const screenshot = await takeScreenshot({
        logger: this._logger,
        driver: this._driver,
        region: Region.isRegionCompatible(region.target)
          ? {
              x: region.target.left,
              y: region.target.top,
              width: region.target.width,
              height: region.target.height,
            }
          : region.target,
        fully: true,
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
        debug: this.getDebugScreenshots(),
        hooks: {
          afterScreenshot: async ({driver, scroller}) => {
            if (driver.isWeb) {
              this._logger.log('Getting window DOM...')
              await scroller.element.setAttribute('data-applitools-scroll', true)
              dom = await takeDomCapture(this._logger, driver.mainContext).catch(() => null)
            }
          },
        },
      })

      if (
        region.hint === undefined &&
        (specUtils.isSelector(this.spec, region.target) || this.spec.isElement(region.target))
      ) {
        const element = await this._context.element(region.target)
        if (!element) {
          throw new Error(`Unable to find element using provided selector - "${region.target}"`)
        }
        // TODO create a separate snippet with more sophisticated logic
        region.hint = await this._context.execute('return arguments[0].innerText', element)
        if (region.hint) {
          region.hint = region.hint.replace(/[.\\+]/g, '\\$&')
        }
      }

      await this.getAndSaveRenderingInfo()
      const [screenshotUrl, domUrl] = await Promise.all([
        this._serverConnector.uploadScreenshot(GeneralUtils.guid(), await screenshot.image.toPng()),
        this._serverConnector.postDomSnapshot(GeneralUtils.guid(), dom),
      ])
      extractTextInputs.push({
        domUrl,
        screenshotUrl,
        location: {x: Math.round(screenshot.region.x), y: Math.round(screenshot.region.y)},
        region: {
          left: 0,
          top: 0,
          width: screenshot.image.width,
          height: screenshot.image.height,
          expected: region.hint,
        },
        minMatch: region.minMatch,
        language: region.language,
      })
    }

    const results = await Promise.all(extractTextInputs.map(input => this._serverConnector.extractText(input)))

    return results.reduce((strs, result) => strs.concat(result), [])
  }

  async extractTextRegions(config) {
    ArgumentGuard.notNull(config.patterns, 'patterns')

    await this._driver.init()
    await this._driver.refreshContexts()

    let dom
    const screenshot = await takeScreenshot({
      logger: this._logger,
      driver: this._driver,
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
      debug: this.getDebugScreenshots(),
      hooks: {
        afterScreenshot: async ({driver}) => {
          if (driver.isWeb) {
            this._logger.log('Getting window DOM...')
            dom = await takeDomCapture(this._logger, driver.mainContext).catch(() => null)
          }
        },
      },
    })

    await this.getAndSaveRenderingInfo()
    const [screenshotUrl, domUrl] = await Promise.all([
      this._serverConnector.uploadScreenshot(GeneralUtils.guid(), await screenshot.image.toPng()),
      this._serverConnector.postDomSnapshot(GeneralUtils.guid(), dom),
    ])

    return this._serverConnector.extractTextRegions({
      domUrl,
      screenshotUrl,
      location: {x: Math.round(screenshot.region.x), y: Math.round(screenshot.region.y)},
      patterns: config.patterns,
      ignoreCase: config.ignoreCase,
      firstOnly: config.firstOnly,
      language: config.language,
    })
  }

  /* ------------ Getters/Setters ------------ */

  static async getViewportSize(driver) {
    const wrapper = await new Driver({spec: this.spec, driver, logger: makeLogger()}).init()
    const viewportSize = await wrapper.getViewportSize()
    return utils.geometry.round(utils.geometry.scale(viewportSize, wrapper.viewportScale))
  }

  static async setViewportSize(driver, viewportSize) {
    const wrapper = await new Driver({spec: this.spec, driver, logger: makeLogger()}).init()
    if (!wrapper.isMobile) {
      ArgumentGuard.notNull(viewportSize, 'viewportSize')
      await wrapper.setViewportSize(viewportSize)
    }
  }

  async getViewportSize() {
    const viewportSize = this._viewportSizeHandler.get()
      ? this._viewportSizeHandler.get().toJSON()
      : await this._driver.getViewportSize()
    return new RectangleSize(utils.geometry.round(utils.geometry.scale(viewportSize, this._driver.viewportScale)))
  }

  async setViewportSize(viewportSize) {
    if (this._viewportSizeHandler instanceof ReadOnlyPropertyHandler) {
      this._logger.log('Ignored (viewport size given explicitly)')
      return Promise.resolve()
    }

    if (!this._driver.isMobile) {
      ArgumentGuard.notNull(viewportSize, 'viewportSize')
      viewportSize = new RectangleSize(viewportSize)
      try {
        await this._driver.setViewportSize(viewportSize.toJSON())
        this._effectiveViewport = new Region(Location.ZERO, viewportSize)
      } catch (e) {
        const viewportSize = await this._driver.getViewportSize()
        this._viewportSizeHandler.set(
          new RectangleSize(utils.geometry.round(utils.geometry.scale(viewportSize, this._driver.viewportScale))),
        )
        this._logger.error('Failed to set the viewport size', e)
        throw new EyesError('Failed to set the viewport size', e)
      }
    }

    this._viewportSizeHandler.set(new RectangleSize(viewportSize))
  }

  async _getAndSaveBatchInfoFromServer(batchId) {
    ArgumentGuard.notNullOrEmpty(batchId, 'batchId')
    return this._runner.getBatchInfoWithCache(batchId)
  }

  async getAndSaveRenderingInfo() {
    const renderingInfo = await this._runner.getRenderingInfoWithCache()
    this._serverConnector.setRenderingInfo(renderingInfo)
  }

  async getAUTSessionId() {
    if (!this._driver) {
      return undefined
    }
    return this._driver.sessionId
  }

  async getTitle() {
    return this._driver.getTitle()
  }

  getDriver() {
    return this._driver
  }

  getRemoteWebDriver() {
    return this._driver.target
  }

  getRunner() {
    return this._runner
  }

  getDevicePixelRatio() {
    return this._devicePixelRatio
  }

  getRegionToCheck() {
    return this._regionToCheck
  }

  setRegionToCheck(regionToCheck) {
    this._regionToCheck = regionToCheck
  }

  shouldStitchContent() {
    return this._stitchContent
  }

  setScrollRootElement(scrollRootElement) {
    if (scrollRootElement === null) {
      this._scrollRootElement = null
    } else if (this.spec.isSelector(scrollRootElement) || this.spec.isElement(scrollRootElement)) {
      this._scrollRootElement = scrollRootElement
    } else {
      this._scrollRootElement = undefined
    }
  }

  getScrollRootElement() {
    return this._scrollRootElement
  }

  setRotation(rotation) {
    this._rotation = rotation
  }

  getRotation() {
    return this._rotation
  }

  setScaleRatio(scaleRatio) {
    this._scaleRatio = scaleRatio
  }

  getScaleRatio() {
    return this._scaleRatio
  }

  setCut(cut) {
    this._cut = cut
  }

  getCut() {
    return this._cut
  }

  setDebugScreenshots(debugScreenshots) {
    this._debugScreenshots = debugScreenshots
  }

  getDebugScreenshots() {
    return this._debugScreenshots
  }

  getDomUrl() {
    return this._domUrl
  }

  setDomUrl(domUrl) {
    this._domUrl = domUrl
  }

  setCorsIframeHandle(corsIframeHandle) {
    this._corsIframeHandle = corsIframeHandle
  }

  getCorsIframeHandle() {
    return this._corsIframeHandle
  }
}

module.exports = EyesCore
