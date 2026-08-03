import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import db from '../db.js';
import {
  encryptDataText,
  getEncryptedOnlyPlaintextStub,
  isEncryptionWriteRequired,
  resolveStoredDataText,
  shouldPersistPlaintextData,
} from '../utils/dataCrypto.js';

const router = Router();

const kioskRateLimiter = rateLimit({
  windowMs: Math.max(Number(process.env.KIOSK_RATE_LIMIT_WINDOW_MS) || 60_000, 1_000),
  max: Math.max(Number(process.env.KIOSK_RATE_LIMIT_MAX) || 180, 10),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.socket?.remoteAddress || req.ip),
});

router.use(kioskRateLimiter);

const safeParseJson = (raw, fallback = null) => {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

// Read the published kiosk dashboard, if one has ever been published.
router.get('/', (_req, res) => {
  const row = db
    .prepare('SELECT data, data_enc, revision, updated_at FROM kiosk_broadcast WHERE id = 1')
    .get();

  if (!row) return res.json(null);

  const resolvedText = resolveStoredDataText({
    plainText: row.data,
    encryptedText: row.data_enc,
    context: 'kiosk/get',
  });

  return res.json({
    data: safeParseJson(resolvedText, {}),
    revision: row.revision,
    updated_at: row.updated_at,
  });
});

// Publish the current device's setup as the kiosk dashboard, overwriting
// whatever was published before. Intentionally not scoped to the requesting
// HA user -- any authenticated device may publish or follow this.
router.put('/', (req, res) => {
  const { data } = req.body || {};
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return res.status(400).json({ error: 'data must be an object' });
  }

  const payload = JSON.stringify(data);
  const encryptedPayload = encryptDataText(payload);
  if (encryptedPayload === null && isEncryptionWriteRequired()) {
    return res.status(503).json({ error: 'Encryption is required but unavailable' });
  }
  const plainPayload = shouldPersistPlaintextData() ? payload : getEncryptedOnlyPlaintextStub();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO kiosk_broadcast (id, data, data_enc, revision, updated_at)
     VALUES (1, ?, ?, 1, ?)
     ON CONFLICT(id) DO UPDATE SET
       data = excluded.data,
       data_enc = excluded.data_enc,
       revision = kiosk_broadcast.revision + 1,
       updated_at = excluded.updated_at`
  ).run(plainPayload, encryptedPayload, now);

  const row = db
    .prepare('SELECT revision, updated_at FROM kiosk_broadcast WHERE id = 1')
    .get();

  return res.json({ success: true, revision: row.revision, updated_at: row.updated_at });
});

// Un-publish -- devices in follow mode simply stop receiving updates.
router.delete('/', (_req, res) => {
  db.prepare('DELETE FROM kiosk_broadcast WHERE id = 1').run();
  return res.json({ success: true });
});

export default router;
