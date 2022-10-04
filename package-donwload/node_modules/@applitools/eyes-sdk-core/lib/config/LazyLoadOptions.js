const TypeUtils = require('../utils/TypeUtils')

function makeLazyLoadOptions(input) {
  const defaultOptions = {
    scrollLength: 300,
    waitingTime: 2000,
    maxAmountToScroll: 15000,
  }

  if (!input) return
  else if (input === true) return defaultOptions
  else if (TypeUtils.isObject(input)) return Object.assign({}, defaultOptions, input)
  else
    throw new Error(
      `Invalid type provided for the lazyLoad option. The value provided was of type ${typeof input}. Please provide either nothing, a boolean, or an object.`,
    )
}

module.exports = makeLazyLoadOptions
