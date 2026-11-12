import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
  sharedTo: { type: String, required: true, trim: true, maxlength: 100 },
  type: { type: String, required: true, enum: ['Cold', 'Warm', 'Hot'] },
  remarks: { type: String, trim: true, maxlength: 500, default: '' },
});

const dailyUpdateSchema = new mongoose.Schema({
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  leads: { type: [leadSchema], required: true, validate: { validator: (leads) => leads.length > 0 && leads.length <= 100, message: 'Enter between 1 and 100 leads' } },
  recordedAt: { type: Date, required: true, default: Date.now },
});

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  role: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  updates: { type: [dailyUpdateSchema], default: [] },
}, { timestamps: true });

schema.index({ name: 1 });

export const LeadCRM = mongoose.model('LeadCRM', schema);
