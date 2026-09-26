import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class Element {
  constructor() { this.value = ''; this.listeners = {}; this.dataset = {}; this.textContent = ''; }
  addEventListener(type, callback) { this.listeners[type] = callback; }
  appendChild() {}
  insertAdjacentElement() {}
}
const nodes = new Map();
const node = (selector) => {
  if (!nodes.has(selector)) nodes.set(selector, new Element());
  return nodes.get(selector);
};
const section = new Element();
section.querySelector = node;
let fetchHandler;
const requests = [];
const window = {
  ThreadsAccountRegistry: { list: () => [] },
  ThreadsPersistenceProfileState: { listStored: () => [], get: () => ({ status: 'planned' }) },
};
const sandbox = { window, document: { querySelector: node, createElement: () => section },
  localStorage: { getItem: () => null },
  fetch: (...args) => { requests.push(args); return fetchHandler(...args); },
  console,
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL('../app/features/persistence/state/state-model.js', import.meta.url), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(new URL('../app/features/persistence/state/state-bridge.js', import.meta.url), 'utf8'), sandbox);
const bridge = window.ThreadsPersistenceBridge;
const response = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
fetchHandler = async () => response(409, { currentRevision: 7, message: 'conflict' });
await assert.rejects(bridge.saveServer(), /충돌/);
await assert.rejects(bridge.saveServer(), /충돌/);
assert.equal(JSON.parse(requests.at(-1)[1].body).expectedRevision, 0, 'A conflict must not silently grant permission to overwrite the newer revision');
fetchHandler = async () => response(200, { ok: true, revision: 7, snapshot: null });
await bridge.readServer();
fetchHandler = async () => response(200, { ok: true, revision: 8 });
await bridge.saveServer();
assert.equal(JSON.parse(requests.at(-1)[1].body).expectedRevision, 7);

let resolveRequest;
fetchHandler = () => new Promise((resolve) => { resolveRequest = resolve; });
const pending = bridge.readServer();
node('#persistenceNamespace').value = 'TH-A';
node('#persistenceNamespace').listeners.change();
resolveRequest(response(200, { ok: true, revision: 99, snapshot: null }));
await pending;
assert.equal(node('#persistenceRevision').textContent, 'TH-A · SERVER r0', 'A delayed response must not change another namespace\'s revision');
assert.equal(node('[data-persist="apply"]').disabled, true);
console.log('Persistence bridge conflict and asynchronous namespace isolation passed.');
