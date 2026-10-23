import { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Client } from '../models/Client.js';
import { ClientIntakeLink } from '../models/ClientIntakeLink.js';
import { audit } from '../models/AuditLog.js';
import { HttpError, wrap, requireAuth, requireRole } from '../middleware/auth.js';
import { uploadRoot } from '../services/faceFiles.js';
import { getSettings } from '../services/settings.js';
import { isValidDateKey, localDateKey } from '../utils/time.js';

const r = Router();
const publicIntakeLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Too many intake submissions. Please try again later.' },
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowed = file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/');
    callback(allowed ? null : new HttpError(400, 'Upload one image or PDF file'), allowed);
  },
});

const clientSchema = z.object({
  name: z.string().trim().min(2).max(100),
  companyName: z.string().trim().min(1).max(150),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  email: z.string().trim().email().max(200),
  browser: z.string().trim().min(1).max(100),
  filedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid filed date')
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, 'Enter a valid filed date'),
});
const statusSchema = z.object({ status: z.enum(['Draft', 'Active', 'Blocked', 'Completed', 'On Hold']) });
const safeView = (client) => ({
  id: client._id,
  name: client.name,
  companyName: client.companyName,
  phone: client.phone,
  email: client.email,
  browser: client.browser || 'Not provided',
  filedDate: client.filedDate,
  attachment: client.attachment?.path ? {
    url: client.attachment.url?.replace(/^\/api(?=\/)/, '') || `/clients/${client._id}/file`,
    name: client.attachment.originalName,
    mimeType: client.attachment.mimeType,
  } : null,
  status: client.status,
  createdAt: client.createdAt,
  updatedAt: client.updatedAt,
});

function detectFile(file) {
  const b = file.buffer;
  if (b.subarray(0, 5).toString() === '%PDF-') return { extension: '.pdf', mimeType: 'application/pdf' };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { extension: '.jpg', mimeType: 'image/jpeg' };
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { extension: '.png', mimeType: 'image/png' };
  if (b.subarray(0, 6).toString() === 'GIF87a' || b.subarray(0, 6).toString() === 'GIF89a') return { extension: '.gif', mimeType: 'image/gif' };
  if (b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return { extension: '.webp', mimeType: 'image/webp' };
  if (b.subarray(0, 2).toString() === 'BM') return { extension: '.bmp', mimeType: 'image/bmp' };
  if ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0x00)
    || (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00 && b[3] === 0x2a)) {
    return { extension: '.tiff', mimeType: 'image/tiff' };
  }
  if (b.subarray(4, 8).toString() === 'ftyp') {
    const brand = b.subarray(8, 12).toString();
    if (['avif', 'avis'].includes(brand)) return { extension: '.avif', mimeType: 'image/avif' };
    if (/^(hei[csx]|hev[csx]|mif1|msf1)$/.test(brand)) return { extension: '.heic', mimeType: 'image/heic' };
  }
  throw new HttpError(400, 'File must be a valid image or PDF');
}
async function saveAttachment(file) {
  if (!file) return null;
  const detected = detectFile(file);
  if (file.mimetype !== detected.mimeType && !(detected.mimeType.startsWith('image/') && file.mimetype.startsWith('image/'))) {
    throw new HttpError(400, 'The uploaded file type does not match its contents');
  }
  const dir = path.join(uploadRoot(), 'clients');
  await fs.mkdir(dir, { recursive: true });
  const filename = `${crypto.randomUUID()}${detected.extension}`;
  await fs.writeFile(path.join(dir, filename), file.buffer, { flag: 'wx' });
  return { path: `clients/${filename}`, originalName: path.basename(file.originalname).slice(0, 200), mimeType: detected.mimeType };
}
async function createClient(data, attachment, status = 'Active') {
  const client = new Client({ ...data, attachment: attachment || undefined, status });
  if (attachment) client.attachment.url = `/clients/${client._id}/file`;
  await client.save();
  return client;
}
async function removeAttachment(relativePath) {
  const root = uploadRoot();
  const target = path.resolve(root, relativePath);
  if (!target.startsWith(`${root}${path.sep}`)) throw new HttpError(400, 'Invalid attachment path');
  try { await fs.unlink(target); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
function parseClientBody(body) {
  return clientSchema.parse({
    ...body,
    name: String(body.name ?? ''),
    companyName: String(body.companyName ?? ''),
    phone: String(body.phone ?? ''),
    email: String(body.email ?? ''),
    browser: String(body.browser ?? ''),
    filedDate: String(body.filedDate ?? ''),
  });
}
function queryFilter(query) {
  const filter = {};
  for (const [parameter, field] of [['name', 'name'], ['companyName', 'companyName'], ['phone', 'phone'], ['email', 'email']]) {
    const value = String(query[parameter] || '').trim();
    if (value) filter[field] = { $regex: value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }
  if (query.q) {
    const rx = new RegExp(String(query.q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { companyName: rx }, { email: rx }, { phone: rx }];
  }
  if (query.status && query.status !== 'All') filter.status = query.status;
  return filter;
}

r.post('/public/:token', publicIntakeLimit, upload.single('attachment'), wrap(async (req, res) => {
  const link = await ClientIntakeLink.findOne({ token: req.params.token });
  if (!link) throw new HttpError(404, 'This client form link is invalid');
  const data = parseClientBody(req.body);
  let attachment;
  try {
    attachment = await saveAttachment(req.file);
    const client = await createClient(data, attachment);
    res.status(201).json({ ok: true, message: 'Client form submitted successfully', client: safeView(client) });
  } catch (error) {
    if (attachment) await removeAttachment(attachment.path);
    throw error;
  }
}));

r.use(requireAuth, requireRole('admin'));

r.get('/intake-link', wrap(async (_req, res) => {
  let link = await ClientIntakeLink.findById('public-client-intake');
  if (!link) {
    try {
      link = await ClientIntakeLink.create({ _id: 'public-client-intake', token: crypto.randomBytes(32).toString('base64url') });
    } catch (error) {
      if (error.code !== 11000) throw error;
      link = await ClientIntakeLink.findById('public-client-intake');
    }
  }
  res.json({ ok: true, token: link.token });
}));

r.get('/export', wrap(async (req, res) => {
  const clients = await Client.find(queryFilter(req.query)).sort({ createdAt: -1, _id: -1 });
  res.json({ ok: true, items: clients.map(safeView), total: clients.length });
}));

r.get('/', wrap(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const filter = queryFilter(req.query);
  const [clients, total] = await Promise.all([
    Client.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit),
    Client.countDocuments(filter),
  ]);
  res.json({ ok: true, items: clients.map(safeView), total, page, limit });
}));

r.get('/summary', wrap(async (req, res) => {
  const settings = await getSettings();
  const today = localDateKey(new Date(), settings.timezone);
  const requestedDate = req.query.date ? String(req.query.date) : '';
  if (requestedDate && !isValidDateKey(requestedDate)) throw new HttpError(400, 'Invalid summary date');
  const pipeline = [
    { $addFields: { submittedDate: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: settings.timezone } } } },
  ];
  if (requestedDate) pipeline.push({ $match: { submittedDate: requestedDate } });
  pipeline.push(
    { $group: {
      _id: null,
      totalClients: { $sum: 1 },
      uniquePhones: { $addToSet: '$phone' },
      todaySubmitted: { $sum: { $cond: [{ $eq: ['$submittedDate', today] }, 1, 0] } },
    } },
    { $project: { _id: 0, totalClients: 1, uniqueClients: { $size: '$uniquePhones' }, todaySubmitted: 1 } },
  );
  const [result] = await Client.aggregate(pipeline);
  res.json({ ok: true, date: requestedDate || null, summary: result || { totalClients: 0, uniqueClients: 0, todaySubmitted: 0 } });
}));

