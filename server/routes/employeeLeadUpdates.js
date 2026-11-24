import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { EmployeeLeadUpdate } from '../models/EmployeeLeadUpdate.js';
import { User } from '../models/User.js';
import { audit } from '../models/AuditLog.js';
import { blockIfMustChange, HttpError, requireAuth, requireRole, requireAdminPage, employeeScope, wrap } from '../middleware/auth.js';
import { getSettings } from '../services/settings.js';
import { businessDateKey, isValidDateKey } from '../utils/time.js';

const r = Router();
const editWindowMs = 60 * 60 * 1000;
export const isEmployeeLeadUpdateEditable = (update, now, today) => {
  const age = now.getTime() - new Date(update.createdAt).getTime();
  return update.dateKey === today && age >= 0 && age < editWindowMs;
};
const leadSchema = z.object({
  assignedTo: z.string().trim().min(1).max(100),
  leadStatus: z.enum(['Cold', 'Warm', 'Hot']),
  paymentStatus: z.string().trim().min(1).max(500),
}).strict();
const leadInput = z.object({
  leads: z.array(leadSchema).min(1).max(100),
}).strict();
const adminLeadInput = z.object({
  leads: z.array(leadSchema.extend({
    leaderRemarks: z.string().trim().max(500).optional(),
  }).strict()).min(1).max(100),
}).strict();
const leaderRemarksInput = z.object({
  leadIndex: z.number().int().min(0).max(99),
  leaderRemarks: z.string().trim().max(500),
}).strict();

function safeUpdate(update, employee, editableUntil = null) {
  const leads = Array.isArray(update.leads) && update.leads.length
    ? update.leads
    : [{
      assignedTo: update.assignedTo || '—',
      leadStatus: update.leadStatus || 'Cold',
      paymentStatus: update.paymentStatus || '',
      leaderRemarks: update.leaderRemarks || '',
      legacyCount: update.leadCount,
    }];
  return {
    id: String(update._id),
    employeeId: String(employee._id),
    employeeName: employee.name,
    employeeCode: employee.employeeId,
    dateKey: update.dateKey,
    leadCount: update.leadCount || leads.length,
    editableUntil,
    leads: leads.map((lead) => ({
      assignedTo: lead.assignedTo,
      leadStatus: lead.leadStatus,
      paymentStatus: lead.paymentStatus,
      leaderRemarks: lead.leaderRemarks || '',
      leadCount: lead.legacyCount || 1,
    })),
    createdAt: update.createdAt,
    updatedAt: update.updatedAt,
  };
}

r.use(requireAuth, blockIfMustChange);

r.get('/my', requireRole('employee'), wrap(async (req, res) => {
  const updates = await EmployeeLeadUpdate.find({ employee: req.user._id }).sort({ createdAt: -1 }).limit(1000).lean();
  const now = new Date();
  const settings = await getSettings();
  const today = businessDateKey(now, settings);
  res.json({ ok: true, items: updates.map((update) => {
    const editableUntil = isEmployeeLeadUpdateEditable(update, now, today)
      ? new Date(new Date(update.createdAt).getTime() + editWindowMs).toISOString()
      : null;
    return safeUpdate(update, req.user, editableUntil);
  }) });
}));

r.post('/', requireRole('employee'), wrap(async (req, res) => {
  const input = leadInput.parse(req.body);
  const settings = await getSettings();
  const dateKey = businessDateKey(new Date(), settings);
  const update = await EmployeeLeadUpdate.create({
    employee: req.user._id,
    dateKey,
    leadCount: input.leads.length,
    leads: input.leads,
  });
  audit(req, 'employee_lead_update_create', String(update._id), { dateKey, leadCount: update.leadCount });
  res.status(201).json({ ok: true, item: safeUpdate(update, req.user) });
}));

r.put('/:id', requireRole('employee'), wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Lead update not found');
  const input = leadInput.parse(req.body);
  const update = await findEditableUpdate(req.params.id, req.user._id);
  update.leadCount = input.leads.length;
  update.leads = input.leads.map((lead, index) => ({
    ...lead,
    leaderRemarks: update.leads?.[index]?.leaderRemarks ?? (index === 0 ? update.leaderRemarks : ''),
  }));
  update.leaderRemarks = undefined;
  update.assignedTo = undefined;
  update.leadStatus = undefined;
  update.paymentStatus = undefined;
  await update.save();
  audit(req, 'employee_lead_update_edit', String(update._id), { dateKey: update.dateKey, leadCount: update.leadCount });
  res.json({ ok: true, item: safeUpdate(update, req.user) });
}));

