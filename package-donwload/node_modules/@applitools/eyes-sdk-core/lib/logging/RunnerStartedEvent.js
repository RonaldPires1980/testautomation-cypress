'use strict'

const LogEvent = require('./LogEvent')

function RunnerStartedEvent({concurrency, testConcurrency, defaultConcurrency, concurrentRendersPerTest}) {
  return LogEvent({
    level: 'Notice',
    type: 'runnerStarted',
    concurrency,
    testConcurrency,
    defaultConcurrency,
    concurrentRendersPerTest,
    node: {version: process.version, platform: process.platform, arch: process.arch},
  })
}

module.exports = RunnerStartedEvent
