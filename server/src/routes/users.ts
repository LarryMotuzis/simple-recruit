import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { errorMessage } from '../lib/errors.js';
import { z } from '../lib/zod.js';
import { registry } from '../lib/openapi.js';
import { validate } from '../lib/validate.js';
import { idParamSchema, userSchema } from '../lib/commonSchemas.js';

const router = express.Router();

const createUserSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    fullName: z.string().min(1),
    role: z.enum(['head_coach', 'assistant', 'viewer']).optional(),
  })
  .openapi('CreateUser');

const updateRoleSchema = z
  .object({
    role: z.enum(['head_coach', 'assistant', 'viewer']),
  })
  .openapi('UpdateUserRole');

registry.registerPath({
  method: 'get',
  path: '/users',
  tags: ['users'],
  summary: 'List all users (admin only)',
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'All users', content: { 'application/json': { schema: z.object({ users: z.array(userSchema) }) } } },
    401: { description: 'Not authenticated' },
    403: { description: 'Insufficient permissions — admin only' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/users',
  tags: ['users'],
  summary: 'Create a new user (admin only)',
  security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: createUserSchema } } } },
  responses: {
    201: { description: 'Created user', content: { 'application/json': { schema: z.object({ user: userSchema }) } } },
    400: { description: 'Missing or invalid fields' },
    401: { description: 'Not authenticated' },
    403: { description: 'Insufficient permissions — admin only' },
    409: { description: 'Email already registered' },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/users/{id}/role',
  tags: ['users'],
  summary: "Update a user's role (admin only)",
  security: [{ bearerAuth: [] }],
  request: {
    params: idParamSchema,
    body: { content: { 'application/json': { schema: updateRoleSchema } } },
  },
  responses: {
    200: { description: 'Updated user', content: { 'application/json': { schema: z.object({ user: userSchema }) } } },
    400: { description: 'Invalid role, or attempting to change your own role' },
    401: { description: 'Not authenticated' },
    403: { description: 'Insufficient permissions — admin only' },
    404: { description: 'User not found' },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/users/{id}',
  tags: ['users'],
  summary: 'Delete a user (admin only, cannot delete self)',
  security: [{ bearerAuth: [] }],
  request: { params: idParamSchema },
  responses: {
    204: { description: 'Deleted' },
    400: { description: 'Attempting to delete your own account' },
    401: { description: 'Not authenticated' },
    403: { description: 'Insufficient permissions — admin only' },
    404: { description: 'User not found' },
  },
});

// GET /users — list all users (head_coach only)
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, full_name, role FROM users ORDER BY full_name ASC',
      []
    );
    return res.json({ users: result.rows });
  } catch (err) {
    console.error('list users error:', errorMessage(err));
    return res.status(500).json({ error: 'Failed to list users' });
  }
});

// POST /users — create a new user (head_coach only)
router.post('/', requireAuth, requireRole('admin'), validate({ body: createUserSchema }), async (req, res) => {
  const { email, password, fullName, role } = req.body as z.infer<typeof createUserSchema>;

  const safeRole = role ?? 'viewer';

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
    console.error('create user error:', errorMessage(err));
    return res.status(500).json({ error: 'Failed to create user' });
  }
});

// PATCH /users/:id/role — update a user's role (head_coach only)
router.patch(
  '/:id/role',
  requireAuth,
  requireRole('admin'),
  validate({ params: idParamSchema, body: updateRoleSchema }),
  async (req, res) => {
    const { id } = req.params;
    const { role } = req.body as z.infer<typeof updateRoleSchema>;

    // Prevent admin from demoting themselves
    if (id === req.user!.id) {
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
      console.error('update role error:', errorMessage(err));
      return res.status(500).json({ error: 'Failed to update role' });
    }
  }
);

// DELETE /users/:id — remove a user (admin only, cannot delete self)
router.delete('/:id', requireAuth, requireRole('admin'), validate({ params: idParamSchema }), async (req, res) => {
  const { id } = req.params;

  if (id === req.user!.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  try {
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(204).end();
  } catch (err) {
    console.error('delete user error:', errorMessage(err));
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
