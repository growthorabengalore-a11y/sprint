import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dateKey: { type: String, required: true },
  session: { type: String, enum: ['morning', 'evening'], required: true },
  talkTimeMinutes: { type: Number, required: true, min: 0, validate: Number.isInteger },
  leads: { type: Number, required: true, min: 0, validate: Number.isInteger },
  paymentAmount: { type: Number, required: true, min: 0 },
  paymentStatus: { type: String, enum: ['confirmed', 'not_confirm'], required: true },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });
schema.index({ employee: 1, dateKey: 1, session: 1 }, { unique: true });
schema.index({ dateKey: 1, session: 1 });
export const SprintSubmission = mongoose.model('SprintSubmission', schema);
