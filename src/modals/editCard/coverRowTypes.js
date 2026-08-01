/**
 * Cover-specific settings: position and tilt presets, plus the tilt override.
 * The row model itself is shared with the other entity popups.
 */

import { CUSTOM_ROW_TYPES } from './customRows';

export * from './customRows';
export const COVER_ROW_TYPES = CUSTOM_ROW_TYPES;

export const DEFAULT_POSITION_PRESETS = [0, 25, 50, 75, 100];
export const DEFAULT_TILT_PRESETS = [0, 50, 100];
export const MAX_PRESETS = 8;

/**
 * Sorted, de-duplicated whole percentages. Only an absent value falls back to
 * the defaults — an empty array means the user removed every preset on purpose
 * and the button row is hidden instead of silently reappearing.
 */
export const normalizePresets = (values, fallback) => {
  if (!Array.isArray(values)) return fallback;
  return [
    ...new Set(
      values
        .map((value) => Math.round(Number(value)))
        .filter((value) => Number.isFinite(value) && value >= 0 && value <= 100)
    ),
  ]
    .sort((a, b) => a - b)
    .slice(0, MAX_PRESETS);
};

/**
 * Whether the popup shows slat (tilt) controls. Integrations are not always
 * honest about this — roller shutters that report OPEN_TILT/CLOSE_TILT do
 * exist — so the automatic detection can be overridden per card.
 */
export const TILT_MODES = ['auto', 'always', 'never'];

export const resolveShowTilt = (mode, detected) => {
  if (mode === 'always') return true;
  if (mode === 'never') return false;
  return detected;
};
