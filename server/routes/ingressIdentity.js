import { Router } from 'express';
import { getTrustedSupervisorUser } from '../haAuth.js';

const router = Router();

/**
 * Lets the frontend detect trusted Supervisor ingress access without
 * guessing from the URL shape (fragile -- HA's ingress path scheme has
 * changed before and differs by version/setup). Reuses the exact same
 * trust check already used to authenticate /api/profiles and /api/settings
 * under ingress, so this always agrees with what those routes accept.
 *
 * Intentionally unauthenticated: it only ever reveals whether *this*
 * request itself was ingress-trusted, nothing about anyone else.
 */
router.get('/', (req, res) => {
  const user = getTrustedSupervisorUser(req);
  res.json({ trusted: Boolean(user), user: user || null });
});

export default router;
