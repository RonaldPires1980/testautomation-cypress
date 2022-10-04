function appendIndexToDuplicateRegionIds(regions = []) {
  const uniqRegionIds = [...new Set(regions.map(region => region && region.regionId))]
  const regionIdStats = uniqRegionIds
    .map(uniqRegionId => {
      if (!uniqRegionId) return
      return {
        regionId: uniqRegionId,
        count: regions.filter(region => region && region.regionId === uniqRegionId).length,
        currentIndex: 1,
      }
    })
    .filter(usage => usage !== undefined)
    .filter(usage => usage.count > 1)
  return regions.map(region => {
    const lookup = regionIdStat => region && region.regionId && region.regionId === regionIdStat.regionId
    const regionIdStat = regionIdStats.find(lookup)
    if (regionIdStat) {
      region.regionId += ` (${regionIdStat.currentIndex++})`
    }
    return region
  })
}

module.exports = {
  appendIndexToDuplicateRegionIds,
}
