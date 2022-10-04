const utils = require('@applitools/utils')
const MatchResult = require('../match/MatchResult')
const validateLazyLoadOptions = require('../config/LazyLoadOptions')

function makeCheck({eyes}) {
  return async function check({settings, config, driver} = {}) {
    if (config) {
      if (config.cut) {
        eyes.setCut(config.cut)
      }
      eyes._configuration.mergeConfig(config)
    }

    const isCheckWindow = !settings || (!settings.region && (!settings.frames || settings.frames.length === 0))
    // if it checks window and no DEFAULT value set in config, set fully true
    if (utils.types.isNull(eyes._configuration.getForceFullPageScreenshot())) {
      eyes._configuration.setForceFullPageScreenshot(isCheckWindow)
    }
    validateLazyLoadOptions(settings && settings.lazyLoad)
    const result = await eyes.check(settings, driver)
    return result ? result.toJSON() : new MatchResult().toJSON()
  }
}

module.exports = makeCheck