r.delete('/:id', requireRole('employee'), wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Lead update not found');
  const update = await findEditableUpdate(req.params.id, req.user._id);
  await update.deleteOne();
  audit(req, 'employee_lead_update_delete', String(update._id), { dateKey: update.dateKey, leadCount: update.leadCount });
  res.json({ ok: true });
}));

r.get('/admin', requireAdminPage('leads'), wrap(async (req, res) => {
  const scopedEmployees = await User.find(employeeScope(req)).distinct('_id');
  const query = { employee: { $in: scopedEmployees } };
  const from = req.query.from ? z.string().refine(isValidDateKey, 'Enter a valid start date').parse(req.query.from) : null;
  const to = req.query.to ? z.string().refine(isValidDateKey, 'Enter a valid end date').parse(req.query.to) : null;
  if (from && to && from > to) throw new HttpError(400, 'Start date must be on or before end date');
  if (from || to) query.dateKey = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  if (req.query.employeeId) {
    if (!mongoose.isValidObjectId(req.query.employeeId)) throw new HttpError(400, 'Invalid employee');
    query.employee = scopedEmployees.some((id) => String(id) === String(req.query.employeeId)) ? req.query.employeeId : { $in: [] };
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

async function findEditableUpdate(id, employeeId) {
  const update = await EmployeeLeadUpdate.findOne({ _id: id, employee: employeeId });
  if (!update) throw new HttpError(404, 'Lead update not found');
  const now = new Date();
  const settings = await getSettings();
  if (!isEmployeeLeadUpdateEditable(update, now, businessDateKey(now, settings))) {
    throw new HttpError(403, 'Lead updates can only be edited or deleted within one hour of submission on the same business day.');
  }
  return update;
}

r.put('/admin/:id', requireAdminPage('leads'), wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Lead update not found');
  const input = adminLeadInput.parse(req.body);
  const scopedEmployees = await User.find(employeeScope(req)).distinct('_id');
  const update = await EmployeeLeadUpdate.findOne({ _id: req.params.id, employee: { $in: scopedEmployees } });
  if (!update) throw new HttpError(404, 'Lead update not found');
  update.leadCount = input.leads.length;
  update.leads = input.leads.map((lead, index) => ({
    ...lead,
    leaderRemarks: lead.leaderRemarks ?? update.leads?.[index]?.leaderRemarks ?? (index === 0 ? update.leaderRemarks : ''),
  }));
  update.leaderRemarks = undefined;
  update.assignedTo = undefined;
  update.leadStatus = undefined;
  update.paymentStatus = undefined;
  await update.save();
  const employee = await User.findById(update.employee).select('_id name employeeId').lean();
  if (!employee) throw new HttpError(404, 'Employee not found');
  audit(req, 'employee_lead_update_admin_edit', String(update._id), { employeeId: employee.employeeId, dateKey: update.dateKey });
  res.json({ ok: true, item: safeUpdate(update, employee) });
}));

r.put('/admin/:id/remarks', requireAdminPage('leads'), wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Lead update not found');
  const input = leaderRemarksInput.parse(req.body);
  const scopedEmployees = await User.find(employeeScope(req)).distinct('_id');
  const update = await EmployeeLeadUpdate.findOne({ _id: req.params.id, employee: { $in: scopedEmployees } });
  if (!update) throw new HttpError(404, 'Lead update not found');
  if (Array.isArray(update.leads) && update.leads.length) {
    if (input.leadIndex >= update.leads.length) throw new HttpError(400, 'Lead not found in this update');
    update.leads[input.leadIndex].leaderRemarks = input.leaderRemarks;
  } else {
    if (input.leadIndex !== 0) throw new HttpError(400, 'Lead not found in this update');
    update.leaderRemarks = input.leaderRemarks;
  }
  await update.save();
  audit(req, 'employee_lead_update_leader_remarks', String(update._id), { leadIndex: input.leadIndex });
  res.json({ ok: true, leaderRemarks: input.leaderRemarks });
}));

export default r;
