/**
 * Shared definitions for user-defined rows in entity popups.
 *
 * A row is stored in cardSettings as `{ id, label, type, entityId }` inside
 * the `customRows` array. `label` is free text, `type` decides how the row is
 * rendered and what a click does, `entityId` is any Home Assistant entity.
 */

export const CUSTOM_ROW_TYPES = ['toggle', 'status', 'action'];

/** Domains offered per row type. `null` means "no restriction". */
const ROW_TYPE_DOMAINS = {
  toggle: [
    'switch',
    'input_boolean',
    'light',
    'automation',
    'script',
    'lock',
    'fan',
    'siren',
    'humidifier',
    'cover',
  ],
  status: null,
  action: ['scene', 'script', 'button', 'input_button', 'automation'],
};

const getDomainsForRowType = (type) => ROW_TYPE_DOMAINS[type] ?? null;

/** Entity ids that make sense for a row of the given type, sorted by name. */
export const getEntityOptionsForRowType = (type, entities) => {
  const domains = getDomainsForRowType(type);
  const ids = Object.keys(entities || {}).filter(
    (id) => !domains || domains.includes(id.split('.')[0])
  );
  return ids.sort((a, b) => {
    const nameA = entities[a]?.attributes?.friendly_name || a;
    const nameB = entities[b]?.attributes?.friendly_name || b;
    return nameA.localeCompare(nameB);
  });
};

export const normalizeCustomRows = (rows) =>
  (Array.isArray(rows) ? rows : []).filter(
    (row) => row && typeof row === 'object' && CUSTOM_ROW_TYPES.includes(row.type)
  );

/** Rows that are ready to render: they need an entity that actually exists. */
export const getRenderableRows = (rows, entities, type) =>
  normalizeCustomRows(rows).filter(
    (row) => row.type === type && row.entityId && entities?.[row.entityId]
  );

/** Moves the item at `from` to index `to`, returning a new array. */
export const reorderRows = (rows, from, to) => {
  if (from === to || from < 0 || to < 0 || from >= rows.length || to >= rows.length) return rows;
  const next = [...rows];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

export const createRowId = () =>
  `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * Maps a toggle row onto the service call that flips it, honoring the domains
 * that do not follow the generic turn_on/turn_off contract.
 */
export const getToggleServiceCall = (entityId, isActive) => {
  const domain = entityId.split('.')[0];
  if (domain === 'lock') {
    return { domain: 'lock', service: isActive ? 'unlock' : 'lock' };
  }
  if (domain === 'cover') {
    return { domain: 'cover', service: isActive ? 'close_cover' : 'open_cover' };
  }
  return { domain: 'homeassistant', service: isActive ? 'turn_off' : 'turn_on' };
};

/** True when a toggle row's entity is currently in its "on" state. */
export const isToggleRowActive = (entityId, state) => {
  const domain = entityId.split('.')[0];
  if (domain === 'lock') return state === 'locked';
  if (domain === 'cover') return state === 'closed' || state === 'closing';
  return state === 'on' || state === 'open' || state === 'home' || state === 'active';
};

/** Maps an action row onto the service call that runs it. */
export const getActionServiceCall = (entityId) => {
  const domain = entityId.split('.')[0];
  if (domain === 'script') return { domain: 'script', service: 'turn_on' };
  if (domain === 'button' || domain === 'input_button') return { domain, service: 'press' };
  if (domain === 'automation') return { domain: 'automation', service: 'trigger' };
  return { domain: 'scene', service: 'turn_on' };
};
