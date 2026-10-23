import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  _id: { type: String, default: 'public-client-intake' },
  token: { type: String, required: true, unique: true },
}, { timestamps: true });

export const ClientIntakeLink = mongoose.model('ClientIntakeLink', schema);
