import { createConnection, createLongLivedTokenAuth, subscribeEntities } from 'home-assistant-js-websocket';
import { WebSocket as NodeWebSocket } from 'ws';

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = NodeWebSocket;
}

/** Standard Supervisor-proxied address for Home Assistant Core, reachable
 * from inside any add-on container that has `homeassistant_api: true`. */
const SUPERVISOR_CORE_URL = 'http://supervisor/core';

let connectionPromise = null;
let latestEntities = {};
let previousEntities = {};
const entitySubscribers = new Set();

function getSupervisorToken() {
  return process.env.SUPERVISOR_TOKEN || '';
}

/**
 * Diffs two HAWS-merged entity maps. Relies on the standard, documented
 * home-assistant-js-websocket behavior (also relied on by HA's own native
 * frontend for render optimization): subscribeEntities only replaces the
 * object *reference* for entities that actually changed on a given update --
 * untouched entities keep the exact same reference across calls. So a cheap
 * `!==` check per key is a correct, efficient diff; no deep-equality needed.
 */
export function computeEntityDiff(prevEntities, nextEntities) {
  const changed = {};
  for (const id in nextEntities) {
    if (prevEntities[id] !== nextEntities[id]) changed[id] = nextEntities[id];
  }
  const removed = [];
  for (const id in prevEntities) {
    if (!(id in nextEntities)) removed.push(id);
  }
  return { changed, removed };
}

async function connect() {
  const token = getSupervisorToken();
  if (!token) {
    throw new Error(
      'SUPERVISOR_TOKEN is not set -- the Home Assistant relay only works when running as the add-on (homeassistant_api: true).'
    );
  }

  const auth = createLongLivedTokenAuth(SUPERVISOR_CORE_URL, token);
  const conn = await createConnection({ auth });

  conn.addEventListener('ready', () => {
    console.log('[ha-relay] connected to Home Assistant Core');
  });
  conn.addEventListener('disconnected', () => {
    console.warn('[ha-relay] disconnected from Home Assistant Core, reconnecting...');
  });

  subscribeEntities(conn, (entities) => {
    const diff = computeEntityDiff(previousEntities, entities);
    previousEntities = entities;
    latestEntities = entities;
    for (const callback of entitySubscribers) {
      try {
        callback({ full: entities, diff });
      } catch (err) {
        console.error('[ha-relay] entity subscriber threw:', err);
      }
    }
  });

  return conn;
}

/** Resolves to the single, shared, persistent HA Core connection, creating
 * it on first use. Reconnection after a drop is handled by HAWS itself. */
export function getHaRelayConnection() {
  if (!connectionPromise) {
    connectionPromise = connect().catch((err) => {
      connectionPromise = null; // allow the next caller to retry
      throw err;
    });
  }
  return connectionPromise;
}

/** Current full entity-state map, if the relay has connected at least once. */
export function getLatestEntities() {
  return latestEntities;
}

/** Registers a callback for every future entity-state update. Returns an
 * unsubscribe function. */
export function onEntitiesUpdate(callback) {
  entitySubscribers.add(callback);
  return () => entitySubscribers.delete(callback);
}

/** Diagnostic-only: number of still-registered entity subscribers. */
export function getEntitySubscriberCount() {
  return entitySubscribers.size;
}

/** Forwards an arbitrary Home Assistant websocket message (service calls,
 * history/statistics queries, registry lookups, return_response calls,
 * media browsing, ...) and resolves with HA's response. One relay
 * connection serves every browser client, so no per-client HA connections
 * are needed. */
export async function forwardMessage(payload) {
  const conn = await getHaRelayConnection();
  return conn.sendMessagePromise(payload);
}
