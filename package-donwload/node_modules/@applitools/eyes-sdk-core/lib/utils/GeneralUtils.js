const {exec} = require('child_process')
const {promisify} = require('util')
const TypeUtils = require('./TypeUtils')
const chalk = require('chalk')
const {URL} = require('url')

const promisifiedExec = promisify && exec && promisify(exec)
const ENV_PREFIXES = ['APPLITOOLS_', 'bamboo_APPLITOOLS_']
const ALPHANUMERIC_MASK = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/**
 * Concatenate the url to the suffixes - making sure there are no double slashes
 *
 * @param {string} url - The left side of the URL.
 * @param {...string} suffixes - The right side.
 * @return {string} - the URL
 */
function urlConcat(url, ...suffixes) {
  let concatUrl = stripTrailingSlash(url)

  for (let i = 0, l = suffixes.length; i < l; i += 1) {
    /** @type {string} */
    const suffix = String(suffixes[i])
    if (!suffix.startsWith('/') && !(i === l - 1 && suffix.startsWith('?'))) {
      concatUrl += '/'
    }
    concatUrl += stripTrailingSlash(suffix)
  }

  return concatUrl
}

/**
 * If given URL ends with '/', the method with cut it and return URL without it
 *
 * @param {string} url
 * @return {string}
 */
function stripTrailingSlash(url) {
  return url.endsWith('/') ? url.slice(0, -1) : url
}

/**
 * Check if an URL is absolute
 *
 * @param {string} url
 * @return {boolean} - the URL
 */
function isAbsoluteUrl(url) {
  return /^[a-z][a-z0-9+.-]*:/.test(url)
}

/**
 * Add unique query parameter to URL
 *
 * @param {string} url
 * @return {string} - URL with unique query parameter
 */
function generateUniqueUrl(url, query) {
  const uniqueId = guid()
  const uniqueUrl = new URL(url)
  if (!url.includes(query)) uniqueUrl.searchParams.append(query, uniqueId)
  return uniqueUrl.href
}

/**
 * Converts all arguments to a single string, used for logging
 *
 * @param {...*} args
 * @return {string}
 */
function stringify(...args) {
  return args.map(arg => stringifySingle(arg)).join(' ')
}

/**
 * Converts argument to string
 *
 * @param {*} arg
 * @return {string}
 */
function stringifySingle(arg) {
  if (TypeUtils.isObject(arg)) {
    if (!TypeUtils.isPlainObject(arg)) {
      if (arg instanceof Error && arg.stack) {
        return arg.stack
      }

      if (arg instanceof Date) {
        return arg.toISOString()
      }

      if (arg instanceof Array && arg.length) {
        return `[${arg.map(i => stringifySingle(i)).join(',')}]`
      }

      if (typeof arg.toString === 'function' && arg.toString !== Object.prototype.toString) {
        return arg.toString()
      }
    }

    return toString(arg)
  }

  return String(arg)
}

/**
 * Converts object or class to string, used within `toString` method of classes
 *
 * @param {object} object
 * @param {string[]} [exclude]
 * @return {string}
 */
function toString(object, exclude = []) {
  if (!TypeUtils.isPlainObject(object)) {
    object = toPlain(object, exclude)
  }

  try {
    return JSON.stringify(object)
  } catch (err) {
    console.warn("Error on converting to string:", err); // eslint-disable-line
    // console.warn(util.inspect(object, {depth: null, colors: true})); // eslint-disable-line
    return undefined
  }
}

/**
 * Convert a class to plain object
 * Makes all private properties public (remove '_' char from prop names)
 *
 * @param {object} object
 * @param {string[]} [exclude]
 * @param {object} [rename]
 * @return {object}
 */
function toPlain(object, exclude = [], rename = {}) {
  if (object == null) {
    throw new TypeError('Cannot make null plain.')
  }

  const plainObject = {}
  Object.keys(object).forEach(objectKey => {
    let publicKey = objectKey.replace('_', '')
    if (rename[publicKey]) {
      publicKey = rename[publicKey]
    }

    if (Object.prototype.hasOwnProperty.call(object, objectKey) && !exclude.includes(objectKey)) {
      if (object[objectKey] instanceof Object && typeof object[objectKey].toJSON === 'function') {
        plainObject[publicKey] = object[objectKey].toJSON()
      } else if (Array.isArray(object[objectKey])) {
        plainObject[publicKey] = object[objectKey].map(item =>
          typeof item.toJSON === 'function' ? item.toJSON() : item,
        )
      } else {
        plainObject[publicKey] = object[objectKey]
      }
    }
  })
  return plainObject
}

/**
 * Generate GUID
 *
 * @return {string}
 */
function guid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0 // eslint-disable-line no-bitwise

    const v = c === 'x' ? r : (r & 0x3) | 0x8 // eslint-disable-line no-bitwise
    return v.toString(16)
  })
}

/**
 * Generate random alphanumeric sequence
 *
 * @return {string}
 */
function randomAlphanumeric(length = 8) {
  let res = ''
  for (let i = 0; i < length; i += 1) {
    res += ALPHANUMERIC_MASK.charAt(Math.floor(Math.random() * ALPHANUMERIC_MASK.length))
  }
  return res
}

/**
 * Waits a specified amount of time before resolving the returned promise.
 *
 * @param {number} ms - The amount of time to sleep in milliseconds.
 * @return {Promise} - A promise which is resolved when sleep is done.
 */
