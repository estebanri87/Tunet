/**
 * Shared model for user-defined sensor readouts on cards.
 *
 * An item is stored as `{ id, label, entityId, icon }` plus whatever the
 * consuming card adds (ranges, decimals, thresholds). Items are display-only:
 * they never switch anything, so there is no type distinction.
 *
 * Used by the compact energy card and the weather card.
 */

export const createCustomItemId = () =>
  `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const normalizeCustomItems = (items) =>
  (Array.isArray(items) ? items : []).filter((item) => item && typeof item === 'object');

/** Items ready to render: they need an entity that currently exists. */
export const getRenderableCustomItems = (items, entities) =>
  normalizeCustomItems(items).filter((item) => item.entityId && entities?.[item.entityId]);

/** Numeric state of an entity, or null when it is not a number. */
export const getEntityNumericValue = (entity) => {
  const raw = entity?.state;
  if (raw === undefined || raw === null || raw === 'unavailable' || raw === 'unknown') return null;
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : null;
};

/**
 * Value plus unit as shown on a card.
 *
 * @param {any} entity
 * @param {{decimals?: any, onText?: string, offText?: string}} [options]
 *   `onText`/`offText` replace the raw on/off state of a binary sensor with
 *   the user's own wording, e.g. "Aktiv" / "Nicht aktiv".
 */
export const formatItemValue = (entity, options = {}) => {
  const { decimals, onText, offText } = options;
  const raw = entity?.state;

  if (raw === 'on' && onText?.trim()) return { text: onText.trim(), unit: '' };
  if (raw === 'off' && offText?.trim()) return { text: offText.trim(), unit: '' };

  const value = getEntityNumericValue(entity);
  const unit = entity?.attributes?.unit_of_measurement || '';
  if (value === null) {
    if (raw === undefined || raw === null || raw === 'unavailable' || raw === 'unknown') {
      return { text: '---', unit: '' };
    }
    return { text: String(raw), unit: '' };
  }
  const digits = Number.isFinite(Number(decimals)) ? Math.max(0, Math.min(3, Number(decimals))) : 1;
  return { text: value.toFixed(digits), unit };
};

/** Label shown for an item: the user's own text, else the entity name. */
export const getItemLabel = (item, entities) =>
  item.label?.trim() || entities?.[item.entityId]?.attributes?.friendly_name || item.entityId;

/**
 * Condition driving the weather animation. Stations that report rain through
 * their own sensor can point at it here; the animation itself is unchanged.
 * A binary sensor counts as rain when it is on, a numeric one once it exceeds
 * the configured threshold (0 by default).
 */
export const resolveEffectCondition = (weatherState, settings, entities) => {
  const rainEntity = settings?.rainEntityId ? entities?.[settings.rainEntityId] : null;
  if (!rainEntity) return weatherState;

  const raw = rainEntity.state;
  if (raw === 'unavailable' || raw === 'unknown' || raw === undefined || raw === null) {
    return weatherState;
  }

  const threshold = Number.isFinite(Number(settings.rainThreshold))
    ? Number(settings.rainThreshold)
    : 0;
  const numeric = parseFloat(raw);
  const isRaining = Number.isFinite(numeric) ? numeric > threshold : raw === 'on';

  // Only force rain on; when the sensor is dry the weather entity still decides,
  // so snow, fog and the rest keep working.
  return isRaining ? 'rainy' : weatherState;
};
