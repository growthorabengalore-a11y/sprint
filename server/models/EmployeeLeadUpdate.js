import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  dateKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  leadCount: { type: Number, required: true, min: 1, max: 100000 },
  assignedTo: { type: String, required: true, trim: true, maxlength: 100 },
  leadStatus: { type: String, required: true, enum: ['Cold', 'Warm', 'Hot'] },
  paymentStatus: { type: String, required: true, trim: true, maxlength: 500 },
}, { timestamps: true });

schema.index({ employee: 1, dateKey: -1 });
schema.index({ dateKey: -1, createdAt: -1 });

export const EmployeeLeadUpdate = mongoose.model('EmployeeLeadUpdate', schema);
