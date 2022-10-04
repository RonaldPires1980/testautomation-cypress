'use strict';
const makePluginExport = require('./pluginExport');
const makeConfig = require('./config');
const makeStartServer = require('./server');
const {makeLogger} = require('@applitools/logger');

const {config, eyesConfig} = makeConfig();
const logger = makeLogger({level: config.showLogs ? 'info' : 'silent', label: 'eyes'});

const startServer = makeStartServer({logger});

module.exports = makePluginExport({
  startServer,
  eyesConfig: Object.assign({}, eyesConfig, {appliConfFile: config}),
});
