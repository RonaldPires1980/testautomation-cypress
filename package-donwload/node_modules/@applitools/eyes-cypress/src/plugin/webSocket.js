const WebSocket = require('ws');
const {v4: uuid} = require('uuid');

function connectSocket(url) {
  const socket = new WebSocket(url);
  let passthroughListener;
  const listeners = new Map();
  const queue = new Set();
  let isReady = false;

  attach();

  function attach() {
    if (socket.readyState === WebSocket.CONNECTING) socket.on('open', () => attach(socket));
    else if (socket.readyState === WebSocket.OPEN) {
      isReady = true;
      queue.forEach(command => command());
      queue.clear();

      socket.on('message', message => {
        const {name, key, payload} = deserialize(message);
        const fns = listeners.get(name);
        const keyListeners = key && listeners.get(`${name}/${key}`);
        if (fns) fns.forEach(fn => fn(payload, key));
        if (keyListeners) keyListeners.forEach(fn => fn(payload, key));

        if (!fns && !keyListeners && passthroughListener) {
          passthroughListener(message);
        }
      });
    }
  }

  function disconnect() {
    if (!socket) return;
    socket.terminate();
    isReady = false;
    passthroughListener = null;
    queue.clear();
  }

  function setPassthroughListener(fn) {
    passthroughListener = fn;
  }

  function send(message) {
    const command = () => socket.send(message);
    if (isReady) command();
    else queue.add(command);
    return () => queue.delete(command);
  }

  function on(type, fn) {
    const name = typeof type === 'string' ? type : `${type.name}/${type.key}`;
    let fns = listeners.get(name);
    if (!fns) {
      fns = new Set();
      listeners.set(name, fns);
    }
    fns.add(fn);
    return () => off(name, fn);
  }

  function once(type, fn) {
    const off = on(type, (...args) => (fn(...args), off()));
    return off;
  }

  function off(name, fn) {
    if (!fn) return listeners.delete(name);
    const fns = listeners.get(name);
    if (!fns) return false;
    const existed = fns.delete(fn);
    if (!fns.size) listeners.delete(name);
    return existed;
  }

  function emit(type, payload) {
    return send(serialize(type, payload));
  }

  function request(name, payload) {
    return new Promise((resolve, reject) => {
      const key = uuid();
      emit({name, key}, payload);
      once({name, key}, response => {
        if (response.error) return reject(response.error);
        return resolve(response.result);
      });
    });
  }

  function ref() {
    const command = () => socket._socket.ref();
    if (isReady) command();
    else queue.add(command);
    return () => queue.delete(command);
  }

  function unref() {
    const command = () => socket._socket.unref();
    if (isReady) command();
    else queue.add(command);
    return () => queue.delete(command);
  }

  return {
    setPassthroughListener,
    send,
    on,
    once,
    off,
    request,
    disconnect,
    ref,
    unref,
  };
}

function serialize(type, payload) {
  const message =
    typeof type === 'string' ? {name: type, payload} : {name: type.name, key: type.key, payload};
  return JSON.stringify(message);
}

function deserialize(message) {
  return JSON.parse(message);
}

module.exports = connectSocket;
