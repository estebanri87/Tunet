import express from 'express';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import profilesRouter from './routes/profiles.js';
import iconsRouter from './routes/icons.js';
import settingsRouter from './routes/settings.js';
import ingressIdentityRouter from './routes/ingressIdentity.js';
import { createHomeAssistantAuthMiddleware, getTrustedSupervisorUser } from './haAuth.js';
import { getHaRelayConnection, getLatestEntities, onEntitiesUpdate, forwardMessage } from './haRelay.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3002', 10);

const resolveAppVersion = () => {
  const packageJsonPath = join(__dirname, '..', 'package.json');

  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return pkg?.version || 'unknown';
  } catch {
    return 'unknown';
  }
};

export const createApp = ({
  appVersion = resolveAppVersion(),
  distPath = join(__dirname, '..', 'dist'),
  isProduction = process.env.NODE_ENV === 'production',
} = {}) => {
  const app = express();
  const homeAssistantAuth = createHomeAssistantAuthMiddleware();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.removeHeader('X-Powered-By');

    // --- Content-Security-Policy ---
    // Restricts which origins can load scripts, styles, images, etc.
    // "self" = same origin only; external CDNs are explicitly allowed.
    const csp = [
      "default-src 'self'",
      // Scripts: own bundle only (inline for Vite dev handled by nonce/hash in dev mode)
      "script-src 'self'",
      // Styles: own + Google Fonts + inline (Tailwind / dynamic styles)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts: own + Google Fonts CDN
      "font-src 'self' https://fonts.gstatic.com",
      // Images: own, HA instance (any origin – URL is user-configured), weather icons, media logos, map tiles, data/blob URIs
      "img-src 'self' data: blob: http: https: https://cdn.jsdelivr.net https://cdn.simpleicons.org https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org",
      // WebSocket connections to the user's HA instance (any origin, since URL is user-configured)
      "connect-src 'self' ws: wss: http: https:",
      // Leaflet map iframe
      "frame-src https://www.openstreetmap.org",
      // Block all object/embed/plugin
      "object-src 'none'",
      // Restrict base-uri to prevent base tag injection
      "base-uri 'self'",
      // Only allow forms to submit to same origin
      "form-action 'self'",
    ].join('; ');

    res.setHeader('Content-Security-Policy', csp);
    next();
  });

  // Parse JSON bodies
  app.use(express.json({ limit: '2mb' }));

  // Both limiters intentionally key on the immediate socket peer, not
  // X-Forwarded-For (Ingress traffic all arrives from the Supervisor's
  // proxy). This skips express-rate-limit's trust-proxy sanity check,
  // which would otherwise log a warning on every request in this setup.
  const remoteAddressKeyGenerator = (req) => req.socket?.remoteAddress || req.ip;

  const apiRateLimiter = rateLimit({
    windowMs: Math.max(Number(process.env.API_RATE_LIMIT_WINDOW_MS) || 60_000, 1_000),
    max: Math.max(Number(process.env.API_RATE_LIMIT_MAX) || 300, 10),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: remoteAddressKeyGenerator,
  });

  const assetFallbackRateLimiter = rateLimit({
    windowMs: Math.max(Number(process.env.ASSET_FALLBACK_RATE_LIMIT_WINDOW_MS) || 60_000, 1_000),
    max: Math.max(Number(process.env.ASSET_FALLBACK_RATE_LIMIT_MAX) || 120, 10),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: remoteAddressKeyGenerator,
  });

  app.use('/api', apiRateLimiter);

  // Ingress support — strip X-Ingress-Path prefix from request URL
  app.use((req, _res, next) => {
    const ingressPath = req.headers['x-ingress-path'];
    if (ingressPath && req.url.startsWith(ingressPath)) {
      req.url = req.url.slice(ingressPath.length) || '/';
    }
    next();
  });

  // API routes
  app.use('/api/profiles', homeAssistantAuth, profilesRouter);
  app.use('/api/icons', iconsRouter);
  app.use('/api/settings', homeAssistantAuth, settingsRouter);
  app.use('/api/ingress-identity', ingressIdentityRouter);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', version: appVersion });
  });

  // Serve static frontend files in production
  if (isProduction) {
    if (existsSync(distPath)) {
      const assetsPath = join(distPath, 'assets');
      const indexHtmlPath = join(distPath, 'index.html');
      const indexHtml = existsSync(indexHtmlPath) ? readFileSync(indexHtmlPath, 'utf8') : null;
      const assetFiles = existsSync(assetsPath) ? readdirSync(assetsPath) : [];
      const hashedAssetFallbackMap = new Map();

      assetFiles.forEach((fileName) => {
        const fileExt = extname(fileName).toLowerCase();
        if (fileExt !== '.js' && fileExt !== '.css') return;

        const baseName = basename(fileName, fileExt);
        const hashSeparatorIndex = baseName.lastIndexOf('-');
        if (hashSeparatorIndex <= 0) return;

        const stem = baseName.slice(0, hashSeparatorIndex);
        const key = `${stem}${fileExt}`;
        hashedAssetFallbackMap.set(key, fileName);
      });

      const setNoCacheHeaders = (res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      };

      const sendSpaIndex = (res) => {
        setNoCacheHeaders(res);
        if (indexHtml !== null) {
          return res.type('html').send(indexHtml);
        }
        return res.status(503).send('Frontend unavailable');
      };

      app.use(
        '/assets',
        express.static(assetsPath, {
          fallthrough: true,
          immutable: true,
          maxAge: '1y',
        })
      );

      app.get('/assets/{*path}', assetFallbackRateLimiter, (req, res, next) => {
        const requested = basename(req.path || '');
        if (!requested) return next();

        const fileExt = extname(requested).toLowerCase();
        if (fileExt !== '.js' && fileExt !== '.css') return next();

        const requestedBase = basename(requested, fileExt);
        const hashSeparatorIndex = requestedBase.lastIndexOf('-');
        if (hashSeparatorIndex <= 0) return next();

        const stem = requestedBase.slice(0, hashSeparatorIndex);
        const fallbackKey = `${stem}${fileExt}`;
        const fallbackFileName = hashedAssetFallbackMap.get(fallbackKey);
        if (!fallbackFileName || fallbackFileName === requested) return next();

        res.setHeader('X-Nyx-Asset-Fallback', fallbackFileName);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.sendFile(join(assetsPath, fallbackFileName));
      });

      app.use(
        express.static(distPath, {
          index: false,
          setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) {
              setNoCacheHeaders(res);
            }
            if (filePath.endsWith('sw.js')) {
              setNoCacheHeaders(res);
              res.setHeader('Service-Worker-Allowed', '/');
            }
          },
        })
      );

      app.get('/index.html', (_req, res) => {
        sendSpaIndex(res);
      });

      // SPA fallback — serve index.html for all non-API routes
      app.use((req, res, next) => {
        if (req.path.startsWith('/api/')) {
          return next();
        }
        if (req.path.includes('.')) {
          return next();
        }
        sendSpaIndex(res);
      });
    } else {
      console.warn('[server] dist/ folder not found. Only API routes will be available.');
    }
  }

  return app;
};

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
const app = createApp();

