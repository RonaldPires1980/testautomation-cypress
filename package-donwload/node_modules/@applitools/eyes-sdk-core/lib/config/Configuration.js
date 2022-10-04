const BatchInfo = require('./BatchInfo')
const PropertyData = require('./PropertyData')
const ProxySettings = require('./ProxySettings')
const ImageMatchSettings = require('./ImageMatchSettings')
const RectangleSize = require('../geometry/RectangleSize')
const ArgumentGuard = require('../utils/ArgumentGuard')
const TypeUtils = require('../utils/TypeUtils')
const GeneralUtils = require('../utils/GeneralUtils')

const MIN_MATCH_TIMEOUT = 500

const DEFAULT_VALUES = {
  isDisabled: false,
  matchTimeout: 2000, // ms
  serverUrl: 'https://eyesapi.applitools.com',
  compareWithParentBranch: false,
  saveFailedTests: false,
  saveNewTests: true,
  ignoreBaseline: false,
  sendDom: true,
  dontCloseBatches: false,

  // classic (selenium)
  waitBeforeScreenshots: 100, // ms
  stitchMode: 'Scroll',
  hideScrollbars: true,
  hideCaret: true,
  stitchOverlap: 50, // px

  // visual-grid
  concurrentSessions: 1,
  isThrowExceptionOn: false,
  waitBeforeCapture: 100, //ms
}

class Configuration {
  constructor(configuration) {
    this._logs = undefined
    this._showLogs = undefined

    this._appName = undefined
    this._testName = undefined
    this._userTestId = undefined
    this._displayName = undefined
    this._isDisabled = undefined
    this._matchTimeout = undefined
    this._sessionType = undefined
    this._viewportSize = undefined
    this._agentId = undefined

    this._apiKey = undefined
    this._serverUrl = undefined
    this._proxySettings = undefined
    this._autProxy = undefined
    this._connectionTimeout = undefined
    this._removeSession = undefined

    this._batch = undefined

    this._properties = []

    this._baselineEnvName = undefined
    this._environmentName = undefined

    this._branchName = undefined
    this._parentBranchName = undefined
    this._baselineBranchName = undefined
    this._compareWithParentBranch = undefined

    this._saveFailedTests = undefined
    this._saveNewTests = undefined
    this._ignoreBaseline = undefined
    this._saveDiffs = undefined
    this._sendDom = undefined

    this._hostApp = undefined
    this._hostOS = undefined
    this._hostAppInfo = undefined
    this._hostOSInfo = undefined
    this._deviceInfo = undefined

    this._defaultMatchSettings = new ImageMatchSettings(configuration ? configuration.defaultMatchSettings : undefined)

    // classic (selenium)
    this._forceFullPageScreenshot = undefined
    this._waitBeforeScreenshots = undefined
    this._stitchMode = undefined
    this._hideScrollbars = undefined
    this._hideCaret = undefined
    this._stitchOverlap = undefined
    this._waitBeforeCapture = undefined

    // visual grid
    this._concurrentSessions = undefined
    this._isThrowExceptionOn = undefined
    this._browsersInfo = undefined
    this._dontCloseBatches = undefined
    this._visualGridOptions = undefined
    this._layoutBreakpoints = undefined
    this._disableBrowserFetching = undefined
    this._abortIdleTestTimeout = undefined
    this._ignoreGitMergeBase = undefined
    this._useCeilForViewportSize = undefined
    this._keepPlatformNameAsIs = undefined

    if (configuration) {
      this.mergeConfig(configuration)
    }
  }

  getLogs() {
    return this._logs
  }

  setLogs(logs) {
    this._logs = logs
  }

  getShowLogs() {
    return this._showLogs
  }

  setShowLogs(value) {
    ArgumentGuard.isBoolean(value, 'showLogs')
    this._showLogs = value
    return this
  }

  getSaveDebugData() {
    GeneralUtils.deprecationWarning({deprecatedThing: 'saveDebugData', isDead: true})
  }

