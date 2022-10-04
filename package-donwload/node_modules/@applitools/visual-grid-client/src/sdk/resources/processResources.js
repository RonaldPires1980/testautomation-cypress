const {URL} = require('url')
const absolutizeUrl = require('../absolutizeUrl')
const createResource = require('./createResource')
const extractCssResources = require('./extractCssDependencyUrls')
const extractSvgResources = require('./extractSvgDependencyUrls')

function makeProcessResources({fetchResource, putResources, resourceCache = new Map(), logger}) {
  return async function processResources({
    resources,
    referer,
    browserName,
    userAgent,
    cookies,
    proxy,
    autProxy,
  }) {
    const processedResources = await Object.entries(resources).reduce(
      async (processedResourcesPromise, [url, resource]) => {
        if ('value' in resource || resource.errorStatusCode) {
          // process prefilled resource
          const processedResource = await processPreResource({resource})
          return Object.assign(await processedResourcesPromise, {[url]: processedResource})
        } else {
          // process url resource with dependencies
          const processedResourceWithDependencies = await processUrlResourceWithDependencies({
            resource,
            referer,
            browserName,
            userAgent,
            cookies,
            proxy,
            autProxy,
          })
          return Object.assign(await processedResourcesPromise, processedResourceWithDependencies)
        }
      },
      Promise.resolve({}),
    )

    const result = {mapping: {}, promise: Promise.resolve()}
    for (const [url, processedResource] of Object.entries(processedResources)) {
      result.mapping = Object.assign(result.mapping, {[url]: processedResource.hash})
      result.promise = result.promise.then(() => processedResource.ready)
    }

    result.promise = result.promise.then(() => result.mapping)

    return result
  }

  async function processPreResource({resource}) {
    return persistResource({resource, dependencies: resource.dependencies})
  }

  async function processUrlResource({resource, referer, userAgent, cookies, proxy, autProxy}) {
    const cachedResource = resourceCache.get(resource.id)
    if (cachedResource) {
      const dependencies = cachedResource.dependencies || []
      logger.log(
        `resource retrieved from cache, with dependencies (${dependencies.length}): ${resource.url} with dependencies --> ${dependencies}`,
      )
      return cachedResource
    } else if (/^https?:$/i.test(new URL(resource.url).protocol)) {
      try {
        const fetchedResource = await fetchResource(resource, {
          referer,
          userAgent,
          proxy,
          autProxy,
          cookies,
        })
        const dependencyUrls = await extractDependencyUrls(fetchedResource)
        logger.log(`dependencyUrls for ${resource.url} --> ${dependencyUrls}`)

        return persistResource({resource: fetchedResource, dependencies: dependencyUrls})
      } catch (err) {
        logger.log(
          `error fetching resource at ${resource.url}, setting errorStatusCode to 504. err=${err}`,
        )
        return {hash: {errorStatusCode: 504}}
      }
    }
  }

  async function processUrlResourceWithDependencies({
    resource,
    referer,
    browserName,
    userAgent,
    cookies,
    proxy,
    autProxy,
  }) {
    const processedResourcesWithDependencies = {}

    await doProcessUrlResourceWithDependencies(resource)

    return processedResourcesWithDependencies

    async function doProcessUrlResourceWithDependencies(resource) {
      const processedResource = await processUrlResource({
        resource,
        referer,
        userAgent,
        cookies,
        proxy,
        autProxy,
      })

      if (processedResource) {
        processedResourcesWithDependencies[resource.url] = processedResource
        if (processedResource.dependencies) {
          const dependencyResources = processedResource.dependencies.flatMap(dependencyUrl => {
            if (processedResourcesWithDependencies[dependencyUrl]) return []
            return createResource({url: dependencyUrl, browserName})
          })
          await Promise.all(dependencyResources.map(doProcessUrlResourceWithDependencies))
        }
      }
    }
  }

  async function persistResource({resource, dependencies}) {
    const promise = putResources([resource])
      .then(() => {
        const cache = resourceCache.get(resource.id)
        resourceCache.set(resource.id, {...cache, ready: true})
        return true
      })
      .catch(err => {
        resourceCache.delete(resource.id)
        throw err
      })
    const cache = {hash: resource.hash, dependencies, ready: promise}
    resourceCache.set(resource.id, cache)
    return cache
  }

  async function extractDependencyUrls(resource) {
    const dependantType = getDependentResourceType(resource.type)
    try {
      let dependencyUrls = []
      if (dependantType === 'CSS') {
        dependencyUrls = extractCssResources(resource.value.toString())
      } else if (dependantType === 'SVG') {
        dependencyUrls = extractSvgResources(resource.value.toString())
      }
      return dependencyUrls.reduce((dependencyUrls, dependencyUrl) => {
        dependencyUrl = absolutizeUrl(dependencyUrl, resource.url)
        // skip recursive dependency
        if (dependencyUrl !== resource.url) dependencyUrls.push(dependencyUrl)
        return dependencyUrls
      }, [])
    } catch (e) {
      logger.log(`could not parse ${dependantType} ${resource.url}`, e)
      return []
    }
  }

  function getDependentResourceType(contentType) {
    if (/text\/css/.test(contentType)) return 'CSS'
    else if (/image\/svg/.test(contentType)) return 'SVG'
  }
}

module.exports = makeProcessResources
