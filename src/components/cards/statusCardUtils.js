/**
 * Model for the status card.
 *
 * An entry stands for one thing in the home — a window, a door, the alarm
 * panel — and can watch several entities at once:
 *
 *   { id, label, inactiveText, alwaysShow,
 *     sources: [{ id, entityId, activeStates, activeText, invert }],
 *     rules:   [{ id, text, conditions: { [sourceId]: 'active'|'inactive'|'any' } }] }
 *
 * Several sources exist because one window often has separate contacts for
 * "open" and "tilted". Which combination means what is spelled out by the
 * rules: a rule matches when every one of its conditions holds, and the first
 * matching rule provides the wording. Without rules the first active source
 * wins, which keeps the single-sensor case simple.
 */

export const MAX_STATUS_ENTITIES = 60;
export const MAX_STATUS_SOURCES = 4;

const INACTIVE_STATES = new Set(['off', 'closed', 'locked', 'unavailable', 'unknown', 'none', '']);

export const createStatusItemId = () =>
  `st-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const createStatusSource = () => ({ id: createStatusItemId(), entityId: null });

/** Sources of an entry, migrating the single-entity shape used before. */
export const getItemSources = (item) => {
  if (Array.isArray(item?.sources) && item.sources.length > 0) {
    return item.sources.filter((source) => source && typeof source === 'object');
  }
  if (item?.entityId) {
    return [
      {
        id: `${item.id || item.entityId}-src`,
        entityId: item.entityId,
        activeStates: item.activeStates,
        activeText: item.activeText,
        invert: item.invert,
      },
    ];
  }
  return [createStatusSource()];
};

/**
 * Entries of the card. Older settings stored a plain `entityIds` list plus
 * card-wide options; those are migrated on read so existing cards keep working.
 *
 * Entries without an entity are kept — the editor needs to show a new, still
 * empty entry; the card filters them out when rendering.
 */
export const getStatusItems = (settings) => {
  if (Array.isArray(settings?.items) && settings.items.length > 0) {
    return settings.items.filter((item) => item && typeof item === 'object');
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

/** Whether one source counts as active, honouring its own invert flag. */
export const isSourceActive = (source, entity) => {
  if (!entity) return false;
  const active = isEntityActive(entity, parseActiveStates(source?.activeStates));
  return source?.invert === true ? !active : active;
};

export const createStatusRule = () => ({ id: createStatusItemId(), text: '', conditions: {} });

export const getItemRules = (item) =>
  (Array.isArray(item?.rules) ? item.rules : []).filter((rule) => rule && typeof rule === 'object');

/**
 * A rule matches when every condition holds. Sources set to 'any' — and
 * conditions naming a source that no longer exists — are ignored.
 */
export const matchesRule = (rule, sources, entities) => {
  const conditions = rule?.conditions || {};
  const relevant = sources.filter((source) => {
    const expected = conditions[source.id];
    return expected === 'active' || expected === 'inactive';
  });
  if (relevant.length === 0) return false;

  return relevant.every((source) => {
    const entity = entities?.[source.entityId];
    if (!entity) return false;
    const active = isSourceActive(source, entity);
    return conditions[source.id] === 'active' ? active : !active;
  });
};

/**
 * Entries to render: those with an active source plus the ones marked
 * `alwaysShow`, sorted by name. Each carries the text for its current state.
 */
export const resolveStatusEntries = (settings, entities) =>
  getStatusItems(settings)
    .map((item) => {
      const sources = getItemSources(item).filter(
        (source) => source.entityId && entities?.[source.entityId]
      );
      if (sources.length === 0) return null;

      const primary = entities[sources[0].entityId];
      const fallbackName = primary?.attributes?.friendly_name || sources[0].entityId;

      // Rules decide first; without them the first active source wins.
      const rules = getItemRules(item);
      const matchedRule = rules.find((rule) => matchesRule(rule, sources, entities));
      const activeSource = rules.length
        ? null
        : sources.find((source) => isSourceActive(source, entities[source.entityId]));
      const active = !!matchedRule || !!activeSource;

      let stateText;
      if (matchedRule) {
        stateText = matchedRule.text?.trim() || entities[sources[0].entityId].state;
      } else if (activeSource) {
        // Falls back to the raw state so an unconfigured entry still says something.
        stateText = activeSource.activeText?.trim() || entities[activeSource.entityId].state;
      } else {
        stateText = item.inactiveText?.trim() || primary?.state || '';
      }

      return {
        id: item.id || sources[0].entityId,
        active,
        label: item.label?.trim() || fallbackName,
        stateText,
        alwaysShow: item.alwaysShow === true,
      };
    })
    .filter(Boolean)
    .filter((entry) => entry.active || entry.alwaysShow)
    .sort((left, right) => left.label.localeCompare(right.label));
