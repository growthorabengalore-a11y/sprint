import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, trim: true, lowercase: true, maxlength: 200 },
  phone: { type: String, trim: true },
  jobRole: { type: String, trim: true, maxlength: 80, default: 'BDE' },
  employeeId: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'employee', 'branchAdmin', 'hr', 'operations'], default: 'employee', index: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
  branchName: { type: String, trim: true, maxlength: 100, default: null },
  roleAddress: { type: String, trim: true, maxlength: 500, default: null },
  pagePermissions: { type: [String], default: [] },
  isActive: { type: Boolean, default: true },
  mustChangePassword: { type: Boolean, default: false },
  faceRegistered: { type: Boolean, default: false },
  archived: { type: Boolean, default: false, index: true },
  failedLogins: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  tokenVersion: { type: Number, default: 0 },
}, { timestamps: true });
export const User = mongoose.model('User', schema);
