/* global fetch */
'use strict'

const {
  BatchInfo,
  GeneralUtils: {backwardCompatible, deprecationWarning, getEnvValue},
  RunnerStartedEvent,
} = require('@applitools/eyes-sdk-core')
const {makeLogger} = require('@applitools/logger')
const {ptimeoutWithError, presult} = require('@applitools/functional-commons')
const makeFetchResource = require('./resources/fetchResource')
const makeProcessResources = require('./resources/processResources')
const makePutResources = require('./resources/putResources')
const makeCreateResourceMapping = require('./resources/createResourceMapping')
const makeWaitForRenderedStatus = require('./waitForRenderedStatus')
const makeGetRenderStatus = require('./getRenderStatus')
const makeGetRenderJobInfo = require('./getRenderJobInfo')
const makeRender = require('./render')
const makeOpenEyes = require('./openEyes')
const makeCloseBatch = require('./makeCloseBatch')
const makeTestWindow = require('./makeTestWindow')
const transactionThroat = require('./transactionThroat')
const getRenderMethods = require('./getRenderMethods')
const makeGlobalState = require('./globalState')

const {
  createRenderWrapper,
  authorizationErrMsg,
  blockedAccountErrMsg,
  badRequestErrMsg,
} = require('./wrapperUtils')
const getFinalConcurrency = require('./getFinalConcurrency')
require('@applitools/isomorphic-fetch')

