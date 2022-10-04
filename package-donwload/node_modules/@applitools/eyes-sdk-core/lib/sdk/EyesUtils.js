const GeneralUtils = require('../utils/GeneralUtils')
const EyesError = require('../errors/EyesError')

async function executePollScript(logger, context, scripts, {executionTimeout = 5 * 60 * 1000, pollTimeout = 200} = {}) {
  logger.log('Executing poll script')
  let isExecutionTimedOut = false
  const executionTimer = setTimeout(() => (isExecutionTimedOut = true), executionTimeout)
  try {
    const {script, args = []} = scripts.main
    let response = deserialize(await context.execute(script, ...args))
    let chunks = ''
    while (!isExecutionTimedOut) {
      if (response.status === 'ERROR') {
        throw new EyesError(`Error during execute poll script: '${response.error}'`, {error: response.error})
      } else if (response.status === 'SUCCESS') {
        return response.value
      } else if (response.status === 'SUCCESS_CHUNKED') {
        chunks += response.value
        if (response.done) return deserialize(chunks)
      } else if (response.status === 'WIP') {
        await GeneralUtils.sleep(pollTimeout)
      }
      logger.log('Polling...')
      const {script, args = []} = scripts.poll
      response = deserialize(await context.execute(script, ...args))
    }
    throw new EyesError('Poll script execution is timed out', {reason: 'timeout'})
  } finally {
    clearTimeout(executionTimer)
  }

  function deserialize(json) {
    try {
      return JSON.parse(json)
    } catch (err) {
      const firstChars = json.slice(0, 100)
      const lastChars = json.slice(-100)
      throw new Error(
        `Response is not a valid JSON string. length: ${json.length}, first 100 chars: "${firstChars}", last 100 chars: "${lastChars}". error: ${err}`,
      )
    }
  }
}

module.exports = {
  executePollScript,
}
