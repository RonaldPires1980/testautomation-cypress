'use strict';

const fs = require('fs');
const path = require('path');

const chalk = require('chalk');
const {readFileSync, writeFileSync} = require('fs');
const addEyesCommands = require('./addEyesCommands');
const isCommandsDefined = require('./isCommandsDefined');
const getFilePath = require('./getFilePath');
const getCypressConfig = require('./getCypressConfig');

function handleCommands(cwd) {
  const cypressConfig = getCypressConfig(cwd);
  const commandsFilePath = getFilePath('support', cypressConfig, cwd);
  const commandsFileContent = readFileSync(commandsFilePath).toString();

  if (!isCommandsDefined(commandsFileContent)) {
    writeFileSync(commandsFilePath, addEyesCommands(commandsFileContent));
    console.log(chalk.cyan('Commands defined.'));
  } else {
    console.log(chalk.cyan('Commands already defined.'));
  }
}

function handlerCommandsCypress10(cwd) {
  const configContent = fs.readFileSync(path.resolve(cwd, 'cypress.config.js'), 'utf-8');
  let supportFilePath;
  if (configContent.includes('supportFile')) {
    const regex = new RegExp(/(?:supportFile:)(?:\s*)(.*)/g);
    const filePath = regex.exec(configContent)[1].replace(/['|"|,]*/g, '');
    supportFilePath = path.resolve(cwd, filePath);
  } else {
    if (fs.existsSync(path.resolve(cwd, 'cypress/support/e2e.js'))) {
      supportFilePath = path.resolve(cwd, 'cypress/support/e2e.js');
    } else if (fs.existsSync(path.resolve(cwd, 'cypress/support/e2e.ts'))) {
      supportFilePath = path.resolve(cwd, 'cypress/support/e2e.ts');
    } else if (fs.existsSync(path.resolve(cwd, 'cypress/support/component.js'))) {
      supportFilePath = path.resolve(cwd, 'cypress/support/component.js');
    }
  }

  if (supportFilePath) {
    const commandsFileContent = fs.readFileSync(supportFilePath, 'utf-8');
    if (!isCommandsDefined(commandsFileContent)) {
      writeFileSync(supportFilePath, addEyesCommands(commandsFileContent));
      console.log(chalk.cyan('Commands defined.'));
    } else {
      console.log(chalk.cyan('Commands already defined.'));
    }
  } else {
    throw new Error('Commands file not found!');
  }
  return supportFilePath;
}

module.exports = {handleCommands, handlerCommandsCypress10};