  setSaveDebugData(_value) {
    GeneralUtils.deprecationWarning({deprecatedThing: 'saveDebugData', isDead: true})
    return this
  }

  getApiKey() {
    return TypeUtils.getOrDefault(this._apiKey, GeneralUtils.getEnvValue('API_KEY'))
  }

  setApiKey(value) {
    ArgumentGuard.isString(value, 'apiKey')
    ArgumentGuard.alphanumeric(value, 'apiKey')
    this._apiKey = value
    return this
  }

  getServerUrl() {
    return TypeUtils.getOrDefault(this._serverUrl, GeneralUtils.getEnvValue('SERVER_URL') || DEFAULT_VALUES.serverUrl)
  }

  setServerUrl(value) {
    ArgumentGuard.isString(value, 'serverUrl', false)
    this._serverUrl = value
    return this
  }

  getProxy() {
    return this._proxySettings
  }

  setProxy(value) {
    if (TypeUtils.isNull(value)) {
      this._proxySettings = undefined
    } else if (value === false || TypeUtils.isString(value)) {
      this._proxySettings = new ProxySettings(value)
    } else if (value instanceof ProxySettings) {
      this._proxySettings = value
    } else {
      this._proxySettings = new ProxySettings(value.url, value.username, value.password, value.isHttpOnly)
    }
    return this
  }

  getAutProxy() {
    return this._autProxy
  }

  setAutProxy({proxy, domains, AUTProxyMode = 'Allow'}) {
    let this_proxy
    if (TypeUtils.isNull(proxy)) {
      this_proxy = undefined
    } else if (proxy === false || TypeUtils.isString(proxy)) {
      this_proxy = new ProxySettings(proxy)
    } else if (proxy instanceof ProxySettings) {
      this_proxy = proxy
    } else {
      this_proxy = new ProxySettings(proxy.url, proxy.username, proxy.password, proxy.isHttpOnly)
    }
    this._autProxy = {proxy: this_proxy, domains, AUTProxyMode}
  }

  getConnectionTimeout() {
    return this._connectionTimeout
  }

  setConnectionTimeout(value) {
    ArgumentGuard.greaterThanOrEqualToZero(value, 'connectionTimeout', true)
    this._connectionTimeout = value
    return this
  }

  getRemoveSession() {
    return this._removeSession
  }

  setRemoveSession(value) {
    ArgumentGuard.isBoolean(value, 'removeSession')
    this._removeSession = value
    return this
  }

  getCompareWithParentBranch() {
    return TypeUtils.getOrDefault(this._compareWithParentBranch, DEFAULT_VALUES.compareWithParentBranch)
  }

  setCompareWithParentBranch(value) {
    ArgumentGuard.isBoolean(value, 'compareWithParentBranch')
    this._compareWithParentBranch = value
    return this
  }

  getIgnoreBaseline() {
    return TypeUtils.getOrDefault(this._ignoreBaseline, DEFAULT_VALUES.ignoreBaseline)
  }

  setIgnoreBaseline(value) {
    ArgumentGuard.isBoolean(value, 'ignoreBaseline')
    this._ignoreBaseline = value
    return this
  }

  getSaveNewTests() {
    return TypeUtils.getOrDefault(this._saveNewTests, DEFAULT_VALUES.saveNewTests)
  }

  setSaveNewTests(value) {
    ArgumentGuard.isBoolean(value, 'saveNewTests')
    this._saveNewTests = value
    return this
  }

  getSaveFailedTests() {
    return TypeUtils.getOrDefault(this._saveFailedTests, DEFAULT_VALUES.saveFailedTests)
  }

  setSaveFailedTests(value) {
    ArgumentGuard.isBoolean(value, 'saveFailedTests')
    this._saveFailedTests = value
    return this
  }

  getMatchTimeout() {
    return TypeUtils.getOrDefault(this._matchTimeout, DEFAULT_VALUES.matchTimeout)
  }

