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

import {
  createCustomItemId,
  formatItemValue,
  getEntityNumericValue,
  getRenderableCustomItems,
  normalizeCustomItems,
} from './customItems';

// Re-exported under the names the energy card already uses.
export const createEnergyItemId = createCustomItemId;
export const normalizeEnergyItems = normalizeCustomItems;
export const getRenderableEnergyItems = getRenderableCustomItems;
export const formatEnergyValue = formatItemValue;
export { getEntityNumericValue };

export const MAX_ENERGY_ITEMS = 8;
export const MAX_ENERGY_HEADER_ITEMS = 2;

/** Named colours kept for configurations written before free colours. */
export const ENERGY_THRESHOLD_COLOR_MAP = {
  red: 'var(--color-red-500)',
  amber: 'var(--color-amber-400)',
  green: 'var(--color-green-400)',
};

export const MIN_THRESHOLD_STEPS = 1;
export const MAX_THRESHOLD_STEPS = 6;

/** Suggested colours offered as swatches; any other value is allowed too. */
export const ENERGY_COLOR_SWATCHES = [
  '#ef4444',
  '#f97316',
  '#facc15',
  '#22c55e',
  '#14b8a6',
  '#38bdf8',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#94a3b8',
];

export const DEFAULT_ENERGY_COLOR_THRESHOLDS = [
  { limit: 20, color: '#ef4444' },
  { limit: 60, color: '#facc15' },
  { limit: 100, color: '#22c55e' },
];

/** Resolves a stored colour, which is either a legacy name or a CSS colour. */
export const resolveThresholdColor = (color) =>
  ENERGY_THRESHOLD_COLOR_MAP[color] || color || 'var(--accent-color)';

/** One to six steps, sorted by limit; anything unusable falls back to the defaults. */
export const normalizeEnergyThresholds = (thresholds) => {
  const source =
    Array.isArray(thresholds) && thresholds.length > 0
      ? thresholds.slice(0, MAX_THRESHOLD_STEPS)
      : DEFAULT_ENERGY_COLOR_THRESHOLDS;
  const cleaned = source
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => {
      const parsedLimit = parseFloat(item.limit);
      const fallback =
        DEFAULT_ENERGY_COLOR_THRESHOLDS[
          Math.min(index, DEFAULT_ENERGY_COLOR_THRESHOLDS.length - 1)
        ];
      return {
        limit: Number.isFinite(parsedLimit) ? parsedLimit : fallback.limit,
        color: item.color || fallback.color,
      };
    })
    .sort((a, b) => a.limit - b.limit);
  return cleaned.length ? cleaned : DEFAULT_ENERGY_COLOR_THRESHOLDS;
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
  return resolveThresholdColor(matched?.color || steps[steps.length - 1]?.color);
};
