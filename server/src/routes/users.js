import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /users — list all users (head_coach only)
router.get('/', requireAuth, requireRole('head_coach'), async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, full_name, role FROM users ORDER BY full_name ASC',
      []
    );
    return res.json({ users: result.rows });
  } catch (err) {
    console.error('list users error:', err.message);
    return res.status(500).json({ error: 'Failed to list users' });
  }
});

// POST /users — create a new user (head_coach only)
router.post('/', requireAuth, requireRole('head_coach'), async (req, res) => {
  const { email, password, fullName, role } = req.body;
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'email, password, and fullName are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const safeRole = ['head_coach', 'assistant', 'viewer'].includes(role) ? role : 'viewer';

  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, role`,
      [email, hash, fullName, safeRole]
    );
    return res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error('create user error:', err.message);
    return res.status(500).json({ error: 'Failed to create user' });
  }
});

// PATCH /users/:id/role — update a user's role (head_coach only)
router.patch('/:id/role', requireAuth, requireRole('head_coach'), async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['head_coach', 'assistant', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  // Prevent a head coach from demoting themselves
  if (Number(id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot change your own role' });
  }

  try {
    const result = await query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, full_name, role',
      [role, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('update role error:', err.message);
    return res.status(500).json({ error: 'Failed to update role' });
  }
});

export default router;
