const crypto = require('crypto')
const VISUAL_GRID_MAX_BUFFER_SIZE = 34.5 * 1024 * 1024

function createResource(data = {}) {
  const {url, value, type, browserName, dependencies, errorStatusCode} = data
  const resource = {}

  if (url) {
    resource.url = resource.id = url
  }

  if (errorStatusCode) {
    resource.errorStatusCode = errorStatusCode
    resource.hash = {errorStatusCode}
    return resource
  }

  if (browserName && isBrowserDependantResource(resource)) {
    resource.browserName = sanitizeBrowserName(browserName)
    resource.userAgent = userAgents[resource.browserName]
    resource.id += `~${resource.browserName}`
  }

  if ('value' in data) {
    resource.value =
      value && !isDomOrVHS(type) && value.length > VISUAL_GRID_MAX_BUFFER_SIZE
        ? value.slice(0, VISUAL_GRID_MAX_BUFFER_SIZE - 100000)
        : value || ''
    resource.type = type || 'application/x-applitools-unknown'
    resource.hash = createResourceHashObject(resource)
  }

  if (dependencies) resource.dependencies = dependencies

  return resource
}

function isBrowserDependantResource({url}) {
  return /https:\/\/fonts.googleapis.com/.test(url)
}

function createResourceHashObject({value, type}) {
  return {
    hashFormat: 'sha256',
    hash: crypto
      .createHash('sha256')
      .update(value)
      .digest('hex'),
    contentType: type,
  }
}

function sanitizeBrowserName(browserName) {
  if (!browserName) return ''
  if (['IE', 'Chrome', 'Firefox', 'Safari', 'Edgechromium', 'Edge'].includes(browserName)) {
    return browserName
  }
  if (browserName === 'ie10' || browserName === 'ie11' || browserName === 'ie') return 'IE'
  if (browserName.includes('chrome')) return 'Chrome'
  if (browserName.includes('firefox')) return 'Firefox'
  if (browserName.includes('safari')) return 'Safari'
  if (browserName.includes('edgechromium')) return 'Edgechromium'
  if (browserName.includes('edge')) return 'Edge'
}

const userAgents = {
  IE:
    'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; .NET4.0C; .NET4.0E; .NET CLR 2.0.50727; .NET CLR 3.0.30729; .NET CLR 3.5.30729; rv:11.0) like Gecko',
  Chrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.54 Safari/537.36',
  Firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:93.0) Gecko/20100101 Firefox/93.0',
  Safari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
  Edge:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/18.17763',
  Edgechromium:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4501.0 Safari/537.36 Edg/91.0.866.0',
}

function isDomOrVHS(type) {
  return [
    'x-applitools-html/cdt',
    'x-applitools-vhs/ios',
    'x-applitools-vhs/android-x',
    'x-applitools-vhs/android-support',
  ].includes(type)
}

module.exports = createResource
