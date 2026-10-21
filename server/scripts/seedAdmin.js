import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env, assertEnv } from '../config/env.js';
import { User } from '../models/User.js';

assertEnv();
const { ADMIN_ID, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_ID || !ADMIN_PASSWORD) throw new Error('Set ADMIN_ID and ADMIN_PASSWORD in .env');
if (ADMIN_PASSWORD.length < 10) throw new Error('ADMIN_PASSWORD must be at least 10 characters');
await mongoose.connect(env.mongoUri);
const exists = await User.findOne({ employeeId: ADMIN_ID });
if (exists) console.log('Admin already exists; nothing changed.');
else {
  await User.create({ employeeId: ADMIN_ID, name: ADMIN_NAME || 'Admin', email: ADMIN_EMAIL, role: 'admin', passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12) });
  console.log(`Admin "${ADMIN_ID}" created.`);
}
await mongoose.disconnect();
