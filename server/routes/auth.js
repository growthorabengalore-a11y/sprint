import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { audit } from '../models/AuditLog.js';
import { wrap, HttpError, requireAuth } from '../middleware/auth.js';
import { getSettings } from '../services/settings.js';

export const strongPw = z.string().min(8).max(100).regex(/[A-Za-z]/, 'needs a letter').regex(/\d/, 'needs a digit');
const r = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false, message: { ok: false, message: 'Too many attempts. Try later.' } });
export const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, phone: u.phone, employeeId: u.employeeId, role: u.role,
  faceRegistered: u.faceRegistered, mustChangePassword: u.mustChangePassword });

r.post('/login', limiter, wrap(async (req, res) => {
  const { employeeId, password } = z.object({ employeeId: z.string().min(1).max(60), password: z.string().min(1).max(100) }).parse(req.body);
  const s = await getSettings();
  const user = await User.findOne({ employeeId: new RegExp(`^${employeeId.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).select('+passwordHash');
  const bad = new HttpError(401, 'Invalid Employee ID or password');
  if (!user || user.archived) throw bad;
  if (user.lockUntil && user.lockUntil > new Date()) throw new HttpError(429, 'Account temporarily locked. Try again later.');
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    user.failedLogins += 1;
    if (user.failedLogins >= s.maxLoginAttempts) { user.lockUntil = new Date(Date.now() + s.lockMinutes * 60000); user.failedLogins = 0; }
    await user.save();
    throw bad;
  }
  if (!user.isActive) throw new HttpError(403, 'Your account is disabled. Contact the admin.');
  user.failedLogins = 0; user.lockUntil = null; await user.save();
  const token = jwt.sign({ sub: String(user._id), role: user.role, tv: user.tokenVersion }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  req.user = user; audit(req, 'login', user.employeeId);
  res.json({ ok: true, token, user: publicUser(user) });
}));
r.get('/me', requireAuth, (req, res) => res.json({ ok: true, user: publicUser(req.user) }));
r.post('/logout', requireAuth, wrap(async (req, res) => { req.user.tokenVersion += 1; await req.user.save(); res.json({ ok: true }); }));
r.post('/change-password', requireAuth, limiter, wrap(async (req, res) => {
  const { currentPassword, newPassword } = z.object({ currentPassword: z.string(), newPassword: strongPw }).parse(req.body);
  const u = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(currentPassword, u.passwordHash))) throw new HttpError(400, 'Current password is incorrect');
  if (currentPassword === newPassword) throw new HttpError(400, 'New password must be different');
  u.passwordHash = await bcrypt.hash(newPassword, 12); u.mustChangePassword = false; u.tokenVersion += 1; await u.save();
  const token = jwt.sign({ sub: String(u._id), role: u.role, tv: u.tokenVersion }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  audit(req, 'change_password', u.employeeId);
  res.json({ ok: true, token, user: publicUser(u) });
}));
export default r;
