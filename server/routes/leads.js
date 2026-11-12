import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { LeadCRM } from '../models/LeadCRM.js';
import { audit } from '../models/AuditLog.js';
import { HttpError, wrap, requireAuth, requireRole } from '../middleware/auth.js';
import { isValidDateKey } from '../utils/time.js';

const r = Router();
const validDateKey = (value) => isValidDateKey(value)
  && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  role: z.string().trim().min(1).max(100),
}).strict();
const updateSchema = z.object({
  leads: z.array(z.object({
    sharedTo: z.string().trim().min(1).max(100),
    type: z.enum(['Cold', 'Warm', 'Hot']),
    remarks: z.string().trim().max(500).default(''),
  }).strict()).min(1).max(100),
}).strict();
const safeContact = (contact) => {
  const value = typeof contact.toObject === 'function' ? contact.toObject() : contact;
  return {
    ...value,
    id: String(value._id),
    updates: value.updates.map((update) => ({
      ...update,
      id: String(update._id),
      leads: update.leads.map((lead) => ({ ...lead })),
    })),
  };
};

r.use(requireAuth, requireRole('admin'));

r.get('/', wrap(async (_req, res) => {
  const contacts = await LeadCRM.find().sort({ name: 1, createdAt: -1 }).lean();
  res.json({ ok: true, items: contacts.map(safeContact) });
}));

r.post('/', wrap(async (req, res) => {
  const input = contactSchema.parse(req.body);
  const contact = await LeadCRM.create(input);
  audit(req, 'lead_crm_create', String(contact._id), { name: contact.name });
  res.status(201).json({ ok: true, contact: safeContact(contact) });
}));

r.put('/:id', wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'CRM lead not found');
  const input = contactSchema.parse(req.body);
  const contact = await LeadCRM.findByIdAndUpdate(req.params.id, input, { new: true, runValidators: true });
  if (!contact) throw new HttpError(404, 'CRM lead not found');
  audit(req, 'lead_crm_update', String(contact._id), { name: contact.name });
  res.json({ ok: true, contact: safeContact(contact) });
}));

r.put('/:id/updates/:date', wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'CRM lead not found');
  const date = z.string().refine(validDateKey, 'Enter a valid date').parse(req.params.date);
  const input = updateSchema.parse(req.body);
  const contact = await LeadCRM.findById(req.params.id);
  if (!contact) throw new HttpError(404, 'CRM lead not found');
  const recordedAt = new Date();
  const update = contact.updates.find((entry) => entry.date === date);
  if (update) {
    update.leads = input.leads;
    update.recordedAt = recordedAt;
  } else {
    contact.updates.push({ date, leads: input.leads, recordedAt });
  }
  await contact.save();
  audit(req, 'lead_crm_daily_update', String(contact._id), { date, leadCount: input.leads.length });
  res.json({ ok: true, contact: safeContact(contact) });
}));

r.delete('/:id', wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'CRM lead not found');
  const contact = await LeadCRM.findByIdAndDelete(req.params.id);
  if (!contact) throw new HttpError(404, 'CRM lead not found');
  audit(req, 'lead_crm_delete', String(contact._id), { name: contact.name });
  res.json({ ok: true });
}));

export default r;
