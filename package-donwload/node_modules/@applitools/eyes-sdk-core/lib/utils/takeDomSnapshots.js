const takeDomSnapshot = require('./takeDomSnapshot')
const getBrowserInfo = require('./getBrowserInfo')
const chalk = require('chalk')
const GeneralUtils = require('./GeneralUtils')

async function takeDomSnapshots({
  breakpoints,
  browsers,
  disableBrowserFetching,
  driver,
  logger,
  showLogs,
  skipResources,
  getViewportSize,
  getEmulatedDevicesSizes,
  getIosDevicesSizes,
  waitBeforeCapture,
  lazyLoadBeforeCapture,
}) {
  const cookieJar = driver.features.allCookies ? await driver.getCookies().catch(() => []) : []
  const currentContext = driver.currentContext
  if (lazyLoadBeforeCapture) await lazyLoadBeforeCapture()

  if (!breakpoints) {
    logger.log(`taking single dom snapshot`)
    if (waitBeforeCapture) await waitBeforeCapture()
    const snapshot = await takeDomSnapshot(logger, currentContext, {
      onSnapshotContext: !driver.features.allCookies ? collectCookies : undefined,
      disableBrowserFetching,
      showLogs,
      skipResources,
    })
    return {snapshots: Array(browsers.length).fill(snapshot), cookies: cookieJar}
  }

  const requiredWidths = await getRequiredWidths()
  const isStrictBreakpoints = Array.isArray(breakpoints)
  const smallestBreakpoint = Math.min(...(isStrictBreakpoints ? breakpoints : []))

  if (isStrictBreakpoints && requiredWidths.has(smallestBreakpoint - 1)) {
    const smallestBrowsers = requiredWidths
      .get(smallestBreakpoint - 1)
      .map(({name, width}) => `(${name}, ${width})`)
      .join(', ')
    const message = chalk.yellow(
      `The following configuration's viewport-widths are smaller than the smallest configured layout breakpoint (${smallestBreakpoint} pixels): [${smallestBrowsers}]. As a fallback, the resources that will be used for these configurations have been captured on a viewport-width of ${smallestBreakpoint} - 1 pixels. If an additional layout breakpoint is needed for you to achieve better results - please add it to your configuration.`,
    )
    logger.console.log(message)
  }

  logger.log(`taking multiple dom snapshots for breakpoints: ${breakpoints}`)
  logger.log(`required widths: ${[...requiredWidths.keys()].join(', ')}`)
  const viewportSize = await getViewportSize()
  const snapshots = Array(browsers.length)
  if (requiredWidths.has(viewportSize.width)) {
    logger.log(`taking dom snapshot for existing width ${viewportSize.width}`)
    if (waitBeforeCapture) await waitBeforeCapture()
    const snapshot = await takeDomSnapshot(logger, currentContext, {
      disableBrowserFetching,
      showLogs,
      skipResources,
    })
    requiredWidths.get(viewportSize.width).forEach(({index}) => (snapshots[index] = snapshot))
  }
  for (const [requiredWidth, browsersInfo] of requiredWidths.entries()) {
    logger.log(`taking dom snapshot for width ${requiredWidth}`)
    try {
      await driver.setViewportSize({width: requiredWidth, height: viewportSize.height})
    } catch (err) {
      logger.log(err)
      const actualViewportSize = await driver.getViewportSize()
      if (isStrictBreakpoints) {
        const failedBrowsers = browsersInfo.map(({name, width}) => `(${name}, ${width})`).join(', ')
        const message = chalk.yellow(
          `One of the configured layout breakpoints is ${requiredWidth} pixels, while your local browser has a limit of ${actualViewportSize.width}, so the SDK couldn't resize it to the desired size. As a fallback, the resources that will be used for the following configurations: [${failedBrowsers}] have been captured on the browser's limit (${actualViewportSize.width} pixels). To resolve this, you may use a headless browser as it can be resized to any size.`,
        )
        logger.console.log(message)
        logger.log(message)
      } else {
        const failedBrowsers = browsersInfo.map(({name}) => `(${name})`).join(', ')
        const message = chalk.yellow(
          `The following configurations [${failedBrowsers}] have a viewport-width of ${requiredWidth} pixels, while your local browser has a limit of ${actualViewportSize.width} pixels, so the SDK couldn't resize it to the desired size. As a fallback, the resources that will be used for these checkpoints have been captured on the browser's limit (${actualViewportSize.width} pixels). To resolve this, you may use a headless browser as it can be resized to any size.`,
        )
        logger.console.log(message)
        logger.log(message)
      }
    } finally {
      if (waitBeforeCapture) await waitBeforeCapture()
    }

    const snapshot = await takeDomSnapshot(logger, currentContext, {
      onSnapshotContext: !driver.features.allCookies ? collectCookies : undefined,
      disableBrowserFetching,
      showLogs,
      skipResources,
    })

    browsersInfo.forEach(({index}) => (snapshots[index] = snapshot))
  }
  await driver.setViewportSize(viewportSize)
  return {snapshots, cookies: cookieJar}

  async function getRequiredWidths() {
    return await browsers.reduce((widths, browser, index) => {
      const browserInfo = getBrowserInfo({browser, getEmulatedDevicesSizes, getIosDevicesSizes})
      return widths.then(async widths => {
        const {name, width} = await browserInfo
        const requiredWidth = GeneralUtils.getBreakpointWidth(breakpoints, width)
        let groupedBrowsers = widths.get(requiredWidth)
        if (!groupedBrowsers) {
          groupedBrowsers = []
          widths.set(requiredWidth, groupedBrowsers)
        }
        groupedBrowsers.push({index, width, name})
        return widths
      })
    }, Promise.resolve(new Map()))
  }

  async function collectCookies(context) {
    cookieJar.push(...(await context.getCookies()))
  }
}

module.exports = takeDomSnapshots
