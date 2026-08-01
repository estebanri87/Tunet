/**
 * Model for the status card: a set of entities of which only those in an
 * "active" state are listed, e.g. all windows configured but only the open
 * ones shown.
 */

export const MAX_STATUS_ENTITIES = 60;

const INACTIVE_STATES = new Set(['off', 'closed', 'locked', 'unavailable', 'unknown', 'none', '']);

/** Entity ids the card watches, as stored in cardSettings. */
export const getStatusEntityIds = (settings) =>
  Array.isArray(settings?.entityIds) ? settings.entityIds.filter(Boolean) : [];

/**
 * States counting as active. Left empty the card treats everything except
 * off/closed/locked/unavailable as active, which fits binary sensors, covers
 * and locks alike without configuration.
 */
export const parseActiveStates = (raw) =>
  String(raw || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

export const isEntityActive = (entity, activeStates) => {
  const state = String(entity?.state ?? '').toLowerCase();
  if (activeStates.length > 0) return activeStates.includes(state);
  return !INACTIVE_STATES.has(state);
};

/**
 * The entities to list, sorted by name. `invert` flips the selection so a card
 * can just as well show what is closed rather than what is open.
 */
export const resolveActiveEntities = (settings, entities) => {
  const activeStates = parseActiveStates(settings?.activeStates);
  const invert = settings?.invertSelection === true;

  return getStatusEntityIds(settings)
    .map((id) => ({ id, entity: entities?.[id] }))
    .filter(({ entity }) => !!entity)
    .filter(({ entity }) =>
      invert ? !isEntityActive(entity, activeStates) : isEntityActive(entity, activeStates)
    )
    .sort((left, right) => {
      const leftName = left.entity?.attributes?.friendly_name || left.id;
      const rightName = right.entity?.attributes?.friendly_name || right.id;
      return leftName.localeCompare(rightName);
    });
};

export const getEntityDisplayName = (id, entity) => entity?.attributes?.friendly_name || id;
