const EyesSDK = require('../sdk/EyesSDK')

const makeMakeManager = require('./make-manager')
const makeGetViewportSize = require('./get-viewport-size')
const makeSetViewportSize = require('./set-viewport-size')
const makeCloseBatches = require('./close-batches')
const makeDeleteTest = require('./delete-test')

function makeSdk(options) {
  const sdk = EyesSDK(options)

  return {
    isDriver: options.spec.isDriver,
    isElement: options.spec.isElement,
    isSelector: options.spec.isSelector,
    makeManager: makeMakeManager(sdk),
    getViewportSize: makeGetViewportSize(sdk),
    setViewportSize: makeSetViewportSize(sdk),
    closeBatches: makeCloseBatches(sdk),
    deleteTest: makeDeleteTest(sdk),
  }
}

module.exports = makeSdk
