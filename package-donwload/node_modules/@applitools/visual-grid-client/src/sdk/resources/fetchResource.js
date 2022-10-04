'use strict'
const retryFetch = require('@applitools/http-commons/src/retryFetch')
const createFetchOptions = require('./createFetchOptions')
const createResource = require('./createResource')
const AbortController = require('abort-controller')

function makeFetchResource({
  fetch,
  retries = 5,
  mediaDownloadTimeout = 30 * 1000,
  fetchCache = new Map(),
  logger,
}) {
  return function fetchResource(resource, options = {}) {
    let job = fetchCache.get(resource.id)
    if (!job) {
      job = doFetchResource(resource, options).finally(() => fetchCache.delete(resource.id))
      fetchCache.set(resource.id, job)
    }

    return job
  }

  function doFetchResource(resource, options) {
    const url = resource.url
    const fetchOptions = createFetchOptions(resource, options)

    return retryFetch(
      async retry => {
        const retryStr = retry ? `(retry ${retry}/${retries})` : ''
        logger.verbose(`fetching ${url} ${retryStr} ${JSON.stringify(fetchOptions) || ''}`)

        const controller = new AbortController()
        const resp = await fetch(url, {...fetchOptions, signal: controller.signal})

        if (!resp.ok) {
          logger.verbose(`failed to fetch ${url} status ${resp.status}, returning errorStatusCode`)
          return createResource({...resource, errorStatusCode: resp.status})
        }

        logger.verbose(`fetched ${url}`)

        const bufferPromise = resp.buffer ? resp.buffer() : resp.arrayBuffer()

        if (isProbablyStreaming(resp)) {
          return createStreamingPromise(resp, bufferPromise, controller)
        } else {
          return createResource({
            ...resource,
            value: Buffer.from(await bufferPromise),
            type: resp.headers.get('Content-Type'),
          })
        }
      },
      {retries},
    )

    function createStreamingPromise(resp, bufferPromise, controller) {
      return new Promise(async resolve => {
        const timeoutId = setTimeout(() => {
          logger.verbose('streaming timeout reached for resource', url)
          resolve(createResource({...resource, errorStatusCode: 599}))
          controller.abort()
        }, mediaDownloadTimeout)

        // aborting the request causes node-fetch to reject bufferPromise, so we need to handle it
        try {
          resolve(
            createResource({
              ...resource,
              value: Buffer.from(await bufferPromise),
              type: resp.headers.get('Content-Type'),
            }),
          )
        } catch (ex) {
          logger.verbose('streaming buffer exception', ex)
        } finally {
          clearTimeout(timeoutId)
        }
      })
    }

    function isProbablyStreaming(resp) {
      return (
        !resp.headers.get('Content-Length') &&
        ['audio/', 'video/'].some(prefix => resp.headers.get('Content-Type').startsWith(prefix))
      )
    }
  }
}

module.exports = makeFetchResource
