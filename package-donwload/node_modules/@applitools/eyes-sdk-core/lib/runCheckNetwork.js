#!/usr/bin/env node
/* eslint-disable no-console */

'use strict'

const {makeCheckNetwork} = require('./troubleshoot/checkNetwork')
const checkNetwork = makeCheckNetwork({})
checkNetwork()
