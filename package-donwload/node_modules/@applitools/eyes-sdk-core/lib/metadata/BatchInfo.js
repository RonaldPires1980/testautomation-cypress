'use strict'

const GeneralUtils = require('../utils/GeneralUtils')

class BatchInfo {
  /**
   * @param info
   * @param {string} info.id
   * @param {string} info.name
   * @param {Date|string} info.startedAt
   * @param {array} info.properties
   */
  constructor({id, name, startedAt, properties} = {}) {
    if (startedAt && !(startedAt instanceof Date)) {
      startedAt = new Date(startedAt)
    }

    this._id = id
    this._name = name
    this._startedAt = startedAt
    this._properties = properties
  }

  /**
   * @return {string}
   */
  getId() {
    return this._id
  }

  /**
   * @param {string} value
   */
  setId(value) {
    this._id = value
  }

  /**
   * @return {string}
   */
  getName() {
    return this._name
  }

  /**
   * @param {string} value
   */
  setName(value) {
    this._name = value
  }

  /**
   * @return {Date}
   */
  getStartedAt() {
    return this._startedAt
  }

  /**
   * @param {Date} value
   */
  setStartedAt(value) {
    this._startedAt = value
  }

  /**
   * @return {array}
   */
  getProperties() {
    return this._properties
  }

  /**
   * @param {array} value
   */
  setProperties(value) {
    this._properties = value
  }

  /**
   * @override
   */
  toJSON() {
    return GeneralUtils.toPlain(this)
  }

  /**
   * @override
   */
  toString() {
    return `BatchInfo { ${JSON.stringify(this)} }`
  }
}

module.exports = BatchInfo
