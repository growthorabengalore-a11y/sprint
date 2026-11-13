import jwt from 'jsonwebtoken';

const ISSUER = 'growthora-attendance';
const AUDIENCE = 'attendance-fallback';
export const ATTENDANCE_FALLBACK_WAIT_SECONDS = 60;

export class AttendanceFallbackError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

export function createAttendanceFallbackToken(employeeId, mode, secret, now = Date.now()) {
  const iat = Math.floor(now / 1000);
  const nbf = iat + ATTENDANCE_FALLBACK_WAIT_SECONDS;
  const exp = iat + 8 * 60 * 60;
  const token = jwt.sign({
    sub: String(employeeId), mode, purpose: AUDIENCE, iat, nbf, exp, iss: ISSUER, aud: AUDIENCE,
  }, secret);
  return { token, availableAt: nbf * 1000 };
}

export function verifyAttendanceFallbackToken(token, employeeId, mode, secret, now = Date.now()) {
  let claims;
  try {
    claims = jwt.verify(token, secret, {
      issuer: ISSUER,
      audience: AUDIENCE,
      clockTimestamp: Math.floor(now / 1000),
    });
  } catch (error) {
    if (error.name === 'NotBeforeError') throw new AttendanceFallbackError('WAIT');
    throw new AttendanceFallbackError('INVALID');
  }
  if (claims.sub !== String(employeeId) || claims.mode !== mode || claims.purpose !== AUDIENCE) {
    throw new AttendanceFallbackError('INVALID');
  }
}
