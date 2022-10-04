'use strict';
const isGlobalHooksSupported = require('./isGlobalHooksSupported');
const {presult} = require('@applitools/functional-commons');
const makeGlobalRunHooks = require('./hooks');

function makePluginExport({startServer, eyesConfig}) {
  return function pluginExport(pluginModule) {
    let eyesServer;
    const pluginModuleExports = pluginModule.exports.e2e
      ? pluginModule.exports.e2e.setupNodeEvents
      : pluginModule.exports;
    const setupNodeEvents = async function(...args) {
      const {server, port, closeManager, closeBatches, closeUniversalServer} = await startServer();
      eyesServer = server;

      const globalHooks = makeGlobalRunHooks({closeManager, closeBatches, closeUniversalServer});

      const [origOn, config] = args;
      const isGlobalHookCalledFromUserHandlerMap = new Map();
      eyesConfig.eyesIsGlobalHooksSupported = isGlobalHooksSupported(config);
      const moduleExportsResult = await pluginModuleExports(onThatCallsUserDefinedHandler, config);
      if (eyesConfig.eyesIsGlobalHooksSupported) {
        for (const [eventName, eventHandler] of Object.entries(globalHooks)) {
          if (!isGlobalHookCalledFromUserHandlerMap.get(eventName)) {
            origOn.call(this, eventName, eventHandler);
          }
        }
      }

      return Object.assign({}, eyesConfig, {eyesPort: port}, moduleExportsResult);

      // This piece of code exists because at the point of writing, Cypress does not support multiple event handlers:
      // https://github.com/cypress-io/cypress/issues/5240#issuecomment-948277554
      // So we wrap Cypress' `on` function in order to wrap the user-defined handler. This way we can call our own handler
      // in addition to the user's handler
      function onThatCallsUserDefinedHandler(eventName, handler) {
        const isRunEvent = eventName === 'before:run' || eventName === 'after:run';
        let handlerToCall = handler;
        if (eyesConfig.eyesIsGlobalHooksSupported && isRunEvent) {
          handlerToCall = handlerThatCallsUserDefinedHandler;
          isGlobalHookCalledFromUserHandlerMap.set(eventName, true);
        }
        return origOn.call(this, eventName, handlerToCall);

        async function handlerThatCallsUserDefinedHandler() {
          const [err] = await presult(
            Promise.resolve(globalHooks[eventName].apply(this, arguments)),
          );
          await handler.apply(this, arguments);
          if (err) {
            throw err;
          }
        }
      }
    };
    if (pluginModule.exports.e2e) {
      pluginModule.exports.e2e.setupNodeEvents = setupNodeEvents;
    } else {
      pluginModule.exports = setupNodeEvents;
    }
    return function getCloseServer() {
      return eyesServer.close();
    };
  };
}

module.exports = makePluginExport;
