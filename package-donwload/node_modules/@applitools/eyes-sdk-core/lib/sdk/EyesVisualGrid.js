const utils = require('@applitools/utils')
const {Driver} = require('@applitools/driver')
const Configuration = require('../config/Configuration')
const TypeUtils = require('../utils/TypeUtils')
const GeneralUtils = require('../utils/GeneralUtils')
const ArgumentGuard = require('../utils/ArgumentGuard')
const TestResultsFormatter = require('../TestResultsFormatter')
const CorsIframeHandler = require('../capture/CorsIframeHandler')
const VisualGridRunner = require('../runner/VisualGridRunner')
const takeDomSnapshots = require('../utils/takeDomSnapshots')
const takeVHSes = require('../utils/takeVHSes')
const EyesCore = require('./EyesCore')
const CheckSettingsUtils = require('../sdk/CheckSettingsUtils')
const EyesUtils = require('./EyesUtils')
const {lazyLoad} = require('@applitools/snippets')
const makeLazyLoadOptions = require('../config/LazyLoadOptions')
const {appendUserTestIdToTestResults} = require('../utils/amend-test-results')

class EyesVisualGrid extends EyesCore {
  static specialize({agentId, spec, cwd, VisualGridClient}) {
    return class extends EyesVisualGrid {
      static get spec() {
        return spec
      }
      static get VisualGridClient() {
        return VisualGridClient
      }
      get spec() {
        return spec
      }
      getCwd() {
        return cwd
      }
      getBaseAgentId() {
        return agentId
      }
    }
  }

  constructor(serverUrl, isDisabled, runner = new VisualGridRunner()) {
    super(serverUrl, isDisabled)
    /** @private */
    this._runner = runner
    this._runner.attachEyes(this, this._serverConnector)
    this._runner.makeGetVisualGridClient(this.constructor.VisualGridClient.makeVisualGridClient)

    /** @private @type {boolean} */
    this._isOpen = false
    /** @private @type {boolean} */
    this._isVisualGrid = true
    /** @private @type {CorsIframeHandle} */
    this._corsIframeHandle = 'BLANK'

    /** @private */
    this._checkWindowCommand = undefined
    /** @private */
    this._closeCommand = undefined
    /** @private */
    this._abortCommand = undefined

    /** @private @type {Promise<void>} */
    this._closePromise = Promise.resolve()
  }

  async open(driver, optArg1, optArg2, optArg3, optArg4) {
    ArgumentGuard.notNull(driver, 'driver')
    const useCeilForViewportSize = this._configuration.getUseCeilForViewportSize()
    const keepPlatformNameAsIs = this._configuration.getKeepPlatformNameAsIs()
    const customConfig = {useCeilForViewportSize, keepPlatformNameAsIs}
    this._driver = await new Driver({spec: this.spec, driver, logger: this._logger, customConfig}).init()
    this._context = this._driver.currentContext

    if (optArg1 instanceof Configuration) {
      this._configuration.mergeConfig(optArg1)
    } else {
      this._configuration.setAppName(TypeUtils.getOrDefault(optArg1, this._configuration.getAppName()))
      this._configuration.setTestName(TypeUtils.getOrDefault(optArg2, this._configuration.getTestName()))
      this._configuration.setViewportSize(TypeUtils.getOrDefault(optArg3, this._configuration.getViewportSize()))
      this._configuration.setSessionType(TypeUtils.getOrDefault(optArg4, this._configuration.getSessionType()))
    }

    ArgumentGuard.notNull(this._configuration.getAppName(), 'appName')
    ArgumentGuard.notNull(this._configuration.getTestName(), 'testName')

    const browsersInfo = this._configuration.getBrowsersInfo()
    if (!this._configuration.getViewportSize() && browsersInfo && browsersInfo.length > 0) {
      const browserInfo = browsersInfo.find(browserInfo => browserInfo.width)
      if (browserInfo) {
        this._configuration.setViewportSize({width: browserInfo.width, height: browserInfo.height})
      }
    }

    if (!this._configuration.getViewportSize()) {
      const vs = await this._driver.getViewportSize()
      this._configuration.setViewportSize(utils.geometry.round(utils.geometry.scale(vs, this._driver.viewportScale)))
    }

    if (!browsersInfo || browsersInfo.length === 0) {
      const vs = this._configuration.getViewportSize()
      this._configuration.addBrowser(vs.getWidth(), vs.getHeight(), 'chrome')
    }

    if (!this._configuration.getUserTestId()) {
      this._configuration.setUserTestId(utils.general.guid())
    }

    const {openEyes, getResourceUrlsInCache, getIosDevicesSizes, getEmulatedDevicesSizes} =
      await this._runner.getVisualGridClientWithCache({
        logger: this._logger,
        agentId: this.getFullAgentId(),
        apiKey: this._configuration.getApiKey(),
        showLogs: this._configuration.getShowLogs(),
        proxy: this._configuration.getProxy(),
        autProxy: this._configuration.getAutProxy(),
        serverUrl: this._configuration.getServerUrl(),
        concurrency: this._runner.legacyConcurrency || this._configuration.getConcurrentSessions(),
        testConcurrency: this._runner.testConcurrency,
      })

    if (this._configuration.getViewportSize()) {
      const vs = this._configuration.getViewportSize()
      await this.setViewportSize(vs)
    }

    const openParams = this._configuration.toOpenEyesConfiguration()
    const {checkWindow, close, abort} = await openEyes({
      ...openParams,
      agentRunId: `${openParams.testName}--${GeneralUtils.randomAlphanumeric(10)}`,
    })

    this._isOpen = true
    this._checkWindowCommand = checkWindow
    this._closeCommand = close
    this._abortCommand = abort
    this._getResourceUrlsInCache = getResourceUrlsInCache
    this._getIosDevicesSizes = getIosDevicesSizes
    this._getEmulatedDevicesSizes = getEmulatedDevicesSizes
  }

