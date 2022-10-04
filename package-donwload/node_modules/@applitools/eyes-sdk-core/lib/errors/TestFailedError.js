const EyesError = require('./EyesError')

/**
 * Indicates that a test did not pass (i.e., test either failed or is a new test).
 */
class TestFailedError extends EyesError {
  constructor(testResult) {
    const message = `Test '${testResult.name}' of '${testResult.appName}' is failed! See details at ${testResult.url}`
    super(message, {reason: 'test failed', testResult})
  }
}

module.exports = TestFailedError
