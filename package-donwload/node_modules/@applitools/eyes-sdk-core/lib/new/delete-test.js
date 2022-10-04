const ServerConnector = require('../server/ServerConnector')
const Configuration = require('../config/Configuration')
const TestResults = require('../TestResults')

function makeDeleteTestResults() {
  return async function deleteTestResults({settings, logger}) {
    const {testId, batchId, secretToken, serverUrl, apiKey, proxy} = settings
    const serverConnector = new ServerConnector({
      logger,
      configuration: new Configuration({serverUrl, apiKey, proxy}),
      getAgentId: () => '',
    })

    await serverConnector.deleteSession(new TestResults({id: testId, batchId, secretToken}))
  }
}

module.exports = makeDeleteTestResults
