'use strict'

const TypeUtils = require('./TypeUtils')

async function getBrowserInfo({browser, getEmulatedDevicesSizes, getIosDevicesSizes}) {
  const isMobile = browser.deviceName || browser.mobile || browser.iosDeviceInfo || browser.chromeEmulationInfo
  if (!isMobile) {
    const {name, width, height} = browser
    return {name, width, height}
  } else {
    let devicesSizes, browserObj
    if (TypeUtils.has(browser, 'chromeEmulationInfo') || TypeUtils.has(browser, 'deviceName')) {
      browserObj = browser.chromeEmulationInfo || browser
      devicesSizes = await getEmulatedDevicesSizes()
    } else if (TypeUtils.has(browser, 'iosDeviceInfo')) {
      browserObj = browser.iosDeviceInfo
      devicesSizes = await getIosDevicesSizes()
    }
    const {deviceName, screenOrientation = 'portrait'} = browserObj
    const size = devicesSizes[deviceName][screenOrientation]
    return {name: deviceName, screenOrientation, ...size}
  }
}

module.exports = getBrowserInfo
