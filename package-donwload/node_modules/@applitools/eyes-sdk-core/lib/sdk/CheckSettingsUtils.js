const TypeUtils = require('../utils/TypeUtils')
const utils = require('@applitools/utils')
const snippets = require('@applitools/snippets')
const ImageMatchSettings = require('../config/ImageMatchSettings')
const stringifySelector = require('../utils/stringify-selector')
const {appendIndexToDuplicateRegionIds} = require('../utils/amend-region-ids')

async function toPersistedCheckSettings({checkSettings, context, logger}) {
  const mapping = {
    ids: [],
    elements: [],
    resolvers: [],
  }

  const persistedCheckSettings = {
    ...checkSettings,
    region: await referencesToPersistedRegions([checkSettings.region]),
    ignoreRegions: await referencesToPersistedRegions(checkSettings.ignoreRegions),
    floatingRegions: await referencesToPersistedRegions(checkSettings.floatingRegions),
    strictRegions: await referencesToPersistedRegions(checkSettings.strictRegions),
    layoutRegions: await referencesToPersistedRegions(checkSettings.layoutRegions),
    contentRegions: await referencesToPersistedRegions(checkSettings.contentRegions),
    accessibilityRegions: await referencesToPersistedRegions(checkSettings.accessibilityRegions),
  }

  await makePersistance()

  persistedCheckSettings.region = persistedCheckSettings.region[0] && persistedCheckSettings.region[0].region

  persistedCheckSettings.ignoreRegions = appendIndexToDuplicateRegionIds(persistedCheckSettings.ignoreRegions)
  persistedCheckSettings.floatingRegions = appendIndexToDuplicateRegionIds(persistedCheckSettings.floatingRegions)
  persistedCheckSettings.strictRegions = appendIndexToDuplicateRegionIds(persistedCheckSettings.strictRegions)
  persistedCheckSettings.layoutRegions = appendIndexToDuplicateRegionIds(persistedCheckSettings.layoutRegions)
  persistedCheckSettings.contentRegions = appendIndexToDuplicateRegionIds(persistedCheckSettings.contentRegions)
  persistedCheckSettings.accessibilityRegions = appendIndexToDuplicateRegionIds(
    persistedCheckSettings.accessibilityRegions,
  )

  return {persistedCheckSettings, cleanupPersistance}

  async function referencesToPersistedRegions(references = []) {
    const persistedRegions = []
    for (const reference of references) {
      if (!reference) continue
      const {region, ...options} = reference.region ? reference : {region: reference, regionId: reference.regionId}

      if (utils.types.has(region, ['width', 'height'])) {
        const persistedRegion = utils.types.has(region, ['x', 'y'])
          ? region
          : {x: region.left, y: region.top, width: region.width, height: region.height}
        persistedRegions.push({region: persistedRegion, ...options})
      } else if (region) {
        const elements = await context.elements(region)
        options.regionId = options.regionId || stringifySelector(elements[0])
        for (const element of elements) {
          mapping.ids.push(utils.general.guid())
          mapping.elements.push(element)
          mapping.resolvers.push(selector => persistedRegions.push({region: selector, ...options}))
        }
      }
    }
    return persistedRegions
  }

  async function makePersistance() {
    if (!mapping.elements.length) return
    const selectors = await context.execute(snippets.addElementIds, [mapping.elements, mapping.ids])
    selectors.forEach((selectors, selectorIndex) => {
      const resolver = mapping.resolvers[selectorIndex]
      const persistedSelector = selectors.map((selector, index) => ({
        type: 'css',
        selector,
        nodeType: index < selectors.length - 1 ? 'shadow-root' : 'element',
      }))
      resolver(persistedSelector.length === 1 ? persistedSelector[0] : persistedSelector)
    })
    logger.log(`elements marked: ${mapping.ids}`)
  }

  async function cleanupPersistance() {
    if (!mapping.elements.length) return
    await context.execute(snippets.cleanupElementIds, [mapping.elements])
    logger.log(`elements cleaned up: ${mapping.ids}`)
  }
}

function toCheckWindowConfiguration({checkSettings, configuration}) {
  const fully = TypeUtils.getOrDefault(checkSettings.fully, configuration.getForceFullPageScreenshot())

  const config = {
    ignore: transformRegions(checkSettings.ignoreRegions),
    floating: transformRegions(checkSettings.floatingRegions),
    strict: transformRegions(checkSettings.strictRegions),
    layout: transformRegions(checkSettings.layoutRegions),
    content: transformRegions(checkSettings.contentRegions),
    accessibility: transformRegions(checkSettings.accessibilityRegions),
    tag: checkSettings.name,
    scriptHooks: checkSettings.hooks,
    sendDom: configuration.getSendDom() || checkSettings.sendDom, // this is wrong, but kept for backwards compatibility,
    ignoreDisplacements: checkSettings.ignoreDisplacements,
    matchLevel: TypeUtils.getOrDefault(checkSettings.matchLevel, configuration.getMatchLevel()),
    visualGridOptions: TypeUtils.getOrDefault(checkSettings.visualGridOptions, configuration.getVisualGridOptions()),
    enablePatterns: TypeUtils.getOrDefault(checkSettings.enablePatterns, configuration.getEnablePatterns()),
    useDom: TypeUtils.getOrDefault(checkSettings.useDom, configuration.getUseDom()),
    variationGroupId: checkSettings.variationGroupId,
    pageId: checkSettings.pageId || undefined,
  }

  if (checkSettings.region) {
    if (utils.types.has(checkSettings.region, ['width', 'height'])) {
      config.target = 'region'
      config.region = utils.types.has(checkSettings.region, ['left', 'top'])
        ? {
            x: checkSettings.region.left,
            y: checkSettings.region.top,
            width: checkSettings.region.width,
            height: checkSettings.region.height,
          }
        : checkSettings.region
    } else {
      config.target = fully ? 'full-selector' : 'selector'
      config.selector = checkSettings.region
    }
  } else {
    config.target = fully ? 'full-page' : 'viewport'
  }

  return config

  function transformRegions(regions) {
    if (!regions || regions.length === 0) return regions
    return regions.map(target => {
      const {region, ...options} = target.region ? target : {region: target}
      if (options.type) {
        options.accessibilityType = options.type
        delete options.type
      }
      if (utils.types.has(region, ['x', 'y', 'width', 'height'])) {
        return {
          left: Math.round(region.x),
          top: Math.round(region.y),
          width: Math.round(region.width),
          height: Math.round(region.height),
          regionId: region.regionId,
          ...options,
        }
      }
      return {...region, ...options}
    })
  }
}

