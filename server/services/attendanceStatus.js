import { minuteOfDay } from '../utils/time.js';

/** >=presentMin Present; [halfMin, halfMax] Half Day; (halfMax, presentMin) Needs Review; <halfMin Absent. */
export function statusFromMinutes(mins, s) {
  if (mins >= s.presentMinMinutes) return 'Present';
  if (mins >= s.halfDayMinMinutes && mins <= s.halfDayMaxMinutes) return 'Half Day';
  if (mins > s.halfDayMaxMinutes) return 'Needs Review';
  return 'Absent';
}
export function lateInfo(checkIn, s) {
  if (!checkIn) return { late: false, minutesLate: 0 };
  const m = minuteOfDay(new Date(checkIn), s.timezone);
  return m > s.lateThresholdMinutes ? { late: true, minutesLate: m - s.lateThresholdMinutes } : { late: false, minutesLate: 0 };
}
export function computeRecord(att, s) {
  if (!att || !att.checkIn) return { status: 'Absent', workingMinutes: 0 };
  if (!att.checkOut) return { status: 'In Progress', workingMinutes: 0 };
  const mins = Math.max(0, Math.round((new Date(att.checkOut) - new Date(att.checkIn)) / 60000));
  return { status: statusFromMinutes(mins, s), workingMinutes: mins };
}
