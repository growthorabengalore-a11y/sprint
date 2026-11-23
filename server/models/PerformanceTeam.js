import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  category: { type: String, enum: ['funding', 'certificate', 'compliance', 'service', 'marketing'], required: true },
  count: { type: Number, required: true, min: 0, validate: Number.isInteger },
}, { _id: false });

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  role: { type: String, required: true, trim: true, maxlength: 100 },
}, { timestamps: true });

const weeklyMemberSchema = new mongoose.Schema({
  memberId: { type: mongoose.Schema.Types.ObjectId, required: true },
  memberName: { type: String, required: true, trim: true, maxlength: 100 },
  role: { type: String, required: true, trim: true, maxlength: 100 },
  targets: { type: [categorySchema], default: [] },
  archived: { type: [categorySchema], default: [] },
}, { _id: false });

const weekSchema = new mongoose.Schema({
  weekEnding: { type: String, required: true },
  members: { type: [weeklyMemberSchema], default: [] },
  archivedAt: { type: Date, default: null },
}, { _id: false });

const schema = new mongoose.Schema({
  teamSeries: { type: String, required: true, trim: true, maxlength: 12 },
  teamName: { type: String, required: true, trim: true, maxlength: 100 },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
  branchName: { type: String, trim: true, maxlength: 100, default: null },
  members: { type: [memberSchema], default: [] },
  weeks: { type: [weekSchema], default: [] },
}, { timestamps: true });

schema.index({ branchId: 1, teamSeries: 1 }, { unique: true });

export const PerformanceTeam = mongoose.model('PerformanceTeam', schema);
