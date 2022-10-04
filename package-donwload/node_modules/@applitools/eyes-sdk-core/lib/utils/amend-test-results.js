function appendUserTestIdToTestResults(testResults, userTestId) {
  if (testResults) {
    testResults.userTestId = userTestId
  }

  return testResults
}

module.exports = {
  appendUserTestIdToTestResults,
}
