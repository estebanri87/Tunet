/**
 * Shared configuration for card size (row-span) tiers.
 *
 * Single source of truth used by:
 *  - src/utils/gridLayout.js (computes the actual row span for the grid)
 *  - src/components/ui/EditOverlay.jsx (cycles through sizes via the resize button)
 */

/** Ordered list of size tiers a resizable card cycles through. */
export const SIZE_STEPS = ['small', 'medium', 'large', 'full'];

/**
 * Row-span (grid rows) per tier, keyed by card category.
 *  - compact: legacy "dualSize" cards. Unset size renders at 2 rows (unchanged
 *    from legacy behaviour); "large"/"full" are new, larger tiers.
 *  - expansive: calendar/todo cards. Unset size renders at the largest tier
 *    (unchanged from legacy behaviour); "large" now sits between "medium" and
 *    the new "full" tier.
 */
export const SIZE_SPAN_TABLE = {
  compact: { small: 1, medium: 2, large: 3, full: 4, default: 2 },
  expansive: { small: 1, medium: 2, large: 3, full: 4, default: 4 },
};

/** Card-id prefixes that use the "expansive" category (largest by default). */
export const EXPANSIVE_SIZE_PREFIXES = ['calendar_card_', 'todo_card_'];

/** Card-id prefixes that support the size-cycle resize control. */
export const RESIZABLE_PREFIXES = [
  ...EXPANSIVE_SIZE_PREFIXES,
  'light_',
  'light.',
  'lock_card_',
  'lock.',
  'vacuum.',
  'lawn_mower.',
  'automation.',
  'climate_card_',
  'cost_card_',
  'weather_temp_',
  'androidtv_card_',
  'car_card_',
  'room_card_',
  'camera_card_',
  'spacer_card_',
  'cover_card_',
  'alarm_card_',
  'fan.',
  'fan_card_',
  'nordpool_card_',
  'energy_flow_',
  'sonos_group_',
  'solar_system_card_',
  'solar_forecast_card_',
  'water_heater_card_',
  'solar_appliance_card_',
];

/** Returns the next size in the cycle small → medium → large → full → small. */
export function getNextSize(currentSize) {
  const currentIndex = SIZE_STEPS.indexOf(currentSize);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % SIZE_STEPS.length;
  return SIZE_STEPS[nextIndex];
}
