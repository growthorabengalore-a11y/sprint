import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  companyName: { type: String, required: true, trim: true, maxlength: 150 },
  phone: { type: String, required: true, match: /^[6-9]\d{9}$/ },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
  browser: { type: String, trim: true, maxlength: 100, default: 'Not provided' },
  filedDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  attachment: {
    path: { type: String, default: null },
    url: { type: String, default: null },
    originalName: { type: String, default: null },
    mimeType: { type: String, default: null },
  },
  status: { type: String, enum: ['Draft', 'Active', 'Blocked', 'Completed', 'On Hold'], default: 'Active', index: true },
}, { timestamps: true });

schema.index({ name: 'text', companyName: 'text', email: 'text', phone: 'text' });

export const Client = mongoose.model('Client', schema);
