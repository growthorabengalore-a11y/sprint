import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  address: { type: String, required: true, trim: true, maxlength: 500 },
  branchId: { type: String, required: true, trim: true, maxlength: 60, unique: true },
}, { timestamps: true });

export const Branch = mongoose.model('Branch', schema);
