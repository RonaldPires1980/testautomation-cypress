'use strict'
const {URL} = require('url')
const {getTunnelAgentFromProxy} = require('@applitools/eyes-sdk-core')
const createResourceCookieHeader = require('./createResourceCookieHeader')
const https = require('https')

function createFetchOptions(resource, {referer, userAgent, proxy, autProxy, cookies}) {
  const fetchOptions = {headers: {}}

  fetchOptions.headers['Referer'] = referer

  fetchOptions.headers['User-Agent'] = resource.userAgent || userAgent

  if (autProxy) {
    proxy = useProxyOrAutProxy({resource, autProxy, proxy})
  }

  if (proxy && proxy.getIsHttpOnly()) {
    fetchOptions.agent = getTunnelAgentFromProxy(proxy.toProxyObject())
  }

  if (cookies) {
    fetchOptions.headers['Cookie'] = createResourceCookieHeader(resource.url, cookies)
  }

  if (resource && /^https/.test(resource.url)) {
    fetchOptions.agent = new https.Agent({
      rejectUnauthorized: false,
    })
  }

  return fetchOptions
}

function useProxyOrAutProxy({resource, autProxy, proxy}) {
  const {domains, AUTProxyMode} = autProxy
  if (domains) {
    const resourceUrl = new URL(resource.url)
    const domain = resourceUrl.hostname
    const domainMatch = domains.includes(domain)
    const isAllowMode = AUTProxyMode === 'Allow'
    if ((!domainMatch && isAllowMode) || (domainMatch && !isAllowMode)) {
      return proxy
    }
  }
  return autProxy.proxy
}

module.exports = createFetchOptions
