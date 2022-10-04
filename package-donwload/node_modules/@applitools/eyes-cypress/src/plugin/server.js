'use strict';
const connectSocket = require('./webSocket');
const {makeServerProcess} = require('@applitools/eyes-universal');
const {TestResults} = require('@applitools/visual-grid-client');
const handleTestResults = require('./handleTestResults');
const path = require('path');
const fs = require('fs');
const {Server: HttpsServer} = require('https');
const {Server: WSServer} = require('ws');

function makeStartServer({logger}) {
  return async function startServer() {
    const key = fs.readFileSync(path.resolve(__dirname, '../pem/server.key'));
    const cert = fs.readFileSync(path.resolve(__dirname, '../pem/server.cert'));
    let port;

    const https = new HttpsServer({
      key,
      cert,
    });
    await https.listen(0, err => {
      if (err) {
        logger.log('error starting plugin server', err);
      } else {
        logger.log(`plugin server running at port: ${https.address().port}`);
        port = https.address().port;
      }
    });

    const wss = new WSServer({server: https, path: '/eyes', maxPayload: 254 * 1024 * 1024});

    wss.on('close', () => https.close());

    const {port: universalPort, close: closeUniversalServer} = await makeServerProcess({
      key: path.resolve(__dirname, '../pem/server.key'),
      cert: path.resolve(__dirname, '../pem/server.cert'),
      detached: false,
      idleTimeout: 0,
    });

    const managers = [];
    let socketWithUniversal;

    wss.on('connection', socketWithClient => {
      socketWithUniversal = connectSocket(`wss://localhost:${universalPort}/eyes`);

      socketWithUniversal.setPassthroughListener(message => {
        logger.log('<== ', message.toString().slice(0, 1000));
        const {name, payload} = JSON.parse(message);
        if (name === 'Core.makeManager') {
          managers.push({manager: payload.result, socketWithUniversal});
        }

        socketWithClient.send(message.toString());
      });

      socketWithClient.on('message', message => {
        const msg = JSON.parse(message);
        logger.log('==> ', message.toString().slice(0, 1000));
        if (msg.name === 'Core.makeSDK') {
          const newMessage = Buffer.from(
            JSON.stringify({
              name: msg.name,
              key: msg.key,
              payload: Object.assign(msg.payload, {cwd: process.cwd()}),
            }),
            'utf-8',
          );
          socketWithUniversal.send(newMessage);
        } else if (msg.name === 'Test.printTestResults') {
          try {
            const resultArr = [];
            for (const result of msg.payload.testResults) {
              resultArr.push(new TestResults(result));
            }
            if (msg.payload.resultConfig.tapDirPath) {
              handleTestResults.handleBatchResultsFile(resultArr, {
                tapFileName: msg.payload.resultConfig.tapFileName,
                tapDirPath: msg.payload.resultConfig.tapDirPath,
              });
            }
            handleTestResults.printTestResults({
              testResults: resultArr,
              resultConfig: msg.payload.resultConfig,
            });
            socketWithClient.send(
              JSON.stringify({
                name: 'Test.printTestResults',
                key: msg.key,
                payload: {result: 'success'},
              }),
            );
          } catch (ex) {
            socketWithClient.send(
              JSON.stringify({
                name: 'Test.printTestResults',
                key: msg.key,
                payload: {result: ex.message.toString()},
              }),
            );
          }
        } else {
          socketWithUniversal.send(message);
        }
      });
    });

    return {
      server: wss,
      port,
      closeManager,
      closeBatches,
      closeUniversalServer,
    };

    function closeManager() {
      return Promise.all(
        managers.map(({manager, socketWithUniversal}) =>
          socketWithUniversal.request('EyesManager.closeManager', {
            manager,
            throwErr: false,
          }),
        ),
      );
    }
    function closeBatches(settings) {
      if (socketWithUniversal)
        return socketWithUniversal.request('Core.closeBatches', {settings}).catch(err => {
          logger.log('@@@', err);
        });
    }
  };
}

module.exports = makeStartServer;
