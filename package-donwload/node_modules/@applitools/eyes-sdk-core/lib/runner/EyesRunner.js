'use strict'

const GeneralUtils = require('../utils/GeneralUtils')

class EyesRunner {
  constructor() {
    /** @type {Eyes[]} */
    this._eyesInstances = []
    /** @type {TestResultContainer[]} */
    this._allTestResult = []
    this._getBatchInfo = undefined
  }

  attachEyes(eyes, serverConnector) {
    this._eyesInstances.push(eyes)
    if (!this._getBatchInfo) {
      const fetchBatchInfo = serverConnector.batchInfo.bind(serverConnector)
      this._getBatchInfo = GeneralUtils.cachify(fetchBatchInfo)
    }
    if (!this._getRenderingInfo) {
      const getRenderingInfo = serverConnector.renderInfo.bind(serverConnector)
      this._getRenderingInfo = GeneralUtils.cachify(getRenderingInfo)
    }
  }

  async getBatchInfoWithCache(batchId) {
    if (this._getBatchInfo) {
      return this._getBatchInfo(batchId)
    } else {
      throw new Error('Eyes runner could not get batch info since attachEyes was not called before')
    }
  }

  async getRenderingInfoWithCache() {
    if (this._getRenderingInfo) {
      return this._getRenderingInfo()
    } else {
      throw new Error('Eyes runner could not get rendering info since attachEyes was not called before')
    }
  }

  async getAllTestResults() {
    await this._awaitAllClosePromises()
    await this._closeAllBatches()
    await this._abortAllUnclosedEyes()
    return this._allTestResult
  }

  async _abortAllUnclosedEyes() {
    await Promise.all(this._eyesInstances.map(eyes => eyes._abortPromise || eyes.abort()))
  }

  async _awaitAllClosePromises() {
    await Promise.all(
      this._eyesInstances.map(eyes =>
        eyes._closePromise.catch(err => {
          this._eyesInstances[0]
            .getLogger()
            .log(`Properly handling close error while await all close promises in getAllTestResults: ${err}`)
        }),
      ),
    )
  }

  /**
   * @protected
   * @return {Promise<void>}
   */
  async _closeAllBatches() {
    if (this._eyesInstances.length > 0) {
      const promises = []
      const batchIds = new Set()
      for (const eyesInstance of this._eyesInstances) {
        const batchId = eyesInstance.getBatch().getId()
        if (!batchIds.has(batchId)) {
          batchIds.add(batchId)
          promises.push(eyesInstance.closeBatch())
        }
      }

      await Promise.all(promises)
    }
  }
}

module.exports = EyesRunner
