export const ATTENDANCE_NETWORK_MESSAGE = 'Please connect to office Itrosys 2 Wi-Fi and take attendance.';

const OFFICE_PUBLIC_IP = '119.82.121.76';

export function isOfficeAttendanceNetwork(ip) {
  return typeof ip === 'string' && ip.toLowerCase().replace(/^::ffff:/, '') === OFFICE_PUBLIC_IP;
}
