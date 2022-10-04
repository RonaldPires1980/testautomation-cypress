const createResource = require('./createResource')

function createVHSResource({vhsHash, resourceMapping, vhsType, platformName}) {
  return createResource({
    value: Buffer.from(
      JSON.stringify({
        vhs: vhsHash,
        resources: {
          ...resourceMapping,
          vhs: undefined,
        },
        metadata: {
          platformName: platformName,
          vhsType: vhsType,
        },
      }),
    ),
    type: 'x-applitools-resource-map/native',
  })
}

module.exports = createVHSResource
