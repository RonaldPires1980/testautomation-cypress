'use strict'

function mapChromeEmulationInfo(browser) {
  if (browser.chromeEmulationInfo) {
    return browser
  }

  if (browser.deviceName) {
    const ret = {
      ...browser,
      chromeEmulationInfo: {
        deviceName: browser.deviceName,
        screenOrientation: browser.screenOrientation,
      },
    }

    delete ret.deviceName
    delete ret.screenOrientation

    return ret
  }

  if (browser.deviceScaleFactor || browser.mobile) {
    const ret = {
      ...browser,
      chromeEmulationInfo: {
        width: browser.width,
        height: browser.height,
        deviceScaleFactor: browser.deviceScaleFactor,
        mobile: browser.mobile,
        screenOrientation: browser.screenOrientation,
      },
    }

    delete ret.deviceScaleFactor
    delete ret.mobile
    delete ret.screenOrientation

    return ret
  }

  return browser
}

module.exports = mapChromeEmulationInfo
