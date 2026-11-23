export const teamCategories = ['funding', 'certificate', 'compliance', 'service', 'marketing'];

export function nextTeamSeries(existingSeries) {
  const used = new Set(existingSeries);
  for (let index = 0; ; index++) {
    let value = index + 1;
    let series = '';
    while (value > 0) {
      value -= 1;
      series = String.fromCharCode(65 + value % 26) + series;
      value = Math.floor(value / 26);
    }
    if (!used.has(series)) return series;
  }
}

export function isSaturdayDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime())
    && date.toISOString().slice(0, 10) === value
    && date.getUTCDay() === 6;
}

export function nextSaturday(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  const offset = (6 - date.getUTCDay() + 7) % 7;
  return new Date(date.getTime() + offset * 86400000).toISOString().slice(0, 10);
}

export function calculateTeamPerformance(targets, archived) {
  const target = targets.reduce((sum, item) => sum + item.count, 0);
  const achieved = archived.reduce((sum, item) => sum + item.count, 0);
  return { target, archived: achieved, percentage: target ? Math.min(achieved / target * 100, 100) : 0 };
}

export function hasCompleteArchive(targets, archived) {
  return targets.length > 0
    && targets.length === archived.length
    && targets.every((target) => archived.some((item) => item.category === target.category));
}
