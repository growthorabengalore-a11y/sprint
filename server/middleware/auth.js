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
export const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user?.role) ? next() : next(new HttpError(403, 'Forbidden'));
export const requireAdminPage = (page) => (req, _res, next) => {
  const user = req.user;
  if (user?.mustChangePassword) return next(new HttpError(403, 'Password change required', { code: 'MUST_CHANGE_PASSWORD' }));
  if (user?.role === 'admin' || (user?.role === 'branchAdmin' && page !== 'roles')
    || (['hr', 'operations'].includes(user?.role) && user.pagePermissions?.includes(page))) return next();
  return next(new HttpError(403, 'You do not have access to this page'));
};
export const requireAnyAdminPage = (...pages) => (req, _res, next) => {
  const user = req.user;
  if (user?.mustChangePassword) return next(new HttpError(403, 'Password change required', { code: 'MUST_CHANGE_PASSWORD' }));
  if (user?.role === 'admin' || (user?.role === 'branchAdmin' && pages.every((page) => page !== 'roles'))
    || (['hr', 'operations'].includes(user?.role) && pages.some((page) => user.pagePermissions?.includes(page)))) return next();
  return next(new HttpError(403, 'You do not have access to this page'));
};
export const employeeScope = (req) => {
  const filter = { role: 'employee' };
  if (['branchAdmin', 'hr', 'operations'].includes(req.user?.role)) {
    filter.branchId = req.user.branchId || { $in: [] };
  }
  return filter;
};
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
