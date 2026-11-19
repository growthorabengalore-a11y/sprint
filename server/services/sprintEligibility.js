export function isSprintEligible(user) {
  return String(user?.jobRole || 'BDE').trim().toLowerCase() === 'bde';
}

export const sprintEligibleEmployeeFilter = {
  $or: [
    { jobRole: /^BDE$/i },
    { jobRole: null },
    { jobRole: '' },
  ],
};
