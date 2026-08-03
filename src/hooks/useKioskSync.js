import { useState, useCallback, useEffect, useRef } from 'react';
import {
  fetchKioskBroadcast,
  publishKioskBroadcast,
  deleteKioskBroadcast,
} from '../services/kioskApi';
import { collectSnapshot, applySnapshot, isValidSnapshot } from '../services/snapshot';

const POLL_INTERVAL_MS = 5000;

/**
 * Kiosk broadcast: a single dashboard state any authenticated device can
 * publish to and any device can follow, independent of which HA user account
 * is connected. Unlike profiles/auto-sync (both scoped to ha_user_id), this
 * lets a kiosk/display device run under its own restricted HA account while
 * still auto-mirroring whatever an editing device publishes.
 */
export function useKioskSync({ contextSetters }) {
  const contextSettersRef = useRef(contextSetters);
  contextSettersRef.current = contextSetters;

  const [followEnabled, setFollowEnabledState] = useState(() => {
    try {
      return localStorage.getItem('nyx_kiosk_follow') === '1';
    } catch {
      return false;
    }
  });
  const [publishing, setPublishing] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const lastRevisionRef = useRef(null);
  const pollTimerRef = useRef(null);

  const setFollowEnabled = useCallback((next) => {
    setFollowEnabledState(next);
    try {
      localStorage.setItem('nyx_kiosk_follow', next ? '1' : '0');
    } catch {
      // ignore storage errors
    }
    if (!next) {
      lastRevisionRef.current = null;
      setStatus('idle');
      setError('');
    }
  }, []);

  const publish = useCallback(async () => {
    setPublishing(true);
    setError('');
    try {
      const snapshot = collectSnapshot();
      if (!isValidSnapshot(snapshot)) {
        throw new Error('Invalid snapshot data');
      }
      const result = await publishKioskBroadcast(snapshot);
      setLastUpdatedAt(result?.updated_at || new Date().toISOString());
      return result;
    } catch (err) {
      setError(err?.message || 'Failed to publish kiosk dashboard');
      throw err;
    } finally {
      setPublishing(false);
    }
  }, []);

  const unpublish = useCallback(async () => {
    setError('');
    try {
      await deleteKioskBroadcast();
      lastRevisionRef.current = null;
      setLastUpdatedAt(null);
    } catch (err) {
      setError(err?.message || 'Failed to remove kiosk dashboard');
      throw err;
    }
  }, []);

  const poll = useCallback(async () => {
    try {
      const row = await fetchKioskBroadcast();
      if (!row) {
        setStatus('not-published');
        return;
      }
      setStatus('following');
      setLastUpdatedAt(row.updated_at || null);
      if (lastRevisionRef.current === row.revision) return;
      lastRevisionRef.current = row.revision;
      if (row.data && typeof row.data === 'object') {
        applySnapshot(row.data, contextSettersRef?.current || {});
      }
    } catch (err) {
      setStatus('error');
      setError(err?.message || 'Failed to fetch kiosk dashboard');
    }
  }, [contextSettersRef]);

  useEffect(() => {
    if (!followEnabled) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
      return undefined;
    }

    poll();
    pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    };
  }, [followEnabled, poll]);

  return {
    followEnabled,
    setFollowEnabled,
    publishing,
    publish,
    unpublish,
    status,
    error,
    lastUpdatedAt,
  };
}
