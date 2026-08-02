import { useMemo } from 'react';

/**
 * Fixed, house-wide entity IDs for the solar-surplus calculation.
 * These are shared across every solar_appliance_card_ instance so the
 * recommendation logic stays consistent regardless of which (if any)
 * solar_system_card_/solar_forecast_card_ instances the user has added.
 */
export const SURPLUS_ENTITY_IDS = {
  mainPvPower: 'sensor.technikraum_wechselrichter_gw12k_et_20_pv_power',
  bkwPvPower: 'sensor.bkw_garage_pv_power',
  houseLoad: 'sensor.wirkleistung_haus',
  gridPower: 'sensor.smart_meter_aktuelle_gesamtwirkleistung',
  forecastNextHour: [
    'sensor.energy_next_hour',
    'sensor.energy_next_hour_2',
    'sensor.energy_next_hour_3',
  ],
};

export function getNumericState(entity) {
  const raw = entity?.state;
  if (raw === undefined || raw === null || raw === 'unavailable' || raw === 'unknown') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/**
 * Computes the current solar-surplus picture for the whole house and a
 * `classify(typicalWattage)` helper that tiers an appliance's recommendation
 * as 'now' | 'soon' | 'wait'.
 *
 * No battery-charging reservation: the inverter/EMS already manages battery
 * priority itself, so surplus here is the raw PV-minus-house-load figure.
 */
export default function useSolarSurplusData(entities) {
  return useMemo(() => {
    const mainPv = getNumericState(entities?.[SURPLUS_ENTITY_IDS.mainPvPower]) ?? 0;
    const bkwPv = getNumericState(entities?.[SURPLUS_ENTITY_IDS.bkwPvPower]) ?? 0;
    const totalPv = mainPv + bkwPv;

    const houseLoad = getNumericState(entities?.[SURPLUS_ENTITY_IDS.houseLoad]) ?? 0;
    const gridPower = getNumericState(entities?.[SURPLUS_ENTITY_IDS.gridPower]);

    const availableSurplusW = Math.max(0, totalPv - houseLoad);

    // Forecast.Solar "next hour" energy (kWh) summed across all instances,
    // used as an approximation of the average W over the coming hour --
    // not a precise physical prediction.
    const forecastNextHourKwh = SURPLUS_ENTITY_IDS.forecastNextHour.reduce((sum, id) => {
      const value = getNumericState(entities?.[id]);
      return sum + (value ?? 0);
    }, 0);
    const forecastNextHourAvgW = forecastNextHourKwh * 1000;

    const classify = (typicalWattage) => {
      const watts = Number(typicalWattage);
      if (!Number.isFinite(watts) || watts <= 0) return 'wait';
      if (availableSurplusW >= watts) return 'now';
      if (forecastNextHourAvgW >= watts) return 'soon';
      return 'wait';
    };

    return {
      totalPv,
      mainPv,
      bkwPv,
      houseLoad,
      gridPower,
      availableSurplusW,
      forecastNextHourAvgW,
      classify,
    };
  }, [entities]);
}