/**
 * Relays a single browser client over the WS-relay upgrade: sends the
 * current entity snapshot immediately, keeps it updated, and forwards any
 * `{type: 'forward', id, payload}` message to the real Home Assistant
 * connection, replying with the same id so the frontend can correlate
 * request/response.
 */
function handleRelayClient(ws) {
  const sendEntities = (entities) => {
    if (ws.readyState !== ws.OPEN) return;
    try {
      ws.send(JSON.stringify({ type: 'entities', data: entities }));
    } catch (err) {
      console.warn('[ha-relay] failed to send entity snapshot:', err);
    }
  };

  getHaRelayConnection()
    .then(() => sendEntities(getLatestEntities()))
    .catch((err) => {
      console.error('[ha-relay] failed to establish Home Assistant connection:', err);
      if (ws.readyState === ws.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'error',
            id: null,
            error: 'Relay could not reach Home Assistant.',
          })
        );
      }
    });

  const unsubscribe = onEntitiesUpdate(sendEntities);

  ws.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (message?.type !== 'forward' || message.id === undefined) return;

    forwardMessage(message.payload)
      .then((result) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'response', id: message.id, result }));
        }
      })
      .catch((err) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(
            JSON.stringify({ type: 'error', id: message.id, error: err?.message || String(err) })
          );
        }
      });
  });

  ws.on('close', unsubscribe);
}

if (isMainModule) {
  const server = createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  // WS-relay upgrade -- mirrors the Express ingress-path-strip middleware
  // above, since upgrade requests never pass through Express middleware.
  server.on('upgrade', (req, socket, head) => {
    const ingressPath = req.headers['x-ingress-path'];
    let url = req.url;
    if (ingressPath && url.startsWith(ingressPath)) {
      url = url.slice(ingressPath.length) || '/';
    }

    if (url !== '/api/ws-relay') {
      socket.destroy();
      return;
    }

    const reqLike = {
      get: (name) => req.headers[name.toLowerCase()],
      socket: req.socket,
      connection: req.socket,
    };
    if (!getTrustedSupervisorUser(reqLike)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      handleRelayClient(ws);
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[server] Nyx backend running on port ${PORT} (${process.env.NODE_ENV === 'production' ? 'production' : 'development'})`
    );
  });
}

export default app;
