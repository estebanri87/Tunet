/**
 * A minimal, `conn`-compatible object backed by Nyx's own backend relay
 * WebSocket, instead of a direct connection to Home Assistant Core.
 *
 * Used only when the dashboard is accessed through Home Assistant Ingress,
 * where OAuth cannot complete (HA's own auth server rejects ingress
 * redirect URIs) and a personal Long-Lived Access Token would otherwise
 * have to be re-entered on every new device. The backend authenticates
 * once using its own Supervisor-provided token and multiplexes every
 * connected browser through that one connection.
 *
 * Implements only what's actually used elsewhere in the app: an entity
 * subscription (via `onEntities`, consumed by HomeAssistantContext instead
 * of HAWS's `subscribeEntities`, since this isn't a real HAWS Connection),
 * `sendMessagePromise` (used throughout via haClient.js and directly in a
 * few modals), and `addEventListener`/`removeEventListener` for
 * 'ready'/'disconnected'.
 */

/** Resolves `./api/ws-relay` against the current page URL (inheriting any
 * Ingress path prefix, exactly like the existing `./api` REST calls do),
 * then swaps the scheme to ws/wss -- the WebSocket constructor requires an
 * already-ws(s) URL, it won't do that swap for a relative path itself. */
function buildRelayUrl() {
  const resolved = new URL('./api/ws-relay', globalThis.window.location.href);
  resolved.protocol = resolved.protocol === 'https:' ? 'wss:' : 'ws:';
  return resolved.toString();
}

export function createRelayConnection() {
  return new Promise((resolve, reject) => {
    let settled = false;
    let nextId = 1;
    const pending = new Map();
    const listeners = { ready: new Set(), disconnected: new Set() };
    let entitiesCallback = null;

    const notify = (type) => {
      for (const callback of listeners[type]) {
        try {
          callback();
        } catch (err) {
          console.error(`[ha-relay] "${type}" listener threw:`, err);
        }
      }
    };

    const conn = {
      sendMessagePromise(payload) {
        return new Promise((res, rej) => {
          const id = nextId++;
          pending.set(id, { resolve: res, reject: rej });
          ws.send(JSON.stringify({ type: 'forward', id, payload }));
        });
      },
      addEventListener(type, callback) {
        listeners[type]?.add(callback);
      },
      removeEventListener(type, callback) {
        listeners[type]?.delete(callback);
      },
      /** Relay-specific: not part of the HAWS Connection API. Returns an
       * unsubscribe function, mirroring HAWS's own `subscribeEntities`. */
      onEntities(callback) {
        entitiesCallback = callback;
        return () => {
          if (entitiesCallback === callback) entitiesCallback = null;
        };
      },
      close() {
        ws.close();
      },
    };

    let ws;
    let localEntities = {};
    try {
      ws = new globalThis.WebSocket(buildRelayUrl());
    } catch (err) {
      reject(err);
      return;
    }

    ws.addEventListener('message', (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      if (message.type === 'entities') {
        localEntities = message.data;
        if (!settled) {
          settled = true;
          resolve(conn);
          notify('ready');
        }
        entitiesCallback?.(localEntities);
        return;
      }

      // Every update after the initial snapshot arrives as a compact diff
      // (only changed/removed entity_ids) instead of the full merged map --
      // reconstruct the full map locally so callers keep receiving the same
      // "full entities object" shape HAWS's own subscribeEntities provides.
      if (message.type === 'entities_diff') {
        if (!settled) return; // shouldn't happen before a full snapshot; ignore defensively
        const next = { ...localEntities, ...(message.changed || {}) };
        for (const id of message.removed || []) {
          delete next[id];
        }
        localEntities = next;
        entitiesCallback?.(localEntities);
        return;
      }

      if (message.type === 'response') {
        const request = pending.get(message.id);
        pending.delete(message.id);
        request?.resolve(message.result);
        return;
      }

      if (message.type === 'error') {
        if (message.id === null && !settled) {
          settled = true;
          reject(new Error(message.error || 'Relay could not reach Home Assistant'));
          return;
        }
        const request = pending.get(message.id);
        pending.delete(message.id);
        request?.reject(new Error(message.error || 'Relay request failed'));
      }
    });

    ws.addEventListener('close', () => {
      for (const request of pending.values()) {
        request.reject(new Error('Relay connection closed'));
      }
      pending.clear();
      if (!settled) {
        settled = true;
        reject(new Error('Relay connection closed before it became ready'));
        return;
      }
      notify('disconnected');
    });

    ws.addEventListener('error', () => {
      if (!settled) {
        settled = true;
        reject(new Error('Failed to connect to the Nyx backend relay'));
      }
    });
  });
}
