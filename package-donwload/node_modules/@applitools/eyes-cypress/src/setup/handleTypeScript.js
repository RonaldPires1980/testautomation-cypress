'use strict';
const chalk = require('chalk');
const {writeFileSync, existsSync} = require('fs');
const getFilePath = require('./getFilePath');
const getCypressConfig = require('./getCypressConfig');
const eyesIndexContent = `import "@applitools/eyes-cypress"`;
const {resolve, dirname} = require('path');

function handleTypeScript(cwd) {
  const cypressConfig = getCypressConfig(cwd);
  const typeScriptFilePath = getFilePath('typeScript', cypressConfig, cwd);

  if (!existsSync(typeScriptFilePath)) {
    writeFileSync(typeScriptFilePath, eyesIndexContent);
    console.log(chalk.cyan('Typescript defined.'));
  } else {
    console.log(chalk.cyan('Typescript already defined.'));
  }
}

function handlerTypeScriptCypress10(suportFilePath) {
  const supportDir = dirname(suportFilePath);
  const typeScriptFilePath = resolve(supportDir, 'index.d.ts');
  if (!existsSync(typeScriptFilePath)) {
    writeFileSync(typeScriptFilePath, eyesIndexContent);
    console.log(chalk.cyan('Typescript defined.'));
  } else {
    console.log(chalk.cyan('Typescript already defined.'));
  }
}

module.exports = {handleTypeScript, handlerTypeScriptCypress10};
module.exports.eyesIndexContent = eyesIndexContent;
