import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Branch } from '../models/Branch.js';
import { User } from '../models/User.js';
import { audit } from '../models/AuditLog.js';
import { HttpError, requireAuth, requireRole, wrap } from '../middleware/auth.js';
import { strongPw } from './auth.js';

const r = Router();
const pages = ['dashboard', 'champs', 'sprint-reports', 'performance', 'attendance', 'attendance-reports',
  'clients', 'client-data', 'team-target', 'leads', 'settings'];
const accountId = z.string().trim().min(2).max(60).regex(/^[A-Za-z0-9._-]+$/, 'Use letters, numbers, dots, underscores, or hyphens');
r.use(requireAuth, requireRole('admin'));

r.get('/branches', wrap(async (_req, res) => {
  const items = await Branch.find().sort({ name: 1 }).select('name address branchId createdAt').lean();
  res.json({ ok: true, items });
}));

r.post('/branches', wrap(async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(2).max(100),
    address: z.string().trim().min(3).max(500),
    branchId: accountId,
    password: strongPw,
  }).strict().parse(req.body);
  const idPattern = new RegExp(`^${input.branchId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  if (await Branch.exists({ branchId: idPattern }) || await User.exists({ employeeId: idPattern })) {
    throw new HttpError(409, 'Branch ID is already in use');
  }
  const branch = await Branch.create({ name: input.name, address: input.address, branchId: input.branchId });
  try {
    await User.create({
      name: input.name,
      employeeId: input.branchId,
      passwordHash: await bcrypt.hash(input.password, 12),
      role: 'branchAdmin',
      branchId: branch._id,
      branchName: branch.name,
      mustChangePassword: true,
    });
  } catch (error) {
    await Branch.deleteOne({ _id: branch._id });
    throw error;
  }
  audit(req, 'branch_create', input.branchId, { name: branch.name });
  res.status(201).json({ ok: true, branch: { id: branch._id, name: branch.name, address: branch.address, branchId: branch.branchId } });
}));

r.post('/hr', wrap(async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(2).max(100),
    branchId: z.string().regex(/^[a-f\d]{24}$/i, 'Select a branch'),
    employeeId: accountId,
    password: strongPw,
    pagePermissions: z.array(z.enum(pages)).min(1, 'Select at least one page').max(pages.length),
  }).strict().parse(req.body);
  const branch = await Branch.findById(input.branchId);
  if (!branch) throw new HttpError(400, 'Selected branch does not exist');
  const idPattern = new RegExp(`^${input.employeeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  if (await User.exists({ employeeId: idPattern })) throw new HttpError(409, 'HR ID is already in use');
  const hr = await User.create({
    name: input.name,
    employeeId: input.employeeId,
    passwordHash: await bcrypt.hash(input.password, 12),
    role: 'hr',
    branchId: branch._id,
    branchName: branch.name,
    pagePermissions: [...new Set(input.pagePermissions)],
    mustChangePassword: true,
  });
  audit(req, 'hr_create', hr.employeeId, { branch: branch.name, pagePermissions: hr.pagePermissions });
  res.status(201).json({ ok: true, hr: { id: hr._id, name: hr.name, employeeId: hr.employeeId, branchName: branch.name, pagePermissions: hr.pagePermissions } });
}));

r.post('/operations', wrap(async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(2).max(100),
    address: z.string().trim().min(3).max(500),
    branchId: z.string().regex(/^[a-f\d]{24}$/i, 'Select a branch'),
    employeeId: accountId,
    password: strongPw,
    pagePermissions: z.array(z.enum(pages)).min(1, 'Select at least one page').max(pages.length),
  }).strict().parse(req.body);
  const branch = await Branch.findById(input.branchId);
  if (!branch) throw new HttpError(400, 'Selected branch does not exist');
  const idPattern = new RegExp(`^${input.employeeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  if (await User.exists({ employeeId: idPattern })) throw new HttpError(409, 'Operation Team ID is already in use');
  const operationUser = await User.create({
    name: input.name,
    employeeId: input.employeeId,
    passwordHash: await bcrypt.hash(input.password, 12),
    role: 'operations',
    roleAddress: input.address,
    branchId: branch._id,
    branchName: branch.name,
    pagePermissions: [...new Set(input.pagePermissions)],
    mustChangePassword: true,
  });
  audit(req, 'operation_team_create', operationUser.employeeId, {
    branch: branch.name,
    pagePermissions: operationUser.pagePermissions,
  });
  res.status(201).json({
    ok: true,
    operationTeam: {
      id: operationUser._id,
      name: operationUser.name,
      address: operationUser.roleAddress,
      employeeId: operationUser.employeeId,
      branchName: branch.name,
      pagePermissions: operationUser.pagePermissions,
    },
  });
}));

export default r;
