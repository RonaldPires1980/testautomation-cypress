'use strict';

const {readFileSync, writeFileSync} = require('fs');
const chalk = require('chalk');
const {addEyesCypressPlugin} = require('./addEyesCypressPlugin');
const isPluginDefined = require('./isPluginDefined');
const getFilePath = require('./getFilePath');
const getCypressConfig = require('./getCypressConfig');
const fs = require('fs');
const path = require('path');

function handlePlugin(cwd, isCypress10) {
  let fileContent, filePath;
  if (!isCypress10) {
    const cypressConfig = getCypressConfig(cwd);
    filePath = getFilePath('plugins', cypressConfig, cwd);
    fileContent = readFileSync(filePath).toString();
  } else {
    filePath = path.resolve(cwd, 'cypress.config.js');
    fileContent = fs.readFileSync(filePath, 'utf-8');
  }

  if (!isPluginDefined(fileContent)) {
    writeFileSync(filePath, addEyesCypressPlugin(fileContent));
    console.log(chalk.cyan('Plugins defined.'));
  } else {
    console.log(chalk.cyan('Plugins already defined'));
  }
}

module.exports = {handlePlugin};
