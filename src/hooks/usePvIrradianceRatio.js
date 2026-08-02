import { useEffect, useState } from 'react';
import { getStatistics } from '../services/haClient';
import { SURPLUS_ENTITY_IDS } from './useSolarSurplusData';

/** How far back to look for daylight hours to calibrate against. */
const LOOKBACK_DAYS = 3;
/** Below this W/m² a hour's ratio is too noisy (dawn/dusk) to use as a calibration sample. */
const MIN_IRRADIANCE_FOR_SAMPLE = 100;
/** Re-derive the ratio periodically for long-lived sessions (seasonal drift). */
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Derives how many watts this PV installation produces per W/m² of solar
 * irradiance, from the last LOOKBACK_DAYS of hourly HA statistics -- instead
 * of only the current instant (which is 0/0 at night and would leave the
 * appliance-card ETA estimate with no calibration to work with until the
 * next time the sun happens to be up while the dashboard is open).
 *
 * Uses the median of per-hour ratios (PV mean / irradiance mean) across
 * hours with meaningful irradiance, which absorbs outliers from clipping,
 * cloud transients, or brief inverter dips better than a single sample.
 *
 * Returns `null` until the first successful calibration (loading, no
 * connection, or no daylight data in the lookback window yet). Once a ratio
 * has been derived, a later failed refresh keeps the last good value rather
 * than blanking it.
 */
export default function usePvIrradianceRatio(conn) {
  const [ratio, setRatio] = useState(null);

  useEffect(() => {
    if (!conn) {
      setRatio(null);
      return undefined;
    }

    let cancelled = false;

    const refresh = () => {
      const end = new Date();
      const start = new Date(end.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

      Promise.all([
        getStatistics(conn, { start, end, statisticId: SURPLUS_ENTITY_IDS.mainPvPower, period: 'hour' }),
        getStatistics(conn, { start, end, statisticId: SURPLUS_ENTITY_IDS.bkwPvPower, period: 'hour' }),
        getStatistics(conn, { start, end, statisticId: SURPLUS_ENTITY_IDS.irradianceForecast, period: 'hour' }),
      ])
        .then(([mainRows, bkwRows, irradianceRows]) => {
          if (cancelled) return;

          const meanByHour = (rows) => {
            const map = new Map();
            for (const row of rows || []) {
              const mean = Number(row?.mean);
              const hourKey = new Date(row?.start).getTime();
              if (Number.isFinite(mean) && Number.isFinite(hourKey)) map.set(hourKey, mean);
            }
            return map;
          };

          const mainByHour = meanByHour(mainRows);
          const bkwByHour = meanByHour(bkwRows);
          const irradianceByHour = meanByHour(irradianceRows);

          const samples = [];
          for (const [hourKey, irradianceMean] of irradianceByHour) {
            if (irradianceMean < MIN_IRRADIANCE_FOR_SAMPLE) continue;
            const pvMean = (mainByHour.get(hourKey) ?? 0) + (bkwByHour.get(hourKey) ?? 0);
            if (pvMean > 0) samples.push(pvMean / irradianceMean);
          }

          if (samples.length === 0) return;
          samples.sort((a, b) => a - b);
          setRatio(samples[Math.floor(samples.length / 2)]);
        })
        .catch(() => {
          /* keep the previous ratio (if any) rather than blanking it on a transient failure */
        });
    };

    refresh();
    const intervalId = setInterval(refresh, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [conn]);

  return ratio;
}
