import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { EmployeeLeadUpdate } from '../models/EmployeeLeadUpdate.js';
import { User } from '../models/User.js';
import { audit } from '../models/AuditLog.js';
import { blockIfMustChange, HttpError, requireAuth, requireRole, wrap } from '../middleware/auth.js';
import { getSettings } from '../services/settings.js';
import { businessDateKey, isValidDateKey } from '../utils/time.js';

const r = Router();
const leadInput = z.object({
  leadCount: z.number().int().min(1).max(100000),
  assignedTo: z.string().trim().min(1).max(100),
  leadStatus: z.enum(['Cold', 'Warm', 'Hot']),
  paymentStatus: z.string().trim().min(1).max(500),
}).strict();

function safeUpdate(update, employee) {
  return {
    id: String(update._id),
    employeeId: String(employee._id),
    employeeName: employee.name,
    employeeCode: employee.employeeId,
    dateKey: update.dateKey,
    leadCount: update.leadCount,
    assignedTo: update.assignedTo,
    leadStatus: update.leadStatus,
    paymentStatus: update.paymentStatus,
    createdAt: update.createdAt,
    updatedAt: update.updatedAt,
  };
}

r.use(requireAuth, blockIfMustChange);

r.get('/my', requireRole('employee'), wrap(async (req, res) => {
  const updates = await EmployeeLeadUpdate.find({ employee: req.user._id }).sort({ createdAt: -1 }).limit(1000).lean();
  res.json({ ok: true, items: updates.map((update) => safeUpdate(update, req.user)) });
}));

r.post('/', requireRole('employee'), wrap(async (req, res) => {
  const input = leadInput.parse(req.body);
  const settings = await getSettings();
  const dateKey = businessDateKey(new Date(), settings);
  const update = await EmployeeLeadUpdate.create({ ...input, employee: req.user._id, dateKey });
  audit(req, 'employee_lead_update_create', String(update._id), { dateKey, leadCount: update.leadCount });
  res.status(201).json({ ok: true, item: safeUpdate(update, req.user) });
}));

r.get('/admin', requireRole('admin'), wrap(async (req, res) => {
  const query = {};
  const from = req.query.from ? z.string().refine(isValidDateKey, 'Enter a valid start date').parse(req.query.from) : null;
  const to = req.query.to ? z.string().refine(isValidDateKey, 'Enter a valid end date').parse(req.query.to) : null;
  if (from && to && from > to) throw new HttpError(400, 'Start date must be on or before end date');
  if (from || to) query.dateKey = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  if (req.query.employeeId) {
    if (!mongoose.isValidObjectId(req.query.employeeId)) throw new HttpError(400, 'Invalid employee');
    query.employee = req.query.employeeId;
  }
  const updates = await EmployeeLeadUpdate.find(query).sort({ createdAt: -1 }).limit(2000).lean();
  const employeeIds = [...new Set(updates.map((update) => String(update.employee)))];
  const employees = await User.find({ _id: { $in: employeeIds } }).select('_id name employeeId').lean();
  const employeeById = new Map(employees.map((employee) => [String(employee._id), employee]));
  res.json({ ok: true, items: updates.flatMap((update) => {
    const employee = employeeById.get(String(update.employee));
    return employee ? [safeUpdate(update, employee)] : [];
  }) });
}));

r.put('/admin/:id', requireRole('admin'), wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Lead update not found');
  const input = leadInput.parse(req.body);
  const update = await EmployeeLeadUpdate.findByIdAndUpdate(req.params.id, input, { new: true, runValidators: true });
  if (!update) throw new HttpError(404, 'Lead update not found');
  const employee = await User.findById(update.employee).select('_id name employeeId').lean();
  if (!employee) throw new HttpError(404, 'Employee not found');
  audit(req, 'employee_lead_update_admin_edit', String(update._id), { employeeId: employee.employeeId, dateKey: update.dateKey });
  res.json({ ok: true, item: safeUpdate(update, employee) });
}));

export default r;
