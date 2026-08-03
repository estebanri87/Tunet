import { beforeEach, describe, expect, it } from 'vitest';
import { createRelayConnection } from '../services/haRelayConnection';

class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.listeners = {};
  }
  addEventListener(type, callback) {
    (this.listeners[type] ||= []).push(callback);
  }
  removeEventListener(type, callback) {
    this.listeners[type] = (this.listeners[type] || []).filter((cb) => cb !== callback);
  }
  send() {}
  close() {}
}

let instances;

const emitMessage = (ws, payload) => {
  const event = { data: JSON.stringify(payload) };
  for (const callback of ws.listeners.message || []) callback(event);
};

beforeEach(() => {
  instances = [];
  globalThis.WebSocket = class extends MockWebSocket {
    constructor(url) {
      super(url);
      instances.push(this);
    }
  };
});

describe('createRelayConnection entity diff handling', () => {
  it('merges an entities_diff frame into the locally reconstructed entity map', async () => {
    const connPromise = createRelayConnection();
    const ws = instances[0];

    emitMessage(ws, { type: 'entities', data: { 'light.a': { state: 'on' } } });
    const conn = await connPromise;

    const received = [];
    conn.onEntities((entities) => received.push(entities));

    emitMessage(ws, {
      type: 'entities_diff',
      changed: { 'light.b': { state: 'off' } },
      removed: [],
    });

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({
      'light.a': { state: 'on' },
      'light.b': { state: 'off' },
    });
  });

  it('applies removed entity_ids from an entities_diff frame', async () => {
    const connPromise = createRelayConnection();
    const ws = instances[0];

    emitMessage(ws, {
      type: 'entities',
      data: { 'light.a': { state: 'on' }, 'light.b': { state: 'off' } },
    });
    const conn = await connPromise;

    const received = [];
    conn.onEntities((entities) => received.push(entities));

    emitMessage(ws, { type: 'entities_diff', changed: {}, removed: ['light.a'] });

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ 'light.b': { state: 'off' } });
  });

  it('keeps untouched entity references identical across diff applications', async () => {
    const connPromise = createRelayConnection();
    const ws = instances[0];

    emitMessage(ws, {
      type: 'entities',
      data: { 'light.a': { state: 'on' }, 'light.b': { state: 'off' } },
    });
    const conn = await connPromise;

    const received = [];
    conn.onEntities((entities) => received.push(entities));

    // light.a is untouched by either diff -- its reference must stay
    // identical across both applications, so downstream reference-equality
    // checks (e.g. React memoization) don't treat it as changed.
    emitMessage(ws, { type: 'entities_diff', changed: { 'light.b': { state: 'on' } }, removed: [] });
    emitMessage(ws, { type: 'entities_diff', changed: { 'light.b': { state: 'off' } }, removed: [] });

    expect(received).toHaveLength(2);
    expect(received[1]['light.a']).toBe(received[0]['light.a']);
  });

  it('applies multiple successive diffs cumulatively', async () => {
    const connPromise = createRelayConnection();
    const ws = instances[0];

    emitMessage(ws, { type: 'entities', data: { 'light.a': { state: 'on' } } });
    const conn = await connPromise;

    const received = [];
    conn.onEntities((entities) => received.push(entities));

    emitMessage(ws, {
      type: 'entities_diff',
      changed: { 'light.b': { state: 'off' } },
      removed: [],
    });
    emitMessage(ws, { type: 'entities_diff', changed: {}, removed: ['light.a'] });

    expect(received).toHaveLength(2);
    expect(received[1]).toEqual({ 'light.b': { state: 'off' } });
  });
});
