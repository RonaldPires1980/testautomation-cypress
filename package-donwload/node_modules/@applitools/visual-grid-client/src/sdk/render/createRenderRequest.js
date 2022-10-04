function createRenderRequest({
  isNativeUFG,
  url,
  snapshot,
  resources,
  browser,
  renderInfo,
  target,
  selector,
  selectorsToFindRegionsFor,
  region,
  scriptHooks,
  sendDom,
  visualGridOptions,
  includeFullPageSize,
  agentId,
}) {
  const {chromeEmulationInfo, iosDeviceInfo, androidDeviceInfo, ...browserInfo} = browser

  let platformName = browserInfo.platform || 'linux'
  let browserName = browserInfo.name
  if (iosDeviceInfo) {
    platformName = 'ios'
    browserName = 'safari'
  } else if (androidDeviceInfo) {
    platformName = 'android'
  }

  let width = browserInfo.width
  let height = browserInfo.height
  if (chromeEmulationInfo) {
    if (!width) width = chromeEmulationInfo.width
    if (!height) height = chromeEmulationInfo.height
  }

  if (!browserName && !isNativeUFG) {
    browserName = 'chrome'
  }

  const modifiedIosDeviceInfo = modifyDeviceInfo(iosDeviceInfo)
  const modifiedAndroidDeviceInfo = modifyDeviceInfo(androidDeviceInfo)

  return {
    webhook: renderInfo.getResultsUrl(),
    stitchingService: renderInfo.getStitchingServiceUrl(),
    url,
    platform: {name: platformName, type: isNativeUFG ? 'native' : 'web'},
    browser: isNativeUFG ? undefined : {name: browserName},
    renderInfo: {
      target,
      width,
      height,
      selector,
      region,
      emulationInfo: chromeEmulationInfo,
      iosDeviceInfo: modifiedIosDeviceInfo,
      androidDeviceInfo: modifiedAndroidDeviceInfo,
    },
    snapshot,
    resources,
    options: visualGridOptions,
    scriptHooks,
    selectorsToFindRegionsFor,
    enableMultipleResultsPerSelector: true,
    includeFullPageSize,
    sendDom,
    agentId,
  }
}

function enrichRenderRequest(renderRequest, {dom, resources, snapshot, renderer}) {
  renderRequest.snapshot = dom
  renderRequest.resources = resources
  renderRequest.renderer = renderer
  renderRequest.renderInfo.vhsType = snapshot.vhsType
  renderRequest.renderInfo.vhsCompatibilityParams = snapshot.vhsCompatibilityParams
}

function modifyDeviceInfo(deviceInfo) {
  const ret = deviceInfo
    ? {
        ...deviceInfo,
        name: deviceInfo.deviceName,
        // TODO: added `version` due to inconsistency in the device types, need to unify them
        version: deviceInfo.iosVersion || deviceInfo.androidVersion || deviceInfo.version,
      }
    : undefined

  if (ret) {
    delete ret.deviceName
    delete ret.androidVersion
    delete ret.iosVersion
  }
  return ret
}

module.exports = {
  createRenderRequest,
  enrichRenderRequest,
}
