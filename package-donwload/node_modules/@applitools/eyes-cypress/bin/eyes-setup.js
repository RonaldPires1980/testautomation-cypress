#!/usr/bin/env node
'use strict';

const chalk = require('chalk');
const {handlePlugin} = require('../src/setup/handlePlugin');
const {handleCommands, handlerCommandsCypress10} = require('../src/setup/handleCommands');
const {handleTypeScript, handlerTypeScriptCypress10} = require('../src/setup/handleTypeScript');
const {version} = require('../package');
const fs = require('fs');
const cwd = process.cwd();
const semver = require('semver');

console.log(chalk.cyan('Setup eyes-cypress', version));
const packageJson = JSON.parse(fs.readFileSync('package.json'));
let cypressVersion;

if (packageJson.dependencies && packageJson.dependencies.cypress) {
  cypressVersion = packageJson.dependencies.cypress;
} else if (packageJson.devDependencies && packageJson.devDependencies.cypress) {
  cypressVersion = packageJson.devDependencies.cypress;
}
const logStr = `Cypress version that was found ${cypressVersion}`;
try {
  if (semver.satisfies(semver.coerce(String(cypressVersion)), '>=10.0.0')) {
    console.log(chalk.cyan(logStr, ' (above v10 handler)'));
    handlePlugin(cwd, true);
    const supportFilePath = handlerCommandsCypress10(cwd);
    handlerTypeScriptCypress10(supportFilePath);
  } else {
    console.log(chalk.cyan(logStr));
    handlePlugin(cwd, false);
    handleCommands(cwd);
    handleTypeScript(cwd);
  }
} catch (e) {
  console.log(chalk.red('Setup error:\n', e));
}

console.log(chalk.cyan('Setup done!'));
