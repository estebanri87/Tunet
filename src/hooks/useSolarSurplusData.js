import { useMemo } from 'react';
import usePvIrradianceRatio from './usePvIrradianceRatio';

/**
 * Fixed, house-wide entity IDs for the solar-surplus calculation.
 * These are shared across every solar_appliance_card_ instance so the
 * recommendation logic stays consistent regardless of which (if any)
 * solar_system_card_/solar_forecast_card_ instances the user has added.
 *
 * `sensor.wirkleistung_haus` and the GoodWe inverter's own
 * `..._house_consumption` sensor were both tried as a "house load" source
 * and dropped: live checks showed the former tracking the grid meter
 * almost 1:1 (not real consumption) and the latter going negative during
 * PV surplus. Neither is used here.
 */
export const SURPLUS_ENTITY_IDS = {
  mainPvPower: 'sensor.technikraum_wechselrichter_gw12k_et_20_pv_power',
  bkwPvPower: 'sensor.bkw_garage_pv_power',
  gridPower: 'sensor.smart_meter_aktuelle_gesamtwirkleistung',
  mainBatteryPower: 'sensor.technikraum_wechselrichter_gw12k_et_20_battery_power',
  mainBatteryMode: 'sensor.technikraum_wechselrichter_gw12k_et_20_battery_mode',
  houseLoadForecast: 'sensor.technikraum_wechselrichter_gw12k_et_20_hauslast_mittel_24h_lastprognose',
  irradianceForecast: 'sensor.neckargemuend_kleing_sonneneinstrahlung',
};

/** Below this W/m² the PV-per-irradiance calibration ratio gets too noisy (dawn/dusk). */
const MIN_IRRADIANCE_FOR_CALIBRATION = 100;

/**
 * Last known-good PV-per-irradiance ratio. Without this, the ratio can only
 * ever be computed while the sun is actually up -- after dark, live
 * irradiance drops to ~0 and a fresh ratio can't be derived, which would
 * silently kill the appliance ETA estimate every night. Persisted to
 * localStorage (not just module scope) so it survives a page reload or
 * add-on rebuild overnight, not just re-renders within the same tab.
 */
const RATIO_STORAGE_KEY = 'tunet_solar_pv_per_irradiance_ratio';
/** Ignore a stored ratio older than this -- panel soiling/seasonal tilt drift. */
const RATIO_MAX_AGE_MS = 24 * 60 * 60 * 1000;
/** Minimum time between localStorage writes while the ratio keeps recalibrating in daylight. */
const RATIO_PERSIST_INTERVAL_MS = 60 * 1000;

function loadCachedRatio() {
  try {
    const raw = localStorage.getItem(RATIO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Number.isFinite(parsed?.ratio) || !Number.isFinite(parsed?.at)) return null;
    if (Date.now() - parsed.at > RATIO_MAX_AGE_MS) return null;
    return parsed.ratio;
  } catch {
    return null;
  }
}

function saveCachedRatio(ratio) {
  try {
    localStorage.setItem(RATIO_STORAGE_KEY, JSON.stringify({ ratio, at: Date.now() }));
  } catch {
    /* localStorage unavailable (private mode/quota) -- module-scope cache still works */
  }
}

let cachedPvPerIrradiance = loadCachedRatio();
let lastPersistAt = 0;

