const EyesError = require('./EyesError')

/**
 * Indicates that a new test (i.e., a test for which no baseline exists) ended.
 */
class NewTestError extends EyesError {
  constructor(testResult) {
    const message = `Test '${testResult.name}' of '${testResult.appName}' is new! Please approve the new baseline at ${testResult.url}`
    super(message, {reason: 'test new', testResult})
  }
}

module.exports = NewTestError
