const DiffsFoundError = require('../errors/DiffsFoundError')
const NewTestError = require('../errors/NewTestError')
const TestFailedError = require('../errors/TestFailedError')
const SerializedError = require('../errors/SerializedError')

function makeCloseManager({runner}) {
  return async function closeManager({throwErr = false} = {}) {
    const testResultContainers = await runner.getAllTestResults()

    const summary = {
      results: testResultContainers,
      passed: 0,
      unresolved: 0,
      failed: 0,
      exceptions: 0,
      mismatches: 0,
      missing: 0,
      matches: 0,
    }

    for (const container of testResultContainers) {
      if (container.testResults) {
        if (container.testResults.status === 'Unresolved') {
          if (container.testResults.isNew) container.exception = new NewTestError(container.testResults)
          else container.exception = new DiffsFoundError(container.testResults)
        } else if (container.testResults.status === 'Failed') {
          container.exception = new TestFailedError(container.testResults)
        }
      } else if (container.exception) {
        container.exception = new SerializedError(container.exception)
      }
      if (throwErr && container.exception) {
        throw container.exception
      }

      if (container.exception) {
        summary.exceptions += 1
      }

      if (container.testResults) {
        if (container.testResults.status === 'Failed') summary.failed += 1
        else if (container.testResults.status === 'Passed') summary.passed += 1
        else if (container.testResults.status === 'Unresolved') summary.unresolved += 1

        summary.matches += container.testResults.matches
        summary.missing += container.testResults.missing
        summary.mismatches += container.testResults.mismatches
      }
    }

    return summary
  }
}

module.exports = makeCloseManager