  setMatchTimeout(value) {
    ArgumentGuard.greaterThanOrEqualToZero(value, 'matchTimeout', true)

    if (value !== 0 && MIN_MATCH_TIMEOUT > value) {
      throw new TypeError(`Match timeout must be set in milliseconds, and must be > ${MIN_MATCH_TIMEOUT}`)
    }

    this._matchTimeout = value
    return this
  }

  getIsDisabled() {
    return TypeUtils.getOrDefault(this._isDisabled, DEFAULT_VALUES.isDisabled)
  }

  setIsDisabled(value) {
    ArgumentGuard.isBoolean(value, 'isDisabled', false)
    this._isDisabled = value
    return this
  }

  getBatch() {
    if (this._batch === undefined) {
      this._batch = new BatchInfo()
    }

    return this._batch
  }

  setBatch(value) {
    this._batch = value ? new BatchInfo(value) : undefined
    return this
  }

  getProperties() {
    return this._properties
  }

  setProperties(value) {
    ArgumentGuard.isArray(value, 'properties')

    for (const data of value) {
      this._properties.push(new PropertyData(data))
    }
    return this
  }

  addProperty(propertyOrName, propertyValue) {
    this._properties.push(new PropertyData(propertyOrName, propertyValue))
    return this
  }

  getBranchName() {
    return TypeUtils.getOrDefault(this._branchName, GeneralUtils.getEnvValue('BRANCH'))
  }

  setBranchName(value) {
    ArgumentGuard.isString(value, 'branchName')
    this._branchName = value
    return this
  }

  getAgentId() {
    return this._agentId
  }

  setAgentId(value) {
    ArgumentGuard.isString(value, 'agentId')
    this._agentId = value
    return this
  }

  getParentBranchName() {
    return TypeUtils.getOrDefault(this._parentBranchName, GeneralUtils.getEnvValue('PARENT_BRANCH'))
  }

  setParentBranchName(value) {
    ArgumentGuard.isString(value, 'parentBranchName')
    this._parentBranchName = value
    return this
  }

  getBaselineBranchName() {
    return TypeUtils.getOrDefault(this._baselineBranchName, GeneralUtils.getEnvValue('BASELINE_BRANCH'))
  }

  setBaselineBranchName(value) {
    ArgumentGuard.isString(value, 'baselineBranchName')
    this._baselineBranchName = value
    return this
  }

  getBaselineEnvName() {
    return this._baselineEnvName
  }

  setBaselineEnvName(value) {
    ArgumentGuard.isString(value, 'baselineEnvName', false)
    this._baselineEnvName = value ? value.trim() : undefined
    return this
  }

  getEnvironmentName() {
    return this._environmentName
  }

  setEnvironmentName(value) {
    ArgumentGuard.isString(value, 'environmentName', false)
    this._environmentName = value ? value.trim() : undefined
    return this
  }

  getSaveDiffs() {
    return this._saveDiffs
  }

  setSaveDiffs(value) {
    ArgumentGuard.isBoolean(value, 'saveDiffs')
    this._saveDiffs = value
    return this
  }

  getSendDom() {
    return TypeUtils.getOrDefault(this._sendDom, DEFAULT_VALUES.sendDom)
  }

  setSendDom(value) {
    ArgumentGuard.isBoolean(value, 'sendDom')
    this._sendDom = value
    return this
  }

  getHostApp() {
    return this._hostApp
  }

  setHostApp(value) {
    if (TypeUtils.isNull(value)) {
      this._hostApp = undefined
    } else {
      this._hostApp = value.trim()
    }
    return this
  }

  getHostOS() {
    return this._hostOS
  }

  setHostOS(value) {
    if (TypeUtils.isNull(value)) {
      this._hostOS = undefined
    } else {
      this._hostOS = value.trim()
    }
    return this
  }

  getHostAppInfo() {
    return this._hostAppInfo
  }

