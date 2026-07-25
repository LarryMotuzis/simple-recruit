import jwt from 'jsonwebtoken';

export type Role = 'admin' | 'head_coach' | 'assistant' | 'viewer';

export interface TokenUser {
  id: string;
  role: Role;
  email: string;
}

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  email: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: string;
  iat: number;
  exp: number;
}

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

// Re-bind to new consts so TS carries the above null-check's narrowing into the
// functions below (narrowing doesn't persist into nested function bodies).
const accessSecret: string = ACCESS_SECRET;
const refreshSecret: string = REFRESH_SECRET;

export function signAccessToken(user: TokenUser): string {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    accessSecret,
    { expiresIn: ACCESS_TTL as jwt.SignOptions['expiresIn'] }
  );
}

export function signRefreshToken(user: TokenUser): string {
  return jwt.sign({ sub: user.id }, refreshSecret, {
    expiresIn: REFRESH_TTL as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, accessSecret) as unknown as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, refreshSecret) as unknown as RefreshTokenPayload;
}
