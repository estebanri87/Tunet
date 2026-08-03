const API_BASE = './api';

import {
  getStoredAuthMethod,
  getValidatedHomeAssistantRequestHeadersAsync,
  notifyHomeAssistantApiUnauthorized,
} from './apiAuth';

async function request(
  path,
  options = {},
  { retryOnOAuthUnauthorized = true, authHeadersOverride = null } = {}
) {
  const authHeaders = authHeadersOverride ?? (await getValidatedHomeAssistantRequestHeadersAsync());
  const mergedHeaders = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: mergedHeaders,
  });

  if (!res.ok) {
    if (res.status === 401 && retryOnOAuthUnauthorized && getStoredAuthMethod() === 'oauth') {
      const retryHeaders = await getValidatedHomeAssistantRequestHeadersAsync({
        forceRefreshOAuth: true,
      });
      return request(
        path,
        { ...options },
        { retryOnOAuthUnauthorized: false, authHeadersOverride: retryHeaders }
      );
    }

    const body = await res.json().catch(() => ({}));
    if (res.status === 401) {
      throw notifyHomeAssistantApiUnauthorized(body.error || 'Home Assistant authentication failed');
    }
    const error = /** @type {any} */ (new Error(body.error || `API error ${res.status}`));
    error.status = res.status;
    error.body = body;
    throw error;
  }

  return res.json();
}

/** Fetch the currently published kiosk dashboard, or null if none exists. */
export function fetchKioskBroadcast() {
  return request('/kiosk', {});
}

/** Publish `data` as the kiosk dashboard, overwriting any previous one. */
export function publishKioskBroadcast(data) {
  return request('/kiosk', {
    method: 'PUT',
    body: JSON.stringify({ data }),
  });
}

/** Remove the published kiosk dashboard so following devices stop updating. */
export function deleteKioskBroadcast() {
  return request('/kiosk', { method: 'DELETE' });
}
