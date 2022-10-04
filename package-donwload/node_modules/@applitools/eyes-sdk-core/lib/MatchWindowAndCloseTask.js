const MatchWindowTask = require('./MatchWindowTask')
const ImageMatchOptions = require('./match/ImageMatchOptions')
const MatchWindowAndCloseData = require('./match/MatchWindowAndCloseData')

/**
 * Handles matching of output with the expected output (including retry and 'ignore mismatch' when needed).
 *
 * @ignore
 */
class MatchWindowAndCloseTask extends MatchWindowTask {
  constructor({updateBaselineIfNew, updateBaselineIfDifferent, ...options}) {
    super(options)
    this._updateBaseLineIfNew = updateBaselineIfNew
    this._updateBaselineIfDifferent = updateBaselineIfDifferent
  }

  async _perform({name, url, renderId, variationGroupId, appOutput, matchSettings, ignoreMismatch, userInputs}) {
    const data = new MatchWindowAndCloseData({
      userInputs,
      appOutput,
      tag: name,
      ignoreMismatch,
      updateBaselineIfNew: this._updateBaseLineIfNew,
      updateBaselineIfDifferent: this._updateBaselineIfDifferent,
      removeSessionIfMatching: ignoreMismatch,
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

    const matchResult = await this._serverConnector.matchWindowAndClose(this._runningSession, data)
    return {matchResult, isSuccess: !matchResult.getIsDifferent()}
  }
}

module.exports = MatchWindowAndCloseTask
