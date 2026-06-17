import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../lib/tokens.js';

const router = express.Router();

const REFRESH_COOKIE = 'refresh_token';
const isProd = process.env.NODE_ENV === 'production';
const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  // cross-origin (Vercel frontend ↔ Railway backend) requires SameSite=None + Secure
  sameSite: isProd ? 'none' : 'lax',
  path: '/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// POST /auth/register
router.post('/register', async (req, res) => {
  const { email, password, fullName, role } = req.body;
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'email, password, and fullName are required' });
  }

  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 12);
    // Default role is viewer; only allow explicit role if it's a valid value.
    const safeRole = ['head_coach', 'assistant', 'viewer'].includes(role) ? role : 'viewer';

    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, role`,
      [email, hash, fullName, safeRole]
    );

    return res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error('register error:', err.message);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const result = await query(
      'SELECT id, email, password_hash, full_name, title, role FROM users WHERE email = $1',
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
      user: { id: user.id, email: user.email, fullName: user.full_name, title: user.title, role: user.role },
    });
  } catch (err) {
    console.error('login error:', err.message);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) return res.status(401).json({ error: 'No refresh token' });

  try {
    const payload = verifyRefreshToken(token);
    const result = await query(
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
