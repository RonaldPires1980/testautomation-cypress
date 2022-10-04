const {makeLogger} = require('@applitools/logger')
const ServerConnector = require('../server/ServerConnector')
const Configuration = require('../config/Configuration')

function makeCloseBatches() {
  return async function closeBatches({settings: {batchIds, serverUrl, apiKey, proxy} = {}, logger} = {}) {
    if (!batchIds) throw new Error('no batchIds were set')
    const serverConnector = new ServerConnector({
      logger: logger || makeLogger(),
      configuration: new Configuration({serverUrl, apiKey, proxy}),
      getAgentId: () => '',
    })

    // TODO replace with Promise.allSettled after supporting node >= 12
    const results = await Promise.all(
      batchIds.map(batchId =>
        serverConnector.deleteBatchSessions(batchId).then(
          value => ({status: 'fulfilled', value}),
          reason => ({status: 'rejected', reason}),
        ),
      ),
    )
    const error = results.find(({status}) => status === 'rejected')
    if (error) throw error.reason
  }
}

module.exports = makeCloseBatches
