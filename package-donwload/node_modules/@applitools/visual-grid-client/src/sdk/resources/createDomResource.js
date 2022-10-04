'use strict'

const createResource = require('./createResource')

function createDomResource({cdt, resources}) {
  const value = Buffer.from(
    JSON.stringify({
      resources: Object.entries(resources)
        .sort(([url1], [url2]) => (url1 > url2 ? 1 : -1))
        .reduce((resources, [url, value]) => Object.assign(resources, {[url]: value}), {}),
      domNodes: cdt,
    }),
  )

  return createResource({value, type: 'x-applitools-html/cdt'})
}

module.exports = createDomResource
