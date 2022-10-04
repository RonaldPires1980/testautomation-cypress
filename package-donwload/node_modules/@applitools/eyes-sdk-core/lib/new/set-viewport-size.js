function makeSetViewportSize(sdk) {
  return function setViewportSize({driver, size}) {
    return sdk.EyesFactory.setViewportSize(driver, size)
  }
}

module.exports = makeSetViewportSize