r.get('/search', wrap(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) throw new HttpError(400, 'Enter a name, email, company, or phone number');
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const client = await Client.findOne({ $or: [{ name: rx }, { companyName: rx }, { email: rx }, { phone: rx }] }).sort({ createdAt: -1 });
  if (!client) throw new HttpError(404, 'No matching client found');
  res.json({ ok: true, client: safeView(client) });
}));

r.post('/', upload.single('attachment'), wrap(async (req, res) => {
  const data = parseClientBody(req.body);
  let attachment;
  try {
    attachment = await saveAttachment(req.file);
    const client = await createClient(data, attachment);
    audit(req, 'client_create', String(client._id));
    res.status(201).json({ ok: true, client: safeView(client) });
  } catch (error) {
    if (attachment) await removeAttachment(attachment.path);
    throw error;
  }
}));

r.get('/:id/file', wrap(async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client?.attachment?.path) throw new HttpError(404, 'Attachment not found');
  const root = uploadRoot();
  const target = path.resolve(root, client.attachment.path);
  if (!target.startsWith(`${root}${path.sep}`)) throw new HttpError(400, 'Invalid attachment path');
  res.type(client.attachment.mimeType);
  res.set('Content-Disposition', `inline; filename="${encodeURIComponent(client.attachment.originalName)}"`);
  res.sendFile(target);
}));

r.get('/:id', wrap(async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) throw new HttpError(404, 'Client not found');
  res.json({ ok: true, client: safeView(client) });
}));

r.put('/:id', upload.single('attachment'), wrap(async (req, res) => {
  const data = parseClientBody(req.body);
  const client = await Client.findById(req.params.id);
  if (!client) throw new HttpError(404, 'Client not found');
  const previousPath = client.attachment?.path;
  const attachment = req.file ? await saveAttachment(req.file) : client.attachment;
  Object.assign(client, data);
  if (req.file) {
    client.attachment = { ...attachment, url: `/clients/${client._id}/file` };
  }
  try { await client.save(); }
  catch (error) {
    if (req.file && attachment?.path) await removeAttachment(attachment.path);
    throw error;
  }
  if (req.file && previousPath) await removeAttachment(previousPath);
  audit(req, 'client_update', String(client._id));
  res.json({ ok: true, client: safeView(client) });
}));

r.patch('/:id/status', wrap(async (req, res) => {
  const { status } = statusSchema.parse(req.body);
  const client = await Client.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
  if (!client) throw new HttpError(404, 'Client not found');
  audit(req, 'client_status', String(client._id), { status });
  res.json({ ok: true, client: safeView(client) });
}));

r.delete('/:id', wrap(async (req, res) => {
  const client = await Client.findByIdAndDelete(req.params.id);
  if (!client) throw new HttpError(404, 'Client not found');
  if (client.attachment?.path) await removeAttachment(client.attachment.path);
  audit(req, 'client_delete', String(client._id));
  res.json({ ok: true });
}));

export default r;