// TODO when supporting only Node version >= 8.6.0 then we can use ...config for all the params that are just passed on to makeOpenEyes
function makeRenderingGridClient({
  renderWrapper, // for tests
  logger,
  showLogs,
  renderTimeout,
  renderJobInfoTimeout,
  putResourcesTimeout,
  renderStatusTimeout,
  renderStatusInterval,
  concurrency,
  testConcurrency,
  appName,
  browser = {width: 1024, height: 768},
  apiKey,
  saveDebugData,
  batch,
  batchId,
  batchName,
  batchSequenceName,
  batchSequence,
  properties,
  baselineBranchName,
  baselineBranch,
  baselineEnvName,
  baselineName,
  envName,
  ignoreCaret,
  isDisabled,
  matchLevel,
  accessibilitySettings,
  useDom,
  enablePatterns,
  ignoreDisplacements,
  parentBranchName,
  parentBranch,
  branchName,
  branch,
  proxy,
  autProxy,
  saveDiffs,
  saveFailedTests,
  saveNewTests,
  compareWithParentBranch,
  ignoreBaseline,
  serverUrl,
  agentId,
  fetchResourceTimeout = 120000,
  userAgent,
  notifyOnCompletion,
  batchNotify,
  globalState: _globalState,
  dontCloseBatches,
  visualGridOptions,
  concurrentRendersPerTest,
  ignoreGitMergeBase,
}) {
  if (saveDebugData) {
    deprecationWarning({deprecatedThing: 'saveDebugData', isDead: true})
  }

  let finalConcurrency = getFinalConcurrency({concurrency, testConcurrency})
  let defaultConcurrency
  if (!finalConcurrency) {
    finalConcurrency = defaultConcurrency = 5
  }

  concurrentRendersPerTest = Number(getEnvValue('CONCURRENT_RENDERS_PER_TEST')) || 1

  logger = logger || makeLogger({label: 'visual-grid-client', level: showLogs ? 'info' : 'silent'})
  logger.verbose('vgc concurrency is', finalConcurrency)
  ;({
    batchSequenceName,
    baselineBranchName,
    parentBranchName,
    branchName,
    notifyOnCompletion,
  } = backwardCompatible(
    [{batchSequence}, {batchSequenceName}],
    [{baselineBranch}, {baselineBranchName}],
    [{parentBranch}, {parentBranchName}],
    [{branch}, {branchName}],
    [{batchNotify}, {notifyOnCompletion}],
    logger,
  ))

  let initialDataPromise
  const eyesTransactionThroat = transactionThroat(finalConcurrency)
  renderWrapper =
    renderWrapper ||
    createRenderWrapper({
      apiKey,
      logger,
      serverUrl,
      proxy,
      agentId,
    })
  const {
    doGetRenderInfo,
    doRenderBatch,
    doCheckResources,
    doPutResource,
    doGetRenderStatus,
    setRenderingInfo,
    doGetRenderJobInfo,
    doLogEvents,
    doGetEmulatedDevicesSizes,
    doGetIosDevicesSizes,
  } = getRenderMethods(renderWrapper)

  const fetchWithTimeout = (url, opt) =>
    ptimeoutWithError(fetch(url, opt), fetchResourceTimeout, 'fetch timed out')
  const fetchResource = makeFetchResource({fetch: fetchWithTimeout, logger})
  const putResources = makePutResources({
    doPutResource,
    doCheckResources,
    timeout: putResourcesTimeout,
    logger,
  })
  const resourceCache = new Map()
  const processResources = makeProcessResources({
    putResources,
    fetchResource,
    resourceCache,
    logger,
  })
  const createResourceMapping = makeCreateResourceMapping({processResources, logger})

  const render = makeRender({logger, doRenderBatch, timeout: renderTimeout})
  const getRenderJobInfo = makeGetRenderJobInfo({doGetRenderJobInfo, timeout: renderJobInfoTimeout})
  const getRenderStatus = makeGetRenderStatus({
    doGetRenderStatus,
    getStatusInterval: renderStatusInterval,
    logger,
  })
  const waitForRenderedStatus = makeWaitForRenderedStatus({
    timeout: renderStatusTimeout,
    getRenderStatus,
    logger,
  })

  const batchInfo = batch
    ? new BatchInfo(batch)
    : new BatchInfo({
        name: batchName,
        id: batchId,
        sequenceName: batchSequenceName,
        notifyOnCompletion,
      })

  const globalState = _globalState || makeGlobalState({logger})

  const openConfig = {
    appName,
    browser,
    apiKey,
    batch: batchInfo,
    properties,
    baselineBranchName,
    baselineEnvName,
    baselineName,
    envName,
    ignoreCaret,
    isDisabled,
    matchLevel,
    accessibilitySettings,
    useDom,
    enablePatterns,
    ignoreDisplacements,
    parentBranchName,
    branchName,
    proxy,
    autProxy,
    saveDiffs,
    saveFailedTests,
    saveNewTests,
    compareWithParentBranch,
    ignoreBaseline,
    serverUrl,
    logger,
    getRenderJobInfo,
    render,
    waitForRenderedStatus,
    concurrentRendersPerTest,
    getInitialData,
    createResourceMapping,
    eyesTransactionThroat,
    agentId,
    userAgent,
    globalState,
    visualGridOptions,
    ignoreGitMergeBase,
  }

  const openEyes = makeOpenEyes(openConfig)
  const closeBatch = makeCloseBatch({globalState, dontCloseBatches, isDisabled})
  const testWindow = makeTestWindow(openConfig)

  let emulatedDevicesSizesPromise
  let iosDevicesSizesPromise

  return {
    openEyes,
    closeBatch,
    globalState,
    testWindow,
    getResourceUrlsInCache,
    getIosDevicesSizes,
    getEmulatedDevicesSizes,
    getSetRenderInfo,
  }

  async function getInitialData() {
    if (initialDataPromise) return initialDataPromise

    initialDataPromise = doGetInitialData()
    return initialDataPromise
  }

  async function doGetInitialData() {
    if (!renderWrapper.getApiKey()) {
      renderWrapper.setApiKey(apiKey)
    }

    const runnerStaredEvent = RunnerStartedEvent({
      concurrency,
      testConcurrency,
      defaultConcurrency,
      concurrentRendersPerTest,
    })
    logger.verbose('runnerStartedEvent', runnerStaredEvent)
    const [[err, renderInfo]] = await Promise.all([
      presult(doGetRenderInfo()),
      doLogEvents([runnerStaredEvent]).catch(err =>
        logger.log('error when logging batchStart', err),
      ),
    ])

    if (err) {
      if (err.response) {
        if (err.response.status === 401) {
          throw new Error(authorizationErrMsg)
        }
        if (err.response.status === 403) {
          throw new Error(blockedAccountErrMsg)
        }
        if (err.response.status === 400) {
          throw new Error(badRequestErrMsg)
        }
      }

      throw err
    }

    setRenderingInfo(renderInfo)
    return {renderInfo}
  }

  async function getEmulatedDevicesSizes() {
    if (!emulatedDevicesSizesPromise) {
      await getInitialData()
      emulatedDevicesSizesPromise = doGetEmulatedDevicesSizes()
    }
    return emulatedDevicesSizesPromise
  }

  async function getIosDevicesSizes() {
    if (!iosDevicesSizesPromise) {
      await getInitialData()
      iosDevicesSizesPromise = doGetIosDevicesSizes()
    }
    return iosDevicesSizesPromise
  }

  function getResourceUrlsInCache() {
    return Array.from(resourceCache.keys())
  }

  async function getSetRenderInfo() {
    return await getInitialData()
  }
}

module.exports = makeRenderingGridClient
