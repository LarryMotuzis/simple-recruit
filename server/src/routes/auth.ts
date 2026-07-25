import express from 'express';
import bcrypt from 'bcryptjs';
import type { CookieOptions } from 'express';
import { query } from '../db/pool.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type Role,
} from '../lib/tokens.js';
import { errorMessage } from '../lib/errors.js';
import { z } from '../lib/zod.js';
import { registry } from '../lib/openapi.js';
import { validate } from '../lib/validate.js';
import { userSchema } from '../lib/commonSchemas.js';

const router = express.Router();

const REFRESH_COOKIE = 'refresh_token';
const isProd = process.env.NODE_ENV === 'production';
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  // cross-origin (Vercel frontend ↔ Railway backend) requires SameSite=None + Secure
  sameSite: isProd ? 'none' : 'lax',
  path: '/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    fullName: z.string().min(1),
    role: z.enum(['head_coach', 'assistant', 'viewer']).optional(),
  })
  .openapi('Register');

const loginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .openapi('Login');

const loginUserSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    fullName: z.string(),
    role: z.enum(['admin', 'head_coach', 'assistant', 'viewer']),
  })
  .openapi('LoginUser');

const refreshUserSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    role: z.enum(['admin', 'head_coach', 'assistant', 'viewer']),
  })
  .openapi('RefreshUser');

registry.registerPath({
  method: 'post',
  path: '/auth/register',
  tags: ['auth'],
  summary: 'Register a new coach account',
  request: { body: { content: { 'application/json': { schema: registerSchema } } } },
  responses: {
    201: { description: 'Created user', content: { 'application/json': { schema: z.object({ user: userSchema }) } } },
    400: { description: 'Missing or invalid fields' },
    409: { description: 'Email already registered' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/login',
  tags: ['auth'],
  summary: 'Log in and receive an access token',
  description:
    'On success, also sets an httpOnly refresh_token cookie (scoped to /auth) used by POST /auth/refresh.',
  request: { body: { content: { 'application/json': { schema: loginSchema } } } },
  responses: {
    200: {
      description: 'Access token and user',
      content: { 'application/json': { schema: z.object({ accessToken: z.string(), user: loginUserSchema }) } },
    },
    400: { description: 'Missing email or password' },
    401: { description: 'Invalid credentials' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/refresh',
  tags: ['auth'],
  summary: 'Exchange the refresh_token cookie for a new access token',
  description: 'Requires the httpOnly refresh_token cookie set by POST /auth/login. No request body.',
  responses: {
    200: {
      description: 'New access token and user',
      content: { 'application/json': { schema: z.object({ accessToken: z.string(), user: refreshUserSchema }) } },
    },
    401: { description: 'Missing, invalid, or expired refresh token' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/logout',
  tags: ['auth'],
  summary: 'Clear the refresh_token cookie',
  responses: {
    204: { description: 'Logged out' },
  },
});

// POST /auth/register
router.post('/register', validate({ body: registerSchema }), async (req, res) => {
  const { email, password, fullName, role } = req.body as z.infer<typeof registerSchema>;

  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 12);
    // Default role is viewer; only allow explicit role if it's a valid value.
    const safeRole = role ?? 'viewer';

    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, role`,
      [email, hash, fullName, safeRole]
    );

    return res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error('register error:', errorMessage(err));
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /auth/login
router.post('/login', validate({ body: loginSchema }), async (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  try {
    const result = await query<{
      id: string;
      email: string;
      password_hash: string;
      full_name: string;
      role: Role;
    }>(
      'SELECT id, email, password_hash, full_name, role FROM users WHERE email = $1',
      [email]
    );
    const user = result.rows[0];

    // Same response whether the email is unknown or the password is wrong,
    // so we don't reveal which emails are registered.
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    return res.json({
      accessToken,
      user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
    });
  } catch (err) {
    console.error('login error:', errorMessage(err));
    return res.status(500).json({ error: 'Login failed' });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) return res.status(401).json({ error: 'No refresh token' });

  try {
    const payload = verifyRefreshToken(token);
    const result = await query<{ id: string; email: string; role: Role }>(
      'SELECT id, email, role FROM users WHERE id = $1',
      [payload.sub]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'User no longer exists' });

    return res.json({ accessToken: signAccessToken(user), user: { id: user.id, email: user.email, role: user.role } });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
  return res.status(204).end();
});

export default router;