  setHostAppInfo(value) {
    if (TypeUtils.isNull(value)) {
      this._hostAppInfo = undefined
    } else {
      this._hostAppInfo = value.trim()
    }
    return this
  }

  getHostOSInfo() {
    return this._hostOSInfo
  }

  setHostOSInfo(value) {
    if (TypeUtils.isNull(value)) {
      this._hostOSInfo = undefined
    } else {
      this._hostOSInfo = value.trim()
    }
    return this
  }

  getDeviceInfo() {
    return this._deviceInfo
  }

  setDeviceInfo(value) {
    if (TypeUtils.isNull(value)) {
      this._deviceInfo = undefined
    } else {
      this._deviceInfo = value.trim()
    }
    return this
  }

  getAppName() {
    return this._appName
  }

  setAppName(value) {
    ArgumentGuard.isString(value, 'appName', false)
    this._appName = value
    return this
  }

  getTestName() {
    return this._testName
  }

  setTestName(value) {
    ArgumentGuard.isString(value, 'testName', false)
    this._testName = value
    return this
  }

  getUserTestId() {
    return this._userTestId
  }

  setUserTestId(value) {
    ArgumentGuard.isString(value, 'userTestId', false)
    this._userTestId = value
    return this
  }

  getDisplayName() {
    return this._displayName
  }

  setDisplayName(value) {
    ArgumentGuard.isString(value, 'displayName', false)
    this._displayName = value
    return this
  }

  getViewportSize() {
    return this._viewportSize
  }

  setViewportSize(value) {
    if (TypeUtils.isNull(value)) {
      this._viewportSize = undefined
    } else {
      this._viewportSize = new RectangleSize(value)
    }
    return this
  }

  getSessionType() {
    return this._sessionType
  }

  setSessionType(value) {
    this._sessionType = value
    return this
  }

  getDefaultMatchSettings() {
    return this._defaultMatchSettings
  }

  setDefaultMatchSettings(value) {
    ArgumentGuard.notNull(value, 'defaultMatchSettings')
    this._defaultMatchSettings = new ImageMatchSettings(value)
    return this
  }

  getMatchLevel() {
    return this._defaultMatchSettings.getMatchLevel()
  }

  setMatchLevel(value) {
    this._defaultMatchSettings.setMatchLevel(value)
    return this
  }

  getAccessibilityValidation() {
    return this._defaultMatchSettings.getAccessibilitySettings()
  }

  setAccessibilityValidation(value) {
    this._defaultMatchSettings.setAccessibilitySettings(value)
    return this
  }

  getUseDom() {
    return this._defaultMatchSettings.getUseDom()
  }

  setUseDom(value) {
    this._defaultMatchSettings.setUseDom(value)
    return this
  }

  getEnablePatterns() {
    return this._defaultMatchSettings.getEnablePatterns()
  }

  setEnablePatterns(value) {
    this._defaultMatchSettings.setEnablePatterns(value)
    return this
  }

  getIgnoreDisplacements() {
    return this._defaultMatchSettings.getIgnoreDisplacements()
  }

  setIgnoreDisplacements(value) {
    this._defaultMatchSettings.setIgnoreDisplacements(value)
    return this
  }

  getIgnoreCaret() {
    return this._defaultMatchSettings.getIgnoreCaret()
  }

  setIgnoreCaret(value) {
    this._defaultMatchSettings.setIgnoreCaret(value)
    return this
  }

  /* ------------ Classic (Selenium) properties ------------ */

  getForceFullPageScreenshot() {
    return this._forceFullPageScreenshot
  }

  setForceFullPageScreenshot(value) {
    this._forceFullPageScreenshot = value
    return this
  }

  getWaitBeforeScreenshots() {
    return TypeUtils.getOrDefault(this._waitBeforeScreenshots, DEFAULT_VALUES.waitBeforeScreenshots)
  }

