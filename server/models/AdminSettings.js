import mongoose from 'mongoose';
export const AdminSettings = mongoose.model('AdminSettings', new mongoose.Schema({ key: { type: String, unique: true }, data: mongoose.Schema.Types.Mixed }, { timestamps: true }));
