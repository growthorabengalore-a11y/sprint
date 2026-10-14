import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';

export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export class HttpError extends Error { constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; } }

export const requireAuth = wrap(async (req, _res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : req.query.token; // query token only used for protected image GETs
  if (!token) throw new HttpError(401, 'Authentication required');
  let payload;
  try { payload = jwt.verify(token, env.jwtSecret); } catch { throw new HttpError(401, 'Session expired. Please log in again.'); }
  const user = await User.findById(payload.sub);
  if (!user || user.archived || !user.isActive || user.tokenVersion !== payload.tv) throw new HttpError(401, 'Account unavailable');
  req.user = user;
  next();
});
export const requireRole = (role) => (req, _res, next) =>
  req.user?.role === role ? next() : next(new HttpError(403, 'Forbidden'));
/** Blocks everything except change-password until the temporary password is changed. */
export const blockIfMustChange = (req, _res, next) =>
  req.user?.mustChangePassword ? next(new HttpError(403, 'Password change required', { code: 'MUST_CHANGE_PASSWORD' })) : next();

export function errorHandler(err, _req, res, _next) {
  if (err.name === 'ZodError') return res.status(400).json({ ok: false, message: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
  if (err.code === 11000) return res.status(409).json({ ok: false, message: 'Duplicate record' });
  if (err.name === 'MulterError') return res.status(400).json({ ok: false, message: err.message });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ ok: false, message: status >= 500 ? 'Server error' : err.message, ...(err.extra || {}) });
}