  getWaitBeforeCapture() {
    return TypeUtils.getOrDefault(this._waitBeforeCapture, DEFAULT_VALUES.waitBeforeCapture)
  }

  setWaitBeforeScreenshots(value) {
    if (value <= 0) {
      this._waitBeforeScreenshots = undefined
    } else {
      this._waitBeforeScreenshots = value
    }
    return this
  }

  setWaitBeforeCapture(value) {
    if (value <= 0) {
      this._waitBeforeCapture = undefined
    } else {
      this._waitBeforeCapture = value
    }
    return this
  }

  getStitchMode() {
    return TypeUtils.getOrDefault(this._stitchMode, DEFAULT_VALUES.stitchMode)
  }

  setStitchMode(value) {
    this._stitchMode = value
    return this
  }

  getHideScrollbars() {
    return TypeUtils.getOrDefault(this._hideScrollbars, DEFAULT_VALUES.hideScrollbars)
  }

  setHideScrollbars(value) {
    this._hideScrollbars = value
    return this
  }

  getHideCaret() {
    return TypeUtils.getOrDefault(this._hideCaret, DEFAULT_VALUES.hideCaret)
  }

  setHideCaret(value) {
    this._hideCaret = value
    return this
  }

  getStitchOverlap() {
    return TypeUtils.getOrDefault(this._stitchOverlap, DEFAULT_VALUES.stitchOverlap)
  }

  setStitchOverlap(value) {
    this._stitchOverlap = value
    return this
  }

  getDontCloseBatches() {
    return TypeUtils.getOrDefault(
      this._dontCloseBatches,
      GeneralUtils.getEnvValue('DONT_CLOSE_BATCHES', true) || DEFAULT_VALUES.dontCloseBatches,
    )
  }

  setDontCloseBatches(value) {
    ArgumentGuard.isBoolean(value, 'dontCloseBatches')
    this._dontCloseBatches = value
    return this
  }

  /* ------------ Visual Grid properties ------------ */

  getConcurrentSessions() {
    return TypeUtils.getOrDefault(this._concurrentSessions, DEFAULT_VALUES.concurrentSessions)
  }

  setConcurrentSessions(value) {
    this._concurrentSessions = value
    return this
  }

  getIsThrowExceptionOn() {
    return TypeUtils.getOrDefault(this._isThrowExceptionOn, DEFAULT_VALUES.isThrowExceptionOn)
  }

  setIsThrowExceptionOn(value) {
    this._isThrowExceptionOn = value
    return this
  }

  getBrowsersInfo() {
    return this._browsersInfo
  }

  setBrowsersInfo(value) {
    if (!this._browsersInfo) {
      this._browsersInfo = []
    }
    ArgumentGuard.isArray(value, 'properties')

    this._browsersInfo = value

    return this
  }

  addBrowsers(...browsersInfo) {
    for (const [i, b] of browsersInfo.entries()) {
      ArgumentGuard.isPlainObject(b, `addBrowsers( arg${i} )`)
    }

    if (!this._browsersInfo) {
      this._browsersInfo = []
    }
    this._browsersInfo.push(...browsersInfo)
    return this
  }

  addBrowser(widthOrBrowserInfo, height, browserType = 'chrome') {
    if (arguments.length === 1) {
      this.addBrowsers(widthOrBrowserInfo)
    } else {
      const browserInfo = {width: widthOrBrowserInfo, height, name: browserType}
      this.addBrowsers(browserInfo)
    }
    return this
  }

  addDeviceEmulation(deviceName, screenOrientation = 'portrait') {
    const deviceInfo = {
      deviceName,
      screenOrientation,
    }

    if (!this._browsersInfo) {
      this._browsersInfo = []
    }

    this._browsersInfo.push(deviceInfo)
    return this
  }

  getVisualGridOptions() {
    return this._visualGridOptions
  }

  setVisualGridOptions(value) {
    this._visualGridOptions = value
    return this
  }

