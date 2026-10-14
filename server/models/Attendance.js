import mongoose from 'mongoose';
const verification = { method: { type: String, enum: ['face', 'manual'] }, distance: Number, liveness: Boolean, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, reason: String };
const schema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dateKey: { type: String, required: true },
  checkIn: Date,
  checkOut: Date,
  workingMinutes: { type: Number, default: 0 },
  status: { type: String, default: 'In Progress' },
  checkInVerification: verification,
  checkOutVerification: verification,
  corrections: [{ by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: Date, reason: String, before: Object, after: Object }],
}, { timestamps: true });
schema.index({ employee: 1, dateKey: 1 }, { unique: true });
schema.index({ dateKey: 1 });
export const Attendance = mongoose.model('Attendance', schema);
