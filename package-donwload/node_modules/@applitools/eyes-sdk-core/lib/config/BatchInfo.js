const utils = require('@applitools/utils')
const GeneralUtils = require('../utils/GeneralUtils')
const TypeUtils = require('../utils/TypeUtils')

/**
 * @typedef BatchInfoObject
 * @prop {string} [id]
 * @prop {string} [name]
 * @prop {array} [properties]
 * @prop {Date|string} [startedAt]
 * @prop {string} [sequenceName]
 * @prop {boolean} [notifyOnCompletion]
 */

/**
 * A batch of tests.
 */
class BatchInfo {
  /**
   * Creates a new BatchInfo instance.
   * Alternatively, batch can be set via global variables `APPLITOOLS_BATCH_ID`, `APPLITOOLS_BATCH_NAME`, `APPLITOOLS_BATCH_SEQUENCE`.
   *
   * @signature `new BatchInfo()`
   *
   * @signature `new BatchInfo(batchInfo)`
   * @sigparam {BatchInfo} batchInfo - The BatchInfo instance to clone from.
   *
   * @signature `new BatchInfo(object)`
   * @sigparam {{id: (string|undefined), name: (string|undefined), startedAt: (Date|string|undefined), sequenceName: (string|undefined)}} object - The batch object to clone from.
   *
   * @signature `new BatchInfo(name, startedAt, id)`
   * @sigparam {string} name - Name of batch or {@code null} if anonymous.
   * @sigparam {Date|string} [startedAt] - Batch start time, defaults to the current time.
   * @sigparam {string} [id] - The ID of the existing batch, used to clone batch.
   *
   * @param {BatchInfo|BatchInfoObject|string} [varArg1] - The BatchInfo (or object) to clone from or the name of new batch.
   *   If no arguments given, new BatchInfo will be created with default or environment settings.
   * @param {string} [varArg2] - Batch start time, defaults to the current time.
   * @param {string} [varArg3] - ID of the batch, defaults is generated using GeneralUtils.guid().
   */
  constructor(varArg1, varArg2, varArg3) {
    if (varArg1 instanceof BatchInfo) {
      return new BatchInfo({
        id: varArg1.getId(),
        name: varArg1.getName(),
        startedAt: varArg1.getStartedAt(),
        sequenceName: varArg1.getSequenceName(),
        notifyOnCompletion: varArg1.getNotifyOnCompletion(),
        properties: varArg1.getProperties(),
        isCompleted: varArg1.getIsCompleted(),
        isGeneratedId: varArg1.getIsGeneratedId(),
      })
    }

    if (TypeUtils.isString(varArg1)) {
      return new BatchInfo({id: varArg3, name: varArg1, startedAt: varArg2})
    }

    let {id, name, properties, startedAt, sequenceName, notifyOnCompletion, isCompleted, isGeneratedId} = varArg1 || {}
    utils.guard.isString(id, {name: 'batchId', strict: false})
    utils.guard.isString(name, {name: 'batchName', strict: false})
    utils.guard.isString(sequenceName, {name: 'sequenceName', strict: false})
    utils.guard.isArray(properties, {name: 'properties', strict: false})
    utils.guard.isBoolean(notifyOnCompletion, {name: 'notifyOnCompletion', strict: false})
    utils.guard.isBoolean(isCompleted, {name: 'isCompleted', strict: false})
    utils.guard.isBoolean(isGeneratedId, {name: 'isGeneratedId', strict: false})

    if (startedAt && !(startedAt instanceof Date)) {
      utils.guard.isString(startedAt, {name: 'startedAt', strict: false})
      startedAt = new Date(startedAt)
    }

    this._id = id || GeneralUtils.getEnvValue('BATCH_ID')
    this._isGeneratedId = !!isGeneratedId || Boolean(this._id && this._id.startsWith('generated-'))
    if (!this._id) {
      this._generateAndSetId()
    }
    this._name = name || GeneralUtils.getEnvValue('BATCH_NAME')
    this._properties = properties || []
    this._startedAt = startedAt || new Date()
    this._sequenceName = sequenceName || GeneralUtils.getEnvValue('BATCH_SEQUENCE')
    this._notifyOnCompletion = notifyOnCompletion || GeneralUtils.getEnvValue('BATCH_NOTIFY', true) || false
    this._isCompleted = isCompleted || false
  }

  /**
   * @return {string} - The id of the current batch.
   */
  getId() {
    return this._id
  }

  getIsGeneratedId() {
    return this._isGeneratedId
  }

  setIsGeneratedId(value) {
    return (this._isGeneratedId = value)
  }

  /**
   * Sets a unique identifier for the batch. Sessions with batch info which includes the same ID will be grouped
   * together.
   *
   * @param {string} value - The batch's ID
   * @return {this}
   */
  setId(value) {
    utils.guard.notNull(value, {name: 'id'})
    this._id = value
    return this
  }

  /**
   * @return {string} - The name of the batch or {@code null} if anonymous.
   */
  getName() {
    return this._name
  }

  /**
   * @param {string} name - The name of the batch to use.
   * @return {this}
   */
  setName(name) {
    this._name = name
    return this
  }

  /**
   * @return {array} - custom batch properties
   */
  getProperties() {
    return this._properties
  }

  /**
   * @param {array} properties - The custom batch properties to set
   * @return {this}
   */
  setProperties(props) {
    this._properties = props
    return this
  }

  /**
   * @param {string} name - The custom batch property name
   * @param {string} value - The custom batch property value
   * @return {this}
   */
  addProperty(name, value) {
    this._properties.push({name, value})
    return this
  }

  /**
   * @return {Date} - The batch start date
   */
  getStartedAt() {
    return this._startedAt
  }

  /**
   * @param {string} startedAt
   * @return {this}
   */
  setStartedAt(startedAt) {
    this._startedAt = startedAt
    return this
  }

  /**
   * @return {string} - The name of the sequence.
   */
  getSequenceName() {
    return this._sequenceName
  }

  /**
   * @param {string} sequenceName - The Batch's sequence name.
   * @return {this}
   */
  setSequenceName(sequenceName) {
    this._sequenceName = sequenceName
    return this
  }

  /**
   * @return {boolean} - Indicate whether notification should be sent on this batch completion.
   */
  getNotifyOnCompletion() {
    return this._notifyOnCompletion
  }

  /**
   * @param {boolean} notifyOnCompletion - Indicate whether notification should be sent on this batch completion.
   * @return {this}
   */
  setNotifyOnCompletion(notifyOnCompletion) {
    this._notifyOnCompletion = notifyOnCompletion
    return this
  }

  /**
   * @return {boolean}
   */
  getIsCompleted() {
    return this._isCompleted
  }

  /**
   * @param {boolean} isCompleted
   * @return {this}
   */
  setIsCompleted(isCompleted) {
    this._isCompleted = isCompleted
    return this
  }

  /**
   * @override
   */
  toJSON() {
    return GeneralUtils.toPlain(this, ['_isCompleted', '_isGeneratedId'], {
      sequenceName: 'batchSequenceName',
    })
  }

  /**
   * @override
   */
  toString() {
    return `BatchInfo { ${JSON.stringify(this)} }`
  }

  _generateAndSetId() {
    this._isGeneratedId = true
    this._id = GeneralUtils.guid()
  }
}

module.exports = BatchInfo