  async _check(checkSettings, driver, closeAfterMatch = false, throwEx = true) {
    this._logger.log(`check started with tag "${checkSettings.name}" for test "${this._configuration.getTestName()}"`)
    if (driver) {
      const useCeilForViewportSize = this._configuration.getUseCeilForViewportSize()
      const keepPlatformNameAsIs = this._configuration.getKeepPlatformNameAsIs()
      const customConfig = {useCeilForViewportSize, keepPlatformNameAsIs}
      this._driver = await new Driver({spec: this.spec, driver, logger: this._logger, customConfig}).init()
    } else {
      await this._driver.init()
    }

    return this._checkPrepare(checkSettings, async () => {
      const {persistedCheckSettings, cleanupPersistance} = await CheckSettingsUtils.toPersistedCheckSettings({
        checkSettings,
        context: this._context,
        logger: this._logger,
      })

      try {
        const browsers = this._configuration.getBrowsersInfo()
        const breakpoints = TypeUtils.getOrDefault(
          checkSettings.layoutBreakpoints,
          this._configuration.getLayoutBreakpoints(),
        )
        const disableBrowserFetching = TypeUtils.getOrDefault(
          checkSettings.disableBrowserFetching,
          this._configuration.getDisableBrowserFetching(),
        )
        const waitBeforeCapture = TypeUtils.getOrDefault(
          checkSettings.waitBeforeCapture,
          this._configuration.getWaitBeforeCapture(),
        )
        const lazyLoadOptions = makeLazyLoadOptions(checkSettings.lazyLoad)
        const showLogs = this._configuration.getShowLogs()

        const snapshotArgs = {}
        if (this._driver.isWeb) {
          const {snapshots, cookies} = await takeDomSnapshots({
            browsers,
            breakpoints,
            disableBrowserFetching,
            driver: this._driver,
            logger: this._logger,
            skipResources: this._getResourceUrlsInCache(),
            getViewportSize: () => this.getViewportSize().then(rectangleSize => rectangleSize.toJSON()),
            getEmulatedDevicesSizes: this._getEmulatedDevicesSizes,
            getIosDevicesSizes: this._getIosDevicesSizes,
            showLogs,
            waitBeforeCapture: () => utils.general.sleep(waitBeforeCapture),
            lazyLoadBeforeCapture: async () => {
              if (lazyLoadOptions) {
                this._logger.log('lazy loading the page before capturing snapshots')
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
                await EyesUtils.executePollScript(this._logger, this._driver, scripts, {
                  pollTimeout: lazyLoadOptions.waitingTime,
                })
              }
            },
          })

          const [{url}] = snapshots
          if (this.getCorsIframeHandle() === 'BLANK') {
            snapshots.forEach(CorsIframeHandler.blankCorsIframeSrcOfCdt)
          }
          snapshotArgs.url = url
          snapshotArgs.snapshot = snapshots
          snapshotArgs.cookies = cookies
        } else {
          const {snapshots} = await takeVHSes({
            driver: this._driver,
            browsers,
            apiKey: this._configuration.getApiKey(),
            serverUrl: this._configuration.getServerUrl(),
            proxy: this._configuration.getProxy(),
            waitBeforeCapture: () => utils.general.sleep(waitBeforeCapture),
            logger: this._logger,
          })
          snapshotArgs.isNativeUFG = true
          snapshotArgs.snapshot = snapshots
        }

        const config = CheckSettingsUtils.toCheckWindowConfiguration({
          checkSettings: persistedCheckSettings,
          configuration: this._configuration,
        })

        return await this._checkWindowCommand({
          ...config,
          ...snapshotArgs,
          closeAfterMatch,
          throwEx,
        })
      } finally {
        await cleanupPersistance()
      }
    })
  }

