import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import { env, assertEnv } from './config/env.js';
import { createApp } from './app.js';

assertEnv();
await mongoose.connect(env.mongoUri);
await mongoose.syncIndexes(); // ensure unique indexes exist
await fs.mkdir(env.uploadDir + '/faces', { recursive: true });
createApp().listen(env.port, () => console.log(`API on :${env.port}`));
