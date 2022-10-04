function makeExtractText({eyes}) {
  return async function extractText({regions, config}) {
    if (config) eyes._configuration.mergeConfig(config)
    return eyes.extractText(regions)
  }
}

module.exports = makeExtractText
