/* global WebSocket */
const uuid = require('uuid');

class Socket {
  constructor() {
    this._socket = null;
    this._listeners = new Map();
    this._queue = new Set();
  }

  attach(ws) {
    if (!ws) return;

    if (ws.readyState === WebSocket.CONNECTING) ws.addEventListener('open', () => this.attach(ws));
    else if (ws.readyState === WebSocket.OPEN) {
      this._socket = ws;
      this._queue.forEach(command => command());
      this._queue.clear();

      this._socket.addEventListener('message', message => {
        const {name, key, payload} = this.deserialize(message);
        const fns = this._listeners.get(name);
        if (fns) fns.forEach(fn => fn(payload, key));
        if (key) {
          const fns = this._listeners.get(`${name}/${key}`);
          if (fns) fns.forEach(fn => fn(payload, key));
        }
      });
      this._socket.addEventListener('close', () => {
        const fns = this._listeners.get('close');
        if (fns) fns.forEach(fn => fn());
      });
    }
  }

  on(type, fn) {
    const name = typeof type === 'string' ? type : `${type.name}/${type.key}`;
    let fns = this._listeners.get(name);
    if (!fns) {
      fns = new Set();
      this._listeners.set(name, fns);
    }
    fns.add(fn);
    return () => this.off(name, fn);
  }

  connect(url) {
    const ws = new WebSocket(url);
    this.attach(ws);
  }

  disconnect() {
    if (!this._socket) return;
    this._socket.terminate();
    this._socket = null;
  }

  request(name, payload) {
    return new Promise((resolve, reject) => {
      try {
        const key = uuid.v4();
        this.emit({name, key}, payload);
        this.once({name, key}, response => {
          if (response.error) return reject(response.error);
          return resolve(response.result);
        });
      } catch (ex) {
        console.log(ex);
        throw ex;
      }
    });
  }

  command(name, fn) {
    this.on(name, async (payload, key) => {
      try {
        const result = await fn(payload);
        this.emit({name, key}, {result});
      } catch (error) {
        console.log(error);
        this.emit({name, key}, {error});
      }
    });
  }

  subscribe(name, publisher, fn) {
    const subscription = uuid.v4();
    this.emit(name, {publisher, subscription});
    const off = this.on({name, key: subscription}, fn);
    return () => (this.emit({name, key: subscription}), off());
  }

  once(type, fn) {
    const off = this.on(type, (...args) => (fn(...args), this.off()));
    return off;
  }

  off(name, fn) {
    if (!fn) return this._listeners.delete(name);
    const fns = this._listeners.get(name);
    if (!fns) return false;
    const existed = fns.delete(fn);
    if (!fns.size) this._listeners.delete(name);
    return existed;
  }

  emit(type, payload) {
    try {
      const command = () => this._socket.send(this.serialize(type, payload));
      if (this._socket) command();
      else this._queue.add(command);
      return () => this._queue.delete(command);
    } catch (ex) {
      console.log(ex);
      throw ex;
    }
  }

  ref() {
    const command = () => this._socket._socket.ref();
    if (this._socket) command();
    else this._queue.add(command);
    return () => this._queue.delete(command);
  }

  unref() {
    const command = () => this._socket._socket.unref();
    if (this._socket) command();
    else this._queue.add(command);
    return () => this._queue.delete(command);
  }

  serialize(type, payload) {
    const message =
      typeof type === 'string' ? {name: type, payload} : {name: type.name, key: type.key, payload};
    return JSON.stringify(message);
  }

  deserialize(message) {
    return JSON.parse(message.data);
  }
}

module.exports = Socket;
