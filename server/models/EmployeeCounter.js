import mongoose from 'mongoose';
const schema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 260 } });
export const EmployeeCounter = mongoose.model('EmployeeCounter', schema);
/** Atomic, concurrency-safe, never reused. Counter starts at 260 so the first id is Growthora261. */
export async function nextEmployeeId() {
  try { await EmployeeCounter.updateOne({ _id: 'employee' }, { $setOnInsert: { seq: 260 } }, { upsert: true }); }
  catch (e) { if (e.code !== 11000) throw e; } // concurrent first-time upsert: counter already exists
  const c = await EmployeeCounter.findOneAndUpdate({ _id: 'employee' }, { $inc: { seq: 1 } }, { new: true });
  return `Growthora${c.seq}`;
}
