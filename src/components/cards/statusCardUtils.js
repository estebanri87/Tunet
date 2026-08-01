/**
 * Model for the status card.
 *
 * Each watched entity is its own entry:
 *   { id, entityId, label, activeStates, invert, activeText, inactiveText, alwaysShow }
 *
 * Whether an entry is "active" and what it then reads is decided per entry,
 * because a window, a lock and an alarm panel each report different states and
 * deserve different wording. `alwaysShow` keeps an entry visible in its
 * inactive state too, e.g. to display an alarm panel's status permanently.
 */

export const MAX_STATUS_ENTITIES = 60;

const INACTIVE_STATES = new Set(['off', 'closed', 'locked', 'unavailable', 'unknown', 'none', '']);

export const createStatusItemId = () =>
  `st-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * Entries of the card. Settings written before entries existed stored a plain
 * `entityIds` list plus card-wide options; those are migrated on read so an
 * existing card keeps working.
 */
export const getStatusItems = (settings) => {
  if (Array.isArray(settings?.items) && settings.items.length > 0) {
    return settings.items.filter((item) => item && typeof item === 'object' && item.entityId);
  }
  const legacyIds = Array.isArray(settings?.entityIds) ? settings.entityIds.filter(Boolean) : [];
  return legacyIds.map((entityId) => ({
    id: `legacy-${entityId}`,
    entityId,
    activeStates: settings?.activeStates || '',
    invert: settings?.invertSelection === true,
  }));
};

/** States counted as active, lower-cased; empty means "use the defaults". */
export const parseActiveStates = (raw) =>
  String(raw || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

/**
 * Without explicit states everything except off/closed/locked/unavailable
 * counts as active, which fits window contacts, covers and locks alike.
 */
export const isEntityActive = (entity, activeStates) => {
  const state = String(entity?.state ?? '').toLowerCase();
  if (activeStates.length > 0) return activeStates.includes(state);
  return !INACTIVE_STATES.has(state);
};

/** Whether one entry counts as active, honouring its own invert flag. */
export const isItemActive = (item, entity) => {
  const active = isEntityActive(entity, parseActiveStates(item?.activeStates));
  return item?.invert === true ? !active : active;
};

/**
 * Entries to render: the active ones plus those marked `alwaysShow`, sorted by
 * name. Each carries the text to display for its current state.
 */
export const resolveStatusEntries = (settings, entities) =>
  getStatusItems(settings)
    .map((item) => {
      const entity = entities?.[item.entityId];
      if (!entity) return null;
      const active = isItemActive(item, entity);
      const ownText = active ? item.activeText : item.inactiveText;
      return {
        id: item.id || item.entityId,
        entityId: item.entityId,
        entity,
        active,
        label: item.label?.trim() || entity.attributes?.friendly_name || item.entityId,
        // Falls back to the raw state so an unconfigured entry still says something.
        stateText: ownText?.trim() || entity.state,
        alwaysShow: item.alwaysShow === true,
      };
    })
    .filter(Boolean)
    .filter((entry) => entry.active || entry.alwaysShow)
    .sort((left, right) => left.label.localeCompare(right.label));
