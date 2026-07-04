import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TTL = process.env.REFRESH_TOKEN_TTL || '7d';

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET env vars are required');
}

// Validate TTL format — jwt accepts e.g. "15m", "7d", "3600" (seconds as string)
const TTL_RE = /^\d+[smhd]?$/;
if (!TTL_RE.test(ACCESS_TTL) || !TTL_RE.test(REFRESH_TTL)) {
  throw new Error(`Invalid token TTL format. Got ACCESS_TOKEN_TTL="${ACCESS_TTL}", REFRESH_TOKEN_TTL="${REFRESH_TTL}". Expected e.g. "15m", "7d", "3600".`);
}

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    ACCESS_SECRET,
    { expiresIn: ACCESS_TTL }
  );
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: user.id }, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}