  async _checkPrepare(checkSettings, operation) {
    this._context = await this._driver.refreshContexts()
    await this._context.main.setScrollingElement(this._scrollRootElement)
    await this._context.setScrollingElement(checkSettings.scrollRootElement)
    const originalContext = this._context
    if (checkSettings.frames && checkSettings.frames.length > 0) {
      this._context = await this._context.context(
        checkSettings.frames.reduce(
          (parent, frame) => ({
            reference: utils.types.has(frame, 'frame') ? frame.frame : frame,
            scrollingElement: frame.scrollRootElement,
            parent,
          }),
          null,
        ),
      )
      await this._context.focus()
    }
    try {
      return await operation()
    } finally {
      await this._context.main.setScrollingElement(null)
      await this._context.setScrollingElement(null)
      this._context = await originalContext.focus()
    }
  }

  async getScreenshot() {
    return undefined
  }

  async close() {
    const userTestId = this._configuration.getUserTestId()
    const browsersInfo = this._configuration.getBrowsersInfo()
    let isErrorCaught = false
    this._closePromise = this._closeCommand(true)
      .catch(err => {
        isErrorCaught = true
        return err
      })
      .then(results => {
        this._isOpen = false
        if (isErrorCaught) {
          if (!Array.isArray(results)) throw results
        }
        return results.map((result, i) => {
          let testResults = result instanceof Error ? result.info && result.info.testResult : result.toJSON()
          testResults = appendUserTestIdToTestResults(testResults, userTestId)
          const exception = testResults ? null : result
          return {
            testResults,
            exception,
            userTestId,
            browserInfo: browsersInfo[i],
          }
        })
      })
      .then(containers => {
        if (this._runner) {
          this._runner._allTestResult.push(...containers)
        }
        const errorContainer = containers.find(({exception}) => !!exception)
        if (errorContainer) {
          throw errorContainer.exception
        }

        return containers.map(({testResults}) => testResults)
      })

    return this._closePromise
  }

  async closeAndPrintResults(throwEx = true) {
    const results = await this.close(throwEx)

    const testResultsFormatter = new TestResultsFormatter(results)
    // eslint-disable-next-line no-console
    console.log(testResultsFormatter.asFormatterString())
  }

  async abort() {
    const userTestId = this._configuration.getUserTestId()
    this._isOpen = false
    return (this._abortPromise = this._abortCommand().then(results => {
      const resultJson = results.map(result => {
        return result ? appendUserTestIdToTestResults(result.toJSON(), userTestId) : result
      }) // not sure if it can even happen that abortCommand from vgc can return partly null array
      this._runner._allTestResult.push(
        ...resultJson.filter(result => !!result).map(result => ({testResults: result, userTestId})),
      )
      return resultJson
    }))
  }

  async getInferredEnvironment() {
    return undefined
  }
}
module.exports = EyesVisualGrid
