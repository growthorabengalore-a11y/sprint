import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, actorLabel: String,
  action: { type: String, index: true }, target: String, details: Object, ip: String,
}, { timestamps: true });
schema.index({ createdAt: -1 });
export const AuditLog = mongoose.model('AuditLog', schema);
export const audit = (req, action, target, details) =>
  AuditLog.create({ actor: req.user?._id, actorLabel: req.user?.employeeId, action, target, details, ip: req.ip }).catch(() => {});
