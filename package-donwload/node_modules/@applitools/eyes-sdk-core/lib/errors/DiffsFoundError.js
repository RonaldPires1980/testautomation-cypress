const EyesError = require('./EyesError')

/**
 * Indicates that an existing test ended, and that differences where found from the baseline.
 */
class DiffsFoundError extends EyesError {
  constructor(testResult) {
    const message = `Test '${testResult.name}' of '${testResult.appName}' detected differences! See details at: ${testResult.url}`
    super(message, {reason: 'test different', testResult})
  }
}

module.exports = DiffsFoundError
