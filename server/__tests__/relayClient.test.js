// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';

const OPEN = 1;

const createMockWs = () => ({
  readyState: OPEN,
  OPEN,
  bufferedAmount: 0,
  send: vi.fn(),
  on: vi.fn(),
});

const flushMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

afterEach(() => {
  vi.doUnmock('../haRelay.js');
  vi.resetModules();
});

describe('handleRelayClient', () => {
  it('sends a full snapshot on connect, diffs on subsequent updates, and resyncs with a full snapshot after a backpressure skip', async () => {
    const fullEntitiesA = { 'light.a': { state: 'on' } };
    const fullEntitiesB = { 'light.a': { state: 'off' } };
    const fullEntitiesC = { 'light.a': { state: 'on' } };

    let updateCallback;
    const unsubscribe = vi.fn();

    vi.resetModules();
    vi.doMock('../haRelay.js', () => ({
      getHaRelayConnection: vi.fn().mockResolvedValue({}),
      getLatestEntities: vi.fn().mockReturnValue(fullEntitiesA),
      onEntitiesUpdate: vi.fn((cb) => {
        updateCallback = cb;
        return unsubscribe;
      }),
      forwardMessage: vi.fn(),
    }));

    const { handleRelayClient } = await import('../index.js');
    const ws = createMockWs();

    handleRelayClient(ws);
    await flushMicrotasks();

    // Initial connect always gets one full snapshot.
    expect(ws.send).toHaveBeenCalledTimes(1);
    expect(JSON.parse(ws.send.mock.calls[0][0])).toEqual({
      type: 'entities',
      data: fullEntitiesA,
    });

    // A subsequent HA change sends a compact diff, not the full map.
    updateCallback({
      full: fullEntitiesB,
      diff: { changed: { 'light.a': fullEntitiesB['light.a'] }, removed: [] },
    });
    expect(ws.send).toHaveBeenCalledTimes(2);
    expect(JSON.parse(ws.send.mock.calls[1][0])).toEqual({
      type: 'entities_diff',
      changed: { 'light.a': fullEntitiesB['light.a'] },
      removed: [],
    });

    // Client falls behind (congested socket): this update must be skipped entirely.
    ws.bufferedAmount = 5 * 1024 * 1024;
    updateCallback({
      full: fullEntitiesC,
      diff: { changed: { 'light.a': fullEntitiesC['light.a'] }, removed: [] },
    });
    expect(ws.send).toHaveBeenCalledTimes(2);

    // Once the client can receive again, it must get a full resync, never a
    // diff computed against a state it never actually received.
    ws.bufferedAmount = 0;
    updateCallback({
      full: fullEntitiesC,
      diff: { changed: { 'light.a': fullEntitiesC['light.a'] }, removed: [] },
    });
    expect(ws.send).toHaveBeenCalledTimes(3);
    expect(JSON.parse(ws.send.mock.calls[2][0])).toEqual({
      type: 'entities',
      data: fullEntitiesC,
    });
  });

  it('skips sending when a diff has no actual changes', async () => {
    const fullEntitiesA = { 'light.a': { state: 'on' } };
    let updateCallback;

    vi.resetModules();
    vi.doMock('../haRelay.js', () => ({
      getHaRelayConnection: vi.fn().mockResolvedValue({}),
      getLatestEntities: vi.fn().mockReturnValue(fullEntitiesA),
      onEntitiesUpdate: vi.fn((cb) => {
        updateCallback = cb;
        return vi.fn();
      }),
      forwardMessage: vi.fn(),
    }));

    const { handleRelayClient } = await import('../index.js');
    const ws = createMockWs();

    handleRelayClient(ws);
    await flushMicrotasks();
    expect(ws.send).toHaveBeenCalledTimes(1);

    updateCallback({ full: fullEntitiesA, diff: { changed: {}, removed: [] } });
    expect(ws.send).toHaveBeenCalledTimes(1);
  });
});
