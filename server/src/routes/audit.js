import express from 'express';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /audit  — head_coach only
router.get('/', requireAuth, requireRole('head_coach'), async (req, res) => {
  const { entityType, entityId } = req.query;
  const clauses = [];
  const params = [];

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
    console.error('audit list error:', err.message);
    return res.status(500).json({ error: 'Failed to load audit log' });
  }
});

export default router;
