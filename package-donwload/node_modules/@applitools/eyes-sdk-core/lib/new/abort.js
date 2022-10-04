function makeAbort({eyes}) {
  return async function abort() {
    return (await eyes.abort()) || []
  }
}

module.exports = makeAbort
