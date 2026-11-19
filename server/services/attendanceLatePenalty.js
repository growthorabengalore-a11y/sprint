import { isWorkingDay } from './performance.js';
import { lateInfo } from './attendanceStatus.js';
import { rangeKeys } from '../utils/time.js';

export function monthlyLatePenaltyFlags(employees, attendanceRecords, recordStart, monthStart, today, settings) {
  const lateDatesByEmployee = new Map();
  for (const attendance of attendanceRecords) {
    if (!attendance.checkIn || !lateInfo(attendance.checkIn, settings).late) continue;
    const employeeId = String(attendance.employee);
    if (!lateDatesByEmployee.has(employeeId)) lateDatesByEmployee.set(employeeId, new Set());
    lateDatesByEmployee.get(employeeId).add(attendance.dateKey);
  }
  const workingDays = rangeKeys(recordStart, today).filter((date) => isWorkingDay(date, settings));

  const flags = [];
  for (const employee of employees) {
    const dates = lateDatesByEmployee.get(String(employee._id)) || new Set();
    const lateDaysThisMonth = [...dates].filter((date) => date >= monthStart && date <= today).length;
    let consecutiveLateDays = 0;
    let hasThreeConsecutiveLateDays = false;
    for (const date of workingDays) {
      consecutiveLateDays = dates.has(date) ? consecutiveLateDays + 1 : 0;
      if (consecutiveLateDays === 3 && date >= monthStart) hasThreeConsecutiveLateDays = true;
    }
    if (lateDaysThisMonth < 3 && !hasThreeConsecutiveLateDays) continue;
    flags.push({
      id: employee._id,
      name: employee.name,
      employeeId: employee.employeeId,
      lateDaysThisMonth,
      hasThreeConsecutiveLateDays,
      halfDayCut: 1,
    });
  }
  return flags;
}
