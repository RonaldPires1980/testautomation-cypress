/* global fetch */
'use strict'

const makeFetchResource = require('./resources/fetchResource')
const makePutResources = require('./resources/putResources')
const makeProcessResources = require('./resources/processResources')
const makeCreateResourceMapping = require('./resources/createResourceMapping')
const makeWaitForRenderedStatus = require('./waitForRenderedStatus')
const makeGetRenderStatus = require('./getRenderStatus')
const getRenderMethods = require('./getRenderMethods')
const makeRender = require('./render')
const {createRenderWrapper} = require('./wrapperUtils')
const {ptimeoutWithError} = require('@applitools/functional-commons')
const {makeLogger} = require('@applitools/logger')

const fetchResourceTimeout = 120000

function makeRenderer({apiKey, showLogs, serverUrl, proxy, renderingInfo, renderTimeout}) {
  const logger = makeLogger({level: showLogs ? 'info' : 'silent'})

  const renderWrapper = createRenderWrapper({apiKey, logger, serverUrl, proxy})

  const {doRenderBatch, doCheckResources, doPutResource, doGetRenderStatus} = getRenderMethods(
    renderWrapper,
  )
  renderWrapper.setRenderingInfo(renderingInfo)

  const fetchWithTimeout = url =>
    ptimeoutWithError(fetch(url), fetchResourceTimeout, 'fetch timed out')
  const fetchResource = makeFetchResource({logger, fetch: fetchWithTimeout})
  const putResources = makePutResources({doPutResource, doCheckResources, logger})
  const processResources = makeProcessResources({fetchResource, putResources, logger})
  const createResourceMapping = makeCreateResourceMapping({processResources})
  const render = makeRender({logger, doRenderBatch, timeout: renderTimeout})
  const getRenderStatus = makeGetRenderStatus({logger, doGetRenderStatus})
  const waitForRenderedStatus = makeWaitForRenderedStatus({logger, getRenderStatus})

  return {createResourceMapping, render, waitForRenderedStatus}
}

module.exports = makeRenderer
