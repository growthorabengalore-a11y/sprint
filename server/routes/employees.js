import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import { User } from '../models/User.js';
import { FaceRegistration } from '../models/FaceRegistration.js';
import { nextEmployeeId } from '../models/EmployeeCounter.js';
import { audit } from '../models/AuditLog.js';
import { wrap, HttpError, requireAuth, requireRole } from '../middleware/auth.js';

const r = Router();
r.use(requireAuth, requireRole('admin'));
const body = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
});
const tempPassword = () => crypto.randomBytes(6).toString('base64url') + '7a';
const view = (u) => ({ id: u._id, employeeId: u.employeeId, name: u.name, email: u.email, phone: u.phone, isActive: u.isActive,
  faceRegistered: u.faceRegistered, archived: u.archived, createdAt: u.createdAt });

r.get('/', wrap(async (req, res) => {
  const q = { role: 'employee', archived: req.query.archived === 'true' };
  if (req.query.q) { const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); q.$or = [{ name: rx }, { employeeId: rx }, { email: rx }, { phone: rx }]; }
  const page = Math.max(1, +req.query.page || 1), limit = Math.min(200, +req.query.limit || 100);
  const [items, total] = await Promise.all([User.find(q).sort({ createdAt: 1 }).skip((page - 1) * limit).limit(limit), User.countDocuments(q)]);
  res.json({ ok: true, items: items.map(view), total, page, limit });
}));
r.post('/', wrap(async (req, res) => {
  const d = body.parse(req.body);
  if (await User.exists({ email: d.email, role: 'employee', archived: false })) throw new HttpError(409, 'An employee with this email already exists');
  const pw = tempPassword();
  const u = await User.create({ ...d, employeeId: await nextEmployeeId(), passwordHash: await bcrypt.hash(pw, 12), role: 'employee', mustChangePassword: true });
  audit(req, 'employee_create', u.employeeId);
  res.status(201).json({ ok: true, employee: view(u), temporaryPassword: pw }); // shown once
}));
r.get('/:id', wrap(async (req, res) => {
  const u = await User.findOne({ _id: req.params.id, role: 'employee' });
  if (!u) throw new HttpError(404, 'Not found');
  res.json({ ok: true, employee: view(u) });
}));
r.put('/:id', wrap(async (req, res) => {
  const d = body.parse(req.body);
  const u = await User.findOneAndUpdate({ _id: req.params.id, role: 'employee' }, d, { new: true });
  if (!u) throw new HttpError(404, 'Not found');
  audit(req, 'employee_update', u.employeeId, d);
  res.json({ ok: true, employee: view(u) });
}));
r.patch('/:id/status', wrap(async (req, res) => {
  const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
  const u = await User.findOneAndUpdate({ _id: req.params.id, role: 'employee' }, { isActive, $inc: { tokenVersion: 1 } }, { new: true });
  if (!u) throw new HttpError(404, 'Not found');
  audit(req, isActive ? 'employee_enable' : 'employee_disable', u.employeeId);
  res.json({ ok: true, employee: view(u) });
}));
r.post('/:id/reset-password', wrap(async (req, res) => {
  const pw = tempPassword();
  const u = await User.findOneAndUpdate({ _id: req.params.id, role: 'employee' }, { passwordHash: await bcrypt.hash(pw, 12), mustChangePassword: true, $inc: { tokenVersion: 1 } }, { new: true });
  if (!u) throw new HttpError(404, 'Not found');
  audit(req, 'employee_reset_password', u.employeeId);
  res.json({ ok: true, temporaryPassword: pw });
}));
// soft delete: records stay; ID is never reused (counter is monotonic)
r.delete('/:id', wrap(async (req, res) => {
  const u = await User.findOneAndUpdate({ _id: req.params.id, role: 'employee' }, { archived: true, isActive: false, $inc: { tokenVersion: 1 } }, { new: true });
  if (!u) throw new HttpError(404, 'Not found');
  audit(req, 'employee_archive', u.employeeId);
  res.json({ ok: true });
}));
r.delete('/:id/face', wrap(async (req, res) => { // biometric deletion
  const f = await FaceRegistration.findOneAndDelete({ employee: req.params.id });
  await User.updateOne({ _id: req.params.id }, { faceRegistered: false });
  if (f) { const { deleteFiles } = await import('../services/faceFiles.js'); await deleteFiles(f.imagePaths); }
  audit(req, 'face_delete', String(req.params.id));
  res.json({ ok: true });
}));
export default r;
