'use strict';
const utils = require('@applitools/utils');
const {configParams, TypeUtils} = require('@applitools/visual-grid-client');
const DEFAULT_TEST_CONCURRENCY = 5;
const uuid = require('uuid');

function makeConfig() {
  const config = utils.config.getConfig({
    params: [
      ...configParams,
      'failCypressOnDiff',
      'tapDirPath',
      'tapFileName',
      'disableBrowserFetching',
      'testConcurrency',
    ],
  });

  if ((!config.batch || !config.batch.id) && !config.batchId) {
    config.batch = {id: uuid.v4(), ...config.batch};
  }

  if (config.failCypressOnDiff === '0') {
    config.failCypressOnDiff = false;
  }

  if (TypeUtils.isString(config.showLogs)) {
    config.showLogs = config.showLogs === 'true' || config.showLogs === '1';
  }

  if (TypeUtils.isString(config.testConcurrency)) {
    config.testConcurrency = Number(config.testConcurrency);
  }

  if (config.accessibilityValidation) {
    config.accessibilitySettings = config.accessibilityValidation;
    delete config.accessiblityValidation;
  }

  const eyesConfig = {
    tapDirPath: config.tapDirPath,
    tapFileName: config.tapFileName,
    eyesIsDisabled: !!config.isDisabled,
    eyesBrowser: JSON.stringify(config.browser),
    eyesLayoutBreakpoints: JSON.stringify(config.layoutBreakpoints),
    eyesFailCypressOnDiff:
      config.failCypressOnDiff === undefined ? true : !!config.failCypressOnDiff,
    eyesDisableBrowserFetching: !!config.disableBrowserFetching,
    eyesTestConcurrency: config.testConcurrency || DEFAULT_TEST_CONCURRENCY,
    eyesWaitBeforeCapture: config.waitBeforeCapture,
  };

  return {config, eyesConfig};
}

module.exports = makeConfig;