export function getNumericState(entity) {
  const raw = entity?.state;
  if (raw === undefined || raw === null || raw === 'unavailable' || raw === 'unknown') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/**
 * Computes the current solar-surplus picture for the whole house, a
 * `classify(typicalWattage)` helper that tiers an appliance's recommendation
 * as 'now' | 'soon' | 'wait', and `estimateNextAvailable(typicalWattage)`
 * which scans the DWD irradiance forecast for the next time enough surplus
 * is expected.
 *
 * Available surplus is simply the power currently being exported to the
 * grid (negative grid reading): whatever isn't being pulled from the grid
 * right now is, by definition, free to redirect to a new load, without
 * needing to reserve anything for battery charging (handled externally) or
 * re-derive house consumption from other sensors.
 *
 * `conn` is optional -- pass it (from ctx) to enable the DWD-based ETA
 * estimate, which needs a history-derived PV-per-irradiance ratio. Without
 * it, `estimateNextAvailable` always returns null.
 */
export default function useSolarSurplusData(entities, conn) {
  const historicalPvPerIrradiance = usePvIrradianceRatio(conn);

  return useMemo(() => {
    const mainPv = getNumericState(entities?.[SURPLUS_ENTITY_IDS.mainPvPower]) ?? 0;
    const bkwPv = getNumericState(entities?.[SURPLUS_ENTITY_IDS.bkwPvPower]) ?? 0;
    const totalPv = mainPv + bkwPv;

    // Grid convention: positive = import (Bezug), negative = export (Einspeisung).
    const gridPower = getNumericState(entities?.[SURPLUS_ENTITY_IDS.gridPower]);
    const availableSurplusW = gridPower !== null ? Math.max(0, -gridPower) : 0;

    // Real-time house load, purely for display: PV + battery discharge - battery
    // charge + grid import all balance out to whatever the house itself is
    // using. Direction comes from the mode enum, not the power sensor's sign
    // (GoodWe's own sign convention for battery_power proved ambiguous).
    const batteryMode = entities?.[SURPLUS_ENTITY_IDS.mainBatteryMode]?.state ?? null;
    const batteryPowerAbs = Math.abs(getNumericState(entities?.[SURPLUS_ENTITY_IDS.mainBatteryPower]) ?? 0);
    const batteryDischargeW = batteryMode === 'Discharge' ? batteryPowerAbs : 0;
    const batteryChargeW = batteryMode === 'Charge' ? batteryPowerAbs : 0;
    const houseLoadW =
      gridPower !== null ? Math.max(0, totalPv + gridPower + batteryDischargeW - batteryChargeW) : null;

    const houseLoadForecastW = getNumericState(entities?.[SURPLUS_ENTITY_IDS.houseLoadForecast]) ?? 0;

    const irradianceEntity = entities?.[SURPLUS_ENTITY_IDS.irradianceForecast];
    const irradianceNowW = getNumericState(irradianceEntity);
    const forecastRows = Array.isArray(irradianceEntity?.attributes?.data) ? irradianceEntity.attributes.data : [];

    // Translate the DWD irradiance curve (W/m²) into an expected PV power
    // curve (W) using a ratio of this installation's own output to its own
    // irradiance. Preferred source is the multi-day statistics-derived ratio
    // (works any time of day/night); the live instant and the cached value
    // are fallbacks for while that hasn't loaded yet (e.g. right after
    // opening the dashboard, before the history query resolves).
    const liveRatio =
      irradianceNowW && irradianceNowW >= MIN_IRRADIANCE_FOR_CALIBRATION ? totalPv / irradianceNowW : null;
    const now = Date.now();
    if (liveRatio !== null) {
      cachedPvPerIrradiance = liveRatio;
      if (now - lastPersistAt > RATIO_PERSIST_INTERVAL_MS) {
        lastPersistAt = now;
        saveCachedRatio(liveRatio);
      }
    }
    const pvPerIrradiance = historicalPvPerIrradiance ?? liveRatio ?? cachedPvPerIrradiance;

    const futureRows = pvPerIrradiance
      ? forecastRows
          .map((row) => ({ time: new Date(row.datetime).getTime(), irradiance: Number(row.value) }))
          .filter((row) => Number.isFinite(row.time) && Number.isFinite(row.irradiance) && row.time > now)
      : [];

    const forecastNextHourAvgW = futureRows.length
      ? Math.max(0, pvPerIrradiance * futureRows[0].irradiance - houseLoadForecastW)
      : 0;

    const classify = (typicalWattage) => {
      const watts = Number(typicalWattage);
      if (!Number.isFinite(watts) || watts <= 0) return 'wait';
      if (availableSurplusW >= watts) return 'now';
      if (forecastNextHourAvgW >= watts) return 'soon';
      return 'wait';
    };

    // Scans the DWD irradiance forecast (~10 days ahead) for the first hour
    // whose predicted PV output minus the 24h-average house-load forecast
    // would cover `typicalWattage`. Returns null when there isn't enough data
    // to estimate yet (e.g. no calibration ratio available after dark).
    const estimateNextAvailable = (typicalWattage) => {
      const watts = Number(typicalWattage);
      if (!Number.isFinite(watts) || watts <= 0) return null;
      if (availableSurplusW >= watts) return { status: 'now' };
      if (!pvPerIrradiance || futureRows.length === 0) return null;
      const match = futureRows.find((row) => pvPerIrradiance * row.irradiance - houseLoadForecastW >= watts);
      return match ? { status: 'at', date: new Date(match.time) } : { status: 'none' };
    };

    return {
      totalPv,
      mainPv,
      bkwPv,
      gridPower,
      availableSurplusW,
      houseLoadW,
      houseLoadForecastW,
      forecastNextHourAvgW,
      classify,
      estimateNextAvailable,
    };
  }, [entities, historicalPvPerIrradiance]);
}
