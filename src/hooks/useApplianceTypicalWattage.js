import { useEffect, useState } from 'react';
import { getStatistics } from '../services/haClient';

/** How far back to look for a "recent run" peak. */
const LOOKBACK_DAYS = 30;

/**
 * Derives an appliance's typical peak power draw from its own history,
 * instead of a hand-entered guess: the highest hourly `max` reported by
 * Home Assistant's long-term statistics for `powerEntityId` over the last
 * LOOKBACK_DAYS. Using the peak (not the average) means the surplus
 * recommendation only fires once there's enough headroom for the
 * appliance's most demanding moment, not just its average draw.
 *
 * Returns `null` while loading, on failure, or when the entity has no
 * statistics yet (e.g. it has never run) — callers should fall back to a
 * manually configured wattage in that case.
 */
export default function useApplianceTypicalWattage(conn, powerEntityId) {
  const [peakWatts, setPeakWatts] = useState(null);

  useEffect(() => {
    if (!conn || !powerEntityId) {
      setPeakWatts(null);
      return undefined;
    }

    let cancelled = false;
    const end = new Date();
    const start = new Date(end.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    getStatistics(conn, { start, end, statisticId: powerEntityId, period: 'hour' })
      .then((rows) => {
        if (cancelled) return;
        const max = (rows || []).reduce((best, row) => {
          const value = Number(row?.max);
          return Number.isFinite(value) ? Math.max(best, value) : best;
        }, 0);
        setPeakWatts(max > 0 ? max : null);
      })
      .catch(() => {
        if (!cancelled) setPeakWatts(null);
      });

    return () => {
      cancelled = true;
    };
  }, [conn, powerEntityId]);

  return peakWatts;
}