  setVisualGridOption(key, value) {
    if (!this._visualGridOptions) {
      this._visualGridOptions = {}
    }
    this._visualGridOptions[key] = value
    return this
  }

  getLayoutBreakpoints() {
    return this._layoutBreakpoints
  }

  setLayoutBreakpoints(breakpoints) {
    ArgumentGuard.notNull(breakpoints, 'breakpoints')
    this._layoutBreakpoints = breakpoints
    return this
  }

  getDisableBrowserFetching() {
    return this._disableBrowserFetching
  }

  setDisableBrowserFetching(value) {
    this._disableBrowserFetching = value
    return this
  }

  getAbortIdleTestTimeout() {
    return this._abortIdleTestTimeout
  }

  setAbortIdleTestTimeout(value) {
    ArgumentGuard.isNumber(value, 'abortIdleTestTimeout')
    this._abortIdleTestTimeout = value
    return this
  }

  getIgnoreGitMergeBase() {
    return this._ignoreGitMergeBase
  }

  setIgnoreGitMergeBase(input) {
    ArgumentGuard.isBoolean(input, 'ignoreGitMergeBase')
    this._ignoreGitMergeBase = input
    return this
  }

  getUseCeilForViewportSize() {
    return this._useCeilForViewportSize
  }

  setUseCeilForViewportSize(value) {
    this._useCeilForViewportSize = value
  }

  getKeepPlatformNameAsIs() {
    return this._keepPlatformNameAsIs
  }

  setKeepPlatformNameAsIs(value) {
    this._keepPlatformNameAsIs = value
  }

  mergeConfig(other) {
    Object.keys(other).forEach(prop => {
      let privateProp = prop
      if (prop === 'proxy') {
        privateProp = '_proxySettings'
      } else if (!prop.startsWith('_')) {
        privateProp = `_${prop}`
      }

      if (Object.prototype.hasOwnProperty.call(this, privateProp) && other[prop] !== undefined) {
        const publicProp = prop.startsWith('_') ? prop.slice(1) : prop
        const setterName = `set${publicProp.charAt(0).toUpperCase()}${publicProp.slice(1)}`
        if (typeof this[setterName] === 'function') {
          this[setterName](other[prop])
        } else {
          this[privateProp] = other[prop]
        }
      }
    })
  }

  toOpenEyesConfiguration() {
    return {
      appName: this.getAppName(),
      userTestId: this.getUserTestId(),
      testName: this.getTestName(),
      displayName: this.getDisplayName(),
      browser: this.getBrowsersInfo(),
      properties: this.getProperties(),
      batch: this.getBatch(),
      baselineBranchName: this.getBaselineBranchName(),
      baselineEnvName: this.getBaselineEnvName(),
      baselineName: this.getBaselineEnvName(),
      envName: this.getEnvironmentName(),
      branchName: this.getBranchName(),
      saveDiffs: this.getSaveDiffs(),
      saveFailedTests: this.getSaveFailedTests(),
      saveNewTests: this.getSaveNewTests(),
      compareWithParentBranch: this.getCompareWithParentBranch(),
      ignoreBaseline: this.getIgnoreBaseline(),
      parentBranchName: this.getParentBranchName(),
      isDisabled: this.getIsDisabled(),
      matchTimeout: this.getMatchTimeout(),
      ignoreCaret: this.getIgnoreCaret(),
      matchLevel: this.getMatchLevel(),
      useDom: this.getUseDom(),
      enablePatterns: this.getEnablePatterns(),
      ignoreDisplacements: this.getIgnoreDisplacements(),
      accessibilitySettings: this.getAccessibilityValidation(),
      visualGridOptions: this.getVisualGridOptions(),
      ignoreGitMergeBase: this.getIgnoreGitMergeBase(),
    }
  }

  toJSON() {
    return GeneralUtils.toPlain(this)
  }

  cloneConfig() {
    return new Configuration(this)
  }
}

module.exports = Configuration
