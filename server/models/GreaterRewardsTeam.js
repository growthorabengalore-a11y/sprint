import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0.01, max: 1000000000 },
  dateKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
}, { timestamps: true });

const memberSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  designation: { type: String, required: true, trim: true, maxlength: 100 },
  payments: { type: [paymentSchema], default: [] },
}, { timestamps: true });

const schema = new mongoose.Schema({
  teamName: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  weeklyTarget: { type: Number, required: true, min: 0.01, max: 1000000000 },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
  branchName: { type: String, trim: true, maxlength: 100, default: null },
  members: { type: [memberSchema], default: [] },
}, { timestamps: true });

schema.index({ branchId: 1, teamName: 1 });

export const GreaterRewardsTeam = mongoose.model('GreaterRewardsTeam', schema);
