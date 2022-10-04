'use strict'
const {EyesBase, Location, ImageMatchSettings} = require('@applitools/eyes-sdk-core')
const {presult} = require('@applitools/functional-commons')
const VERSION = require('../../package.json').version

class EyesWrapper extends EyesBase {
  constructor({apiKey, logger, getBatchInfoWithCache} = {}) {
    super()
    apiKey && this.setApiKey(apiKey)
    logger && (this.logger = logger)
    this._getBatchInfoWithCache = getBatchInfoWithCache
  }

  async open({appName, testName, viewportSize, skipStartingSession}) {
    await super.openBase(appName, testName, undefined, undefined, skipStartingSession)

    if (viewportSize) {
      this.setViewportSize(viewportSize)
    }
  }

  async ensureRunningSession() {
    if (!this.getRunningSession()) {
      if (!this._ensureRunningSessionPromise) {
        this._ensureRunningSessionPromise = this._ensureRunningSession()
      }
      const [err] = await presult(this._ensureRunningSessionPromise)
      this._ensureRunningSessionPromise = null
      if (err) {
        this._logger.log(
          'failed to ensure a running session (probably due to a previous fatal error)',
          err,
        )
      }
    }
  }

  async ensureAborted() {
    await this.ensureRunningSession()
    await this.abort()
  }

  async getScreenshot() {
    return
  }

  async getScreenshotUrl() {
    return this.screenshotUrl
  }

  getRenderer() {
    return this._renderer
  }

  getAppEnvironment() {
    return this._eyesEnvironment
  }

  setRenderJobInfo({eyesEnvironment, renderer} = {}) {
    this._eyesEnvironment = eyesEnvironment
    this._renderer = renderer
  }

  async getInferredEnvironment() {
    return this.inferredEnvironment
  }

  async setViewportSize(viewportSize) {
    this._configuration.setViewportSize(viewportSize)
    this._viewportSizeHandler.set(this._configuration.getViewportSize())
  }

  async getTitle() {
    return 'some title' // TODO what should this be? is it connected with the tag in `checkWindow` somehow?
  }

  async getDomUrl() {
    return this.domUrl
  }

  async getImageLocation() {
    return this.imageLocation
  }

  async getPageCoverageInfo() {
    return this.pageCoverageInfo
  }

  /**
   * Get the AUT session id.
   *
   * @return {Promise<?String>}
   */
  async getAUTSessionId() {
    return // TODO is this good?
  }

  /** @override */
  getBaseAgentId() {
    return this._baseAgentId || `visual-grid-client/${VERSION}`
  }

  setBaseAgentId(baseAgentId) {
    this._baseAgentId = baseAgentId
  }

  setAccessibilityValidation(value) {
    this._configuration.getDefaultMatchSettings().setAccessibilitySettings(value)
  }

  /**
   * Get a RenderingInfo from eyes server
   *
   * @return {Promise<RenderingInfo>}
   */
  getRenderInfo() {
    return this._serverConnector.renderInfo()
  }

  setRenderingInfo(renderingInfo) {
    this._serverConnector.setRenderingInfo(renderingInfo)
  }

  /**
   * Create a screenshot of a page on RenderingGrid server
   *
   * @param {RenderRequest[]} renderRequests - The requests to be sent to the rendering grid
   * @return {Promise<String[]>} - The results of the render
   */
  renderBatch(renderRequests) {
    return this._serverConnector.render(renderRequests)
  }

  checkResources(resources) {
    return this._serverConnector.renderCheckResources(resources)
  }

  getRenderJobInfo(renderRequests) {
    return this._serverConnector.renderGetRenderJobInfo(renderRequests)
  }

  putResource(resource) {
    return this._serverConnector.renderPutResource(resource)
  }

  getRenderStatus(renderId) {
    return this._serverConnector.renderStatusById(renderId)
  }

  getEmulatedDevicesSizes() {
    return this._serverConnector.getEmulatedDevicesSizes()
  }

  getIosDevicesSizes() {
    return this._serverConnector.getIosDevicesSizes()
  }

  logEvents(events) {
    return this._serverConnector.logEvents(events)
  }

  checkWindow({
    screenshotUrl,
    tag,
    domUrl,
    checkSettings,
    imageLocation,
    url,
    closeAfterMatch,
    throwEx,
    pageCoverageInfo,
  }) {
    this.pageCoverageInfo = pageCoverageInfo
    this.screenshotUrl = screenshotUrl
    this.domUrl = domUrl
    this.imageLocation = imageLocation || Location.ZERO
    this.matchSettings = new ImageMatchSettings({
      ...checkSettings,
      matchLevel:
        checkSettings.matchLevel || this._configuration.getDefaultMatchSettings().getMatchLevel(),
      ignoreCaret:
        checkSettings.ignoreCaret || this._configuration.getDefaultMatchSettings().getIgnoreCaret(),
      useDom: checkSettings.useDom || this._configuration.getDefaultMatchSettings().getUseDom(),
      enablePatterns:
        checkSettings.enablePatterns ||
        this._configuration.getDefaultMatchSettings().getEnablePatterns(),
      ignoreDisplacements:
        checkSettings.ignoreDisplacements ||
        this._configuration.getDefaultMatchSettings().getIgnoreDisplacements(),
      accessibilitySettings: this._configuration
        .getDefaultMatchSettings()
        .getAccessibilitySettings(),
      exact: null,
    })
    return closeAfterMatch
      ? this.checkWindowAndCloseBase({
          name: tag,
          url,
          renderId: checkSettings.renderId,
          variationGroupId: checkSettings.variationGroupId,
          sendDom: checkSettings.sendDom,
          retryTimeout: 0,
          closeAfterMatch,
          throwEx,
        })
      : this.checkWindowBase({
          name: tag,
          url,
          renderId: checkSettings.renderId,
          variationGroupId: checkSettings.variationGroupId,
          sendDom: checkSettings.sendDom,
          retryTimeout: 0,
        })
  }

  getMatchSettings() {
    return this.matchSettings
  }

  setProxy(proxy) {
    if (proxy.uri !== undefined) {
      proxy.url = proxy.uri // backward compatible
    }
    super.setProxy(proxy)
  }

  async getAndSaveRenderingInfo() {
    // Do nothing because visual grid client handles rendering info
  }

  async _getAndSaveBatchInfoFromServer(batchId) {
    return this._getBatchInfoWithCache(batchId)
  }

  async setIgnoreGitMergeBase(input) {
    this._configuration.setIgnoreGitMergeBase(input)
  }

  setAgentRunId(value) {
    this.agentRunId = value
  }
}

module.exports = EyesWrapper
