import express from 'express';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { errorMessage } from '../lib/errors.js';
import { z } from '../lib/zod.js';
import { registry } from '../lib/openapi.js';
import { validate } from '../lib/validate.js';

const router = express.Router();

const auditEntrySchema = z
  .object({
    id: z.string(),
    actor_id: z.string().nullable(),
    entity_type: z.string(),
    entity_id: z.string(),
    action: z.string(),
    field: z.string().nullable(),
    old_value: z.string().nullable(),
    new_value: z.string().nullable(),
    created_at: z.string(),
    actor_name: z.string().nullable(),
  })
  .openapi('AuditLogEntry');

const auditQuerySchema = z
  .object({
    entityType: z.string().optional(),
    entityId: z.string().optional(),
  })
  .openapi('AuditLogQuery');

registry.registerPath({
  method: 'get',
  path: '/audit',
  tags: ['audit'],
  summary: 'List audit log entries (head_coach only)',
  security: [{ bearerAuth: [] }],
  request: { query: auditQuerySchema },
  responses: {
    200: {
      description: 'Audit log entries, most recent first',
      content: { 'application/json': { schema: z.object({ entries: z.array(auditEntrySchema) }) } },
    },
    401: { description: 'Not authenticated' },
    403: { description: 'Insufficient permissions — head_coach only' },
  },
});

// GET /audit  — head_coach only
router.get('/', requireAuth, requireRole('head_coach'), validate({ query: auditQuerySchema }), async (req, res) => {
  const { entityType, entityId } = req.query;
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (entityType) {
    params.push(entityType);
    clauses.push(`a.entity_type = $${params.length}`);
  }
  if (entityId) {
    params.push(entityId);
    clauses.push(`a.entity_id = $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `
    SELECT a.*, u.full_name AS actor_name
    FROM audit_log a
    LEFT JOIN users u ON u.id = a.actor_id
    ${where}
    ORDER BY a.created_at DESC
    LIMIT 200`;

  try {
    const result = await query(sql, params);
    return res.json({ entries: result.rows });
  } catch (err) {
    console.error('audit list error:', errorMessage(err));
    return res.status(500).json({ error: 'Failed to load audit log' });
  }
});

export default router;
