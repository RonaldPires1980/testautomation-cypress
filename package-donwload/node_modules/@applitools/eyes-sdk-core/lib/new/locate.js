function makeLocate({eyes}) {
  return async function locate({settings, config}) {
    if (config) eyes._configuration.mergeConfig(config)
    return eyes.locate(settings)
  }
}

module.exports = makeLocate
