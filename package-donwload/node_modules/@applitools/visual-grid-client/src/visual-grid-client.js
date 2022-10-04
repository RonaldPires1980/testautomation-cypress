'use strict'

const makeVisualGridClient = require('./sdk/renderingGridClient')
const configParams = require('./sdk/configParams')
const takeScreenshot = require('./sdk/takeScreenshot')

module.exports = {
  ...require('@applitools/eyes-sdk-core'),
  makeVisualGridClient,
  takeScreenshot,
  configParams,
}
