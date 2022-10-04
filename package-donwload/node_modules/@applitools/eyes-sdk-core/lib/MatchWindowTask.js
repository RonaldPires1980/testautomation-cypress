const utils = require('@applitools/utils')
const PerformanceUtils = require('./utils/PerformanceUtils')
const MatchWindowData = require('./match/MatchWindowData')
const ImageMatchOptions = require('./match/ImageMatchOptions')

const MATCH_INTERVAL = 500 // Milliseconds

class MatchWindowTask {
  constructor({getMatchData, serverConnector, runningSession, retryTimeout, logger}) {
    utils.guard.notNull(getMatchData, {name: 'getMatchData'})
    utils.guard.notNull(serverConnector, {name: 'serverConnector'})
    utils.guard.notNull(runningSession, {name: 'runningSession'})
    utils.guard.isGreaterThenOrEqual(retryTimeout, 0, {name: 'retryTimeout'})
    utils.guard.notNull(logger, {name: 'logger'})

    this._getMatchData = getMatchData
    this._serverConnector = serverConnector
    this._runningSession = runningSession
    this._defaultRetryTimeout = retryTimeout
    this._logger = logger

    this._matchResult = undefined
    this._lastScreenshot = undefined
  }

  async match({
    name,
    url,
    renderId,
    variationGroupId,
    ignoreMismatch,
    sendDom,
    retryTimeout,
    shouldRunOnceOnTimeout,
    userInputs,
  }) {
    utils.guard.isString(name, {name: 'name'})
    utils.guard.isBoolean(shouldRunOnceOnTimeout, {name: 'shouldRunOnceOnTimeout'})
    utils.guard.isBoolean(ignoreMismatch, {name: 'ignoreMismatch'})
    utils.guard.isNumber(retryTimeout, {name: 'retryTimeout', strict: false})

    if (retryTimeout == null || retryTimeout < 0) retryTimeout = this._defaultRetryTimeout
    this._logger.log(`retryTimeout = ${retryTimeout}`)

    const timeStart = PerformanceUtils.start()

    const matchOptions = {name, url, renderId, variationGroupId, ignoreMismatch, userInputs}
    let result, lastScreenshot
    // If the wait to load time is 0, or "run once" is true, we perform a single check window.
    if (retryTimeout === 0 || shouldRunOnceOnTimeout) {
      if (shouldRunOnceOnTimeout) await utils.general.sleep(retryTimeout)
      const {screenshot, appOutput, matchSettings} = await this._getMatchData({
        lastScreenshot: this._lastScreenshot,
        sendDom,
      })
      lastScreenshot = screenshot
      result = await this._perform({...matchOptions, appOutput, matchSettings})
    } else {
      const startTime = Date.now()
      let timeSpent = 0
      while (retryTimeout >= timeSpent) {
        const {screenshot, appOutput, matchSettings} = await this._getMatchData({
          lastScreenshot: this._lastScreenshot,
          sendDom,
        })
        lastScreenshot = screenshot
        result = await this._perform({...matchOptions, ignoreMismatch: true, appOutput, matchSettings})
        if (result.isSuccess) break
        await utils.general.sleep(MatchWindowTask.MATCH_INTERVAL)
        timeSpent = Date.now() - startTime
      }

      if (!result.isSuccess) {
        const {screenshot, appOutput, matchSettings} = await this._getMatchData({
          lastScreenshot: this._lastScreenshot,
          sendDom,
        })
        lastScreenshot = screenshot
        result = await this._perform({...matchOptions, appOutput, matchSettings})
      }
    }

    this._logger.log(`Completed in ${timeStart.end().summary}`)

    if (ignoreMismatch) {
      return result.matchResult
    }

    this._updateLastScreenshot(lastScreenshot)
    return result.matchResult
  }

  async _perform({name, url, renderId, variationGroupId, appOutput, matchSettings, ignoreMismatch, userInputs}) {
    const data = new MatchWindowData({
      userInputs,
      appOutput,
      tag: name,
      ignoreMismatch,
      options: new ImageMatchOptions({
        name,
        source: url,
        renderId,
        variantId: variationGroupId,
        imageMatchSettings: matchSettings,
        userInputs,
        ignoreMismatch,
        ignoreMatch: false,
        forceMismatch: false,
        forceMatch: false,
      }),
    })

    const matchResult = await this._serverConnector.matchWindow(this._runningSession, data)
    return {matchResult, isSuccess: matchResult.getAsExpected()}
  }

  _updateLastScreenshot(screenshot) {
    if (screenshot) {
      this._lastScreenshot = screenshot
    }
  }

  getLastScreenshot() {
    return this._lastScreenshot
  }
}

MatchWindowTask.MATCH_INTERVAL = MATCH_INTERVAL
module.exports = MatchWindowTask
