import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  imagePaths: [String], // relative to uploads/, never public
  embeddings: { type: [[Number]], select: false }, // 128-d descriptors, never returned by normal APIs
  modelId: { type: String, default: 'face-api.js/faceRecognitionNet-128d' },
  consent: { given: Boolean, at: Date, ip: String, textVersion: String },
  deletedAt: Date,
}, { timestamps: true });
export const FaceRegistration = mongoose.model('FaceRegistration', schema);
