'use strict'

function RunnerOptions() {
  const CONCURRENCY_DEFAULT = 5
  const options = {}

  return {
    testConcurrency(value) {
      return {...options, testConcurrency: value || CONCURRENCY_DEFAULT}
    },
  }
}

module.exports = RunnerOptions