function sleep(ms) {
  if (TypeUtils.isNumber(ms)) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Simple method that decode JSON Web Tokens
 *
 * @param {string} token
 * @return {object}
 */
function jwtDecode(token) {
  let payloadSeg = token.split('.')[1]
  payloadSeg += new Array(5 - (payloadSeg.length % 4)).join('=')
  payloadSeg = payloadSeg.replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(Buffer.from(payloadSeg, 'base64').toString())
}

/**
 * Get an environment property by property name
 *
 * @param {string} propName The property name to look up
 * @param {boolean=false} isBoolean Whether or not the value should be converted to boolean type
 * @return {*|undefined} - The value of the given property or `undefined` if the property is not exists.
 */
function getEnvValue(propName, isBoolean = false) {
  if (process !== undefined) {
    for (const prefix of ENV_PREFIXES) {
      const value = process.env[prefix + propName]
      if (value !== undefined && value !== 'null') {
        // for boolean values, cast string value
        if (isBoolean && !TypeUtils.isBoolean(value)) {
          return value === 'true'
        }

        return value
      }
    }
  }

  return undefined
}

/**
 * Make sure new param value is set with either backward compatible param or the new param.
 *
 * @param {...object[]} params The parameter map.
 * @param {logger} logger to log errors
 * @example
 *
 * foo({newParam, oldPram}) {
 *    ({newParam} = backwardCompatible([{oldParam}, {newParam}], logger))
 *    // now if oldParam is used we set it to oldParam and log a deprecation message.
 * }
 *
 */
function backwardCompatible(...args) {
  const results = {}
  const logger = args.pop()
  for (const [oldParam, newParam] of args) {
    const oldParamName = Object.keys(oldParam)[0]
    const newParamName = Object.keys(newParam)[0]
    if (oldParam[oldParamName] === undefined) {
      results[newParamName] = newParam[newParamName]
    } else {
      logger.log(`warning - "${oldParamName}" is deprecated and will be removed, please use "${newParamName}" instead.`)
      results[newParamName] = oldParam[oldParamName]
    }
  }

  return results
}

/**
 * @param {string} str
 * @return {string}
 */
function cleanStringForJSON(str) {
  if (str == null || str.length === 0) {
    return ''
  }

  let sb = ''
  let char = '\0'
  let tmp

  for (let i = 0, l = str.length; i < l; i += 1) {
    char = str[i]
    switch (char) {
      case '\\':
      case '"':
      case '/':
        sb += '\\' + char; // eslint-disable-line
        break
      case '\b':
        sb += '\\b'
        break
      case '\t':
        sb += '\\t'
        break
      case '\n':
        sb += '\\n'
        break
      case '\f':
        sb += '\\f'
        break
      case '\r':
        sb += '\\r'
        break
      default:
        if (char < ' ') {
          tmp = '000' + char.toString(16); // eslint-disable-line
          sb += '\\u' + tmp.substring(tmp.length - 4); // eslint-disable-line
        } else {
          sb += char
        }
        break
    }
  }

  return sb
}

/**
 * @template T
 * @param {PromiseLike<T>} promise
 *
 * @returns {PromiseLike<[any|undefined, T|undefined]>} a 2-tuple where the first element is the error if promise is rejected,
 *   or undefined if resolved,
 *   and the second value is the value resolved by the promise, or undefined if rejected
 *
 * Note: copyied @applitools/functional-commons
 */
function presult(promise) {
  return promise.then(
    v => [undefined, v],
    err => [err],
  )
}

function pexec(...args) {
  if (!promisifiedExec) {
    throw new Error('cannot find exec and/or promisify perhaps you are running in the browser?')
  }
  return promisifiedExec(...args)
}

function cachify(getterFunction, cacheRegardlessOfArgs = false) {
  const cachedGetter = (function () {
    const cache = {}
    return function (...args) {
      let cacheKey = 'default'
      if (!cacheRegardlessOfArgs) {
        const [key] = args
        cacheKey = stringify(key)
      }
      if (!(cacheKey in cache)) {
        cache[cacheKey] = getterFunction(...args)
      }
      return cache[cacheKey]
    }
  })()
  return cachedGetter
}

function getBreakpointWidth(breakpoints, width) {
  if (!TypeUtils.isArray(breakpoints) || breakpoints.length === 0) {
    return width
  }
  const sortedBreakpoints = Array.from(new Set(breakpoints)).sort((a, b) => (a < b ? 1 : -1))
  const breakpoint = sortedBreakpoints.find(breakpoint => width >= breakpoint)
  return breakpoint || sortedBreakpoints[breakpoints.length - 1] - 1
}

function deprecationWarning({deprecatedThing, newThing, isDead}) {
  const msg = isDead
    ? `Notice: ${deprecatedThing} is no longer supported.`
    : `Notice: ${deprecatedThing} has been renamed. Please use ${newThing} instead.\n`

  chalk.yellow(msg)
}

module.exports = {
  urlConcat,
  stripTrailingSlash,
  isAbsoluteUrl,
  stringify,
  stringifySingle,
  toString,
  toPlain,
  guid,
  randomAlphanumeric,
  sleep,
  jwtDecode,
  getEnvValue,
  backwardCompatible,
  cleanStringForJSON,
  presult,
  pexec,
  cachify,
  getBreakpointWidth,
  deprecationWarning,
  generateUniqueUrl,
}