function toMatchSettings({checkSettings = {}, configuration}) {
  const matchSettings = {
    matchLevel: checkSettings.matchLevel || configuration.getDefaultMatchSettings().getMatchLevel(),
    ignoreCaret: checkSettings.ignoreCaret || configuration.getDefaultMatchSettings().getIgnoreCaret(),
    useDom: checkSettings.useDom || configuration.getDefaultMatchSettings().getUseDom(),
    enablePatterns: checkSettings.enablePatterns || configuration.getDefaultMatchSettings().getEnablePatterns(),
    ignoreDisplacements:
      checkSettings.ignoreDisplacements || configuration.getDefaultMatchSettings().getIgnoreDisplacements(),
    accessibilitySettings: configuration.getDefaultMatchSettings().getAccessibilitySettings(),
    exact: null,
    ignore: transformRegions(checkSettings.ignoreRegions),
    layout: transformRegions(checkSettings.layoutRegions),
    strict: transformRegions(checkSettings.strictRegions),
    content: transformRegions(checkSettings.contentRegions),
    floating: transformRegions(checkSettings.floatingRegions),
    accessibility: transformRegions(checkSettings.accessibilityRegions),
  }

  return new ImageMatchSettings(matchSettings)

  function transformRegions(regions) {
    if (!regions || regions.length === 0) return regions
    return appendIndexToDuplicateRegionIds(
      regions
        .map(target => {
          const {region, ...options} = target.region ? target : {region: target}
          if (utils.types.has(region, ['x', 'y', 'width', 'height'])) {
            return {
              left: Math.round(region.x),
              top: Math.round(region.y),
              width: Math.round(region.width),
              height: Math.round(region.height),
              ...options,
            }
          }
          return region
        })
        .sort((r1, r2) => {
          if (r1.top !== r2.top) return r1.top > r2.top ? 1 : -1
          if (r1.left === r2.left) return 0
          return r1.left > r2.left ? 1 : -1
        }),
    )
  }
}

async function toScreenshotCheckSettings({checkSettings, context, screenshot}) {
  const screenshotCheckSettings = {
    ...checkSettings,
    ignoreRegions: await referencesToRegions(checkSettings.ignoreRegions),
    floatingRegions: await referencesToRegions(checkSettings.floatingRegions),
    strictRegions: await referencesToRegions(checkSettings.strictRegions),
    layoutRegions: await referencesToRegions(checkSettings.layoutRegions),
    contentRegions: await referencesToRegions(checkSettings.contentRegions),
    accessibilityRegions: await referencesToRegions(checkSettings.accessibilityRegions),
  }

  return screenshotCheckSettings

  async function referencesToRegions(references) {
    if (!references) return references
    const regions = []
    for (const reference of references) {
      const referenceRegions = []
      const {region, ...options} = reference.region ? reference : {region: reference}
      if (utils.types.has(region, ['width', 'height'])) {
        const referenceRegion = utils.types.has(region, ['x', 'y'])
          ? region
          : {x: region.left, y: region.top, width: region.width, height: region.height}
        referenceRegions.push(referenceRegion)
      } else {
        const elements = await context.elements(region)
        if (elements.length > 0) {
          options.regionId = options.regionId || stringifySelector(elements[0])
          const contextLocationInViewport = await elements[0].context.getLocationInViewport()
          for (const element of elements) {
            const elementRegion = utils.geometry.withPadding(await element.getRegion(), options.padding)
            const region = utils.geometry.offset(elementRegion, contextLocationInViewport)
            const scaledRegion = utils.geometry.scale(
              {
                x: Math.max(0, region.x - screenshot.region.x),
                y: Math.max(0, region.y - screenshot.region.y),
                width: region.width,
                height: region.height,
              },
              context.driver.viewportScale,
            )
            referenceRegions.push(scaledRegion)
          }
        }
      }
      regions.push(...referenceRegions.map(region => ({region, ...options})))
    }
    return regions
  }
}

module.exports = {
  toPersistedCheckSettings,
  toCheckWindowConfiguration,
  toScreenshotCheckSettings,
  toMatchSettings,
}
