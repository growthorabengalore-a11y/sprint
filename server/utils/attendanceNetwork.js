import { BlockList, isIP } from 'node:net';

export const ATTENDANCE_NETWORK_MESSAGE = 'Please connect to office Itrosys 2 Wi-Fi and take attendance.';

const OFFICE_PUBLIC_IP = '119.82.121.76';
const cloudflareAddresses = new BlockList();

for (const [subnet, prefix, family] of [
  ['173.245.48.0', 20, 'ipv4'], ['103.21.244.0', 22, 'ipv4'], ['103.22.200.0', 22, 'ipv4'],
  ['103.31.4.0', 22, 'ipv4'], ['141.101.64.0', 18, 'ipv4'], ['108.162.192.0', 18, 'ipv4'],
  ['190.93.240.0', 20, 'ipv4'], ['188.114.96.0', 20, 'ipv4'], ['197.234.240.0', 22, 'ipv4'],
  ['198.41.128.0', 17, 'ipv4'], ['162.158.0.0', 15, 'ipv4'], ['104.16.0.0', 13, 'ipv4'],
  ['104.24.0.0', 14, 'ipv4'], ['172.64.0.0', 13, 'ipv4'], ['131.0.72.0', 22, 'ipv4'],
  ['2400:cb00::', 32, 'ipv6'], ['2606:4700::', 32, 'ipv6'], ['2803:f800::', 32, 'ipv6'],
  ['2405:b500::', 32, 'ipv6'], ['2405:8100::', 32, 'ipv6'], ['2a06:98c0::', 29, 'ipv6'],
  ['2c0f:f248::', 32, 'ipv6'],
]) cloudflareAddresses.addSubnet(subnet, prefix, family);

export function attendanceClientIp(proxyIp, cloudflareClientIp) {
  const proxyFamily = isIP(proxyIp);
  const clientFamily = isIP(cloudflareClientIp);
  if (proxyFamily && clientFamily &&
    cloudflareAddresses.check(proxyIp, proxyFamily === 4 ? 'ipv4' : 'ipv6')) {
    return cloudflareClientIp;
  }
  return proxyIp;
}

export function isOfficeAttendanceNetwork(ip) {
  return typeof ip === 'string' && ip.toLowerCase().replace(/^::ffff:/, '') === OFFICE_PUBLIC_IP;
}

export function isAttendanceNetworkAllowed(user, ip) {
  return Boolean(user?.branchId) || isOfficeAttendanceNetwork(ip);
}
