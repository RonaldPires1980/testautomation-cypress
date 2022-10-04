const {makeLogger} = require('@applitools/logger')
const SessionEventHandler = require('../events/SessionEventHandler')
const RemoteSessionEventHandler = require('../events/RemoteSessionEventHandler')

const makeCheck = require('./check')
const makeLocate = require('./locate')
const makeExtractText = require('./extract-text')
const makeExtractTextRegions = require('./extract-text-regions')
const makeClose = require('./close')
const makeAbort = require('./abort')

function makeOpenEyes({sdk, runner}) {
  return async function openEyes({driver, config, logger, on}) {
    const eyes = new sdk.EyesFactory(runner)
    eyes.setConfiguration(config)
    if (logger) eyes.logger = logger
    else if (config.logs) {
      eyes.logger = makeLogger({handler: config.logs, level: 'info', colors: true})
    }
    if (config.scrollRootElement) eyes.setScrollRootElement(config.scrollRootElement)
    if (config.cut) eyes.setCut(config.cut)
    if (config.rotation) eyes.setRotation(config.rotation)
    if (config.scaleRatio) eyes.setScaleRatio(config.scaleRatio)
    if (config.debugScreenshots) eyes.setDebugScreenshots(config.debugScreenshots)
    if (config.remoteEvents) {
      const remoteSessionEventHandler = new RemoteSessionEventHandler(
        config.remoteEvents.serverUrl,
        config.remoteEvents.accessKey,
      )
      if (config.remoteEvents.timeout !== undefined) {
        remoteSessionEventHandler.setTimeout(config.remoteEvents.timeout)
      }
      eyes.addSessionEventHandler(remoteSessionEventHandler)
    }
    if (on) {
      const sessionEventHandler = new SessionEventHandler()
      for (const event of Object.keys(sessionEventHandler)) {
        sessionEventHandler[event] = (...args) => on(event, ...args)
      }
      eyes.addSessionEventHandler(sessionEventHandler)
    }

    await eyes.open(driver, config.appName, config.testName)

    return {
      check: makeCheck({eyes}),
      locate: makeLocate({eyes}),
      extractText: makeExtractText({eyes}),
      extractTextRegions: makeExtractTextRegions({eyes}),
      close: makeClose({eyes}),
      abort: makeAbort({eyes}),
    }
  }
}

module.exports = makeOpenEyes
