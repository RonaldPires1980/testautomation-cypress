function makeGetViewportSize(sdk) {
  return function getViewportSize({driver}) {
    return sdk.EyesFactory.getViewportSize(driver)
  }
}

module.exports = makeGetViewportSize
