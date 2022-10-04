class SerializedError extends Error {
  constructor(error) {
    super()
    this.message = error.message
    this.stack = error.stack
  }
  toJSON() {
    return {message: this.message, stack: this.stack}
  }
}

module.exports = SerializedError
