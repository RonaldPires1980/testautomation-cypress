function stringifySelector(element) {
  if (element && element.commonSelector) {
    if (typeof element.commonSelector === 'string') {
      return element.commonSelector
    }
    return element.commonSelector.selector
  }
}

module.exports = stringifySelector
