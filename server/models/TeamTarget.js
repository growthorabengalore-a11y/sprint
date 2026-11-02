import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0 },
  countedAmount: { type: Number, required: true, min: 0 },
  recordedAt: { type: Date, required: true, default: Date.now },
});

const dailyEntrySchema = new mongoose.Schema({
  date: { type: String, required: true },
  enteredAmount: { type: Number, min: 0 },
  achieved: { type: Number, required: true, min: 0 },
  recordedAt: { type: Date, required: true, default: Date.now },
  payments: { type: [paymentSchema], default: [] },
}, { _id: false });

const schema = new mongoose.Schema({
  leaderName: { type: String, required: true, trim: true, maxlength: 100 },
  members: { type: [{ type: String, trim: true, maxlength: 100 }], required: true },
  weeklyTarget: { type: Number, required: true, min: 1, max: 1000000000 },
  status: { type: String, enum: ['active', 'draft'], default: 'active', index: true },
  dailyEntries: { type: [dailyEntrySchema], default: [] },
}, { timestamps: true });

schema.index({ leaderName: 1 });

export const TeamTarget = mongoose.model('TeamTarget', schema);
