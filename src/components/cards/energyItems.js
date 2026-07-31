/**
 * Shared model for the compact layout of the energy card.
 *
 * The card shows a row of freely defined sensor readouts instead of the
 * flow diagram. Each item is stored as
 * `{ id, label, entityId, icon, min, max }` and is display-only — unlike the
 * cover rows there is no toggle or action type.
 *
 * Header items are the two large values above the row, e.g. produced and
 * consumed energy for the day.
 */

export const MAX_ENERGY_ITEMS = 8;
export const MAX_ENERGY_HEADER_ITEMS = 2;

export const ENERGY_THRESHOLD_COLOR_MAP = {
  red: 'var(--color-red-500)',
  amber: 'var(--color-amber-400)',
  green: 'var(--color-green-400)',
};

export const DEFAULT_ENERGY_COLOR_THRESHOLDS = [
  { limit: 20, color: 'red' },
  { limit: 60, color: 'amber' },
  { limit: 100, color: 'green' },
];

export const createEnergyItemId = () =>
  `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const isFilledObject = (item) => item && typeof item === 'object';

export const normalizeEnergyItems = (items) =>
  (Array.isArray(items) ? items : []).filter(isFilledObject);

/** Items ready to render: they need an entity that currently exists. */
export const getRenderableEnergyItems = (items, entities) =>
  normalizeEnergyItems(items).filter((item) => item.entityId && entities?.[item.entityId]);

/** Numeric state of an entity, or null when it is not a number. */
export const getEntityNumericValue = (entity) => {
  const raw = entity?.state;
  if (raw === undefined || raw === null || raw === 'unavailable' || raw === 'unknown') return null;
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : null;
};

/**
 * Value plus unit as shown on the card. Falls back to the raw state for
 * non-numeric sensors so text states stay readable.
 */
export const formatEnergyValue = (entity, decimals) => {
  const value = getEntityNumericValue(entity);
  const unit = entity?.attributes?.unit_of_measurement || '';
  if (value === null) {
    const raw = entity?.state;
    if (raw === undefined || raw === null || raw === 'unavailable' || raw === 'unknown') {
      return { text: '---', unit: '' };
    }
    return { text: String(raw), unit: '' };
  }
  const digits = Number.isFinite(Number(decimals)) ? Math.max(0, Math.min(3, Number(decimals))) : 1;
  return { text: value.toFixed(digits), unit };
};

export const normalizeEnergyThresholds = (thresholds) => {
  const source =
    Array.isArray(thresholds) && thresholds.length === 3
      ? thresholds
      : DEFAULT_ENERGY_COLOR_THRESHOLDS;
  return source
    .map((item, index) => {
      const parsedLimit = parseFloat(item?.limit);
      return {
        limit: Number.isFinite(parsedLimit)
          ? parsedLimit
          : DEFAULT_ENERGY_COLOR_THRESHOLDS[index].limit,
        color: item?.color || DEFAULT_ENERGY_COLOR_THRESHOLDS[index].color,
      };
    })
    .sort((a, b) => a.limit - b.limit);
};

/** Where the value sits between the item's min and max, as 0..1. */
export const getEnergyItemRatio = (value, item) => {
  if (value === null) return 0;
  const min = Number.isFinite(Number(item?.min)) ? Number(item.min) : 0;
  const max = Number.isFinite(Number(item?.max)) ? Number(item.max) : 100;
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
};

/**
 * Effective threshold settings for one item. Each readout carries its own
 * scale, because a value range that is "good" for one sensor says nothing
 * about another. Items configured before the per-item scale existed fall
 * back to the card-wide values, so their colours do not change.
 */
export const resolveItemThresholds = (item, cardSettings) => ({
  useThresholds: item?.useColorThresholds ?? cardSettings?.useColorThresholds ?? true,
  thresholds: item?.colorThresholds ?? cardSettings?.colorThresholds,
});

/**
 * Ring colour for one item. With thresholds enabled the percentage of the
 * item's range decides the step, mirroring how the sensor card colours its
 * gauge; otherwise the accent colour is used.
 */
export const getEnergyItemColor = (value, item, cardSettings) => {
  const { useThresholds, thresholds } = resolveItemThresholds(item, cardSettings);
  if (!useThresholds || value === null) return 'var(--accent-color)';
  const percent = getEnergyItemRatio(value, item) * 100;
  const steps = normalizeEnergyThresholds(thresholds);
  const matched = steps.find((step) => percent <= step.limit);
  const color = matched?.color || steps[steps.length - 1]?.color;
  return ENERGY_THRESHOLD_COLOR_MAP[color] || 'var(--accent-color)';
};
