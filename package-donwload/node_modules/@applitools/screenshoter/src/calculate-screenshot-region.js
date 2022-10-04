const utils = require('@applitools/utils')

function calculateScreenshotRegion({cropRegion, stitchedImage, preMoveOffset, postMoveOffset} = {}) {
  cropRegion = !!cropRegion ? cropRegion : {x: 0, y: 0}
  const screenshotRegion = utils.geometry.region(cropRegion, stitchedImage.size)

  if (JSON.stringify(preMoveOffset) === JSON.stringify(postMoveOffset)) return screenshotRegion
  const moveOffset = utils.geometry.offsetNegative(postMoveOffset, preMoveOffset)
  const compensatedScreenshotRegion = utils.geometry.offset(screenshotRegion, moveOffset)

  if (preMoveOffset.y === postMoveOffset.y && preMoveOffset.x !== postMoveOffset.x)
    compensatedScreenshotRegion.x = preMoveOffset.x

  return compensatedScreenshotRegion
}

module.exports = calculateScreenshotRegion
