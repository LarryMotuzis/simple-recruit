import express from 'express';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { recordAudit, diffFields } from '../services/auditService.js';

const router = express.Router();

const STAGES = ['keeping_tabs', 'evaluating', 'offered', 'committed'];

// GET /prospects  — list with search + filters
router.get('/', requireAuth, async (req, res) => {
  const { search, position, gradYear, stage, region, heightMin, heightMax, prospectType } = req.query;
  const clauses = ['is_archived = FALSE'];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    clauses.push(`full_name ILIKE $${params.length}`);
  }
  if (position) {
    params.push(position);
    clauses.push(`(position = $${params.length} OR secondary_position = $${params.length})`);
  }
  if (gradYear) {
    params.push(Number(gradYear));
    clauses.push(`grad_year = $${params.length}`);
  }
  if (stage) {
    params.push(stage);
    clauses.push(`stage = $${params.length}`);
  }
  if (region) {
    params.push(region);
    clauses.push(`region = $${params.length}`);
  }
  if (heightMin) {
    params.push(Number(heightMin));
    clauses.push(`height_inches >= $${params.length}`);
  }
  if (heightMax) {
    params.push(Number(heightMax));
    clauses.push(`height_inches <= $${params.length}`);
  }
  if (prospectType) {
    params.push(prospectType);
    clauses.push(`prospect_type = $${params.length}`);
  }

  const sql = `SELECT * FROM prospects WHERE ${clauses.join(' AND ')} ORDER BY stage, stage_order`;
  try {
    const result = await query(sql, params);
    return res.json({ prospects: result.rows });
  } catch (err) {
    console.error('list prospects error:', err.message);
    return res.status(500).json({ error: 'Failed to load prospects' });
  }
});

// GET /prospects/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await query('SELECT * FROM prospects WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    return res.json({ prospect: result.rows[0] });
  } catch (err) {
    console.error('get prospect error:', err.message);
    return res.status(500).json({ error: 'Failed to load prospect' });
  }
});

// POST /prospects
router.post('/', requireAuth, requireRole('head_coach', 'assistant'), async (req, res) => {
  const { fullName, position, secondaryPosition, gradYear, heightInches, region, currentSchool, inPortal, notes, prospectType } = req.body;
  if (!fullName) return res.status(400).json({ error: 'fullName is required' });

  const VALID_TYPES = ['high_school', 'transfer', 'juco'];
  const safeType = VALID_TYPES.includes(prospectType) ? prospectType : 'high_school';

  try {
    const result = await query(
      `INSERT INTO prospects (full_name, position, secondary_position, grad_year, height_inches, region, current_school, in_portal, notes, prospect_type, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [fullName, position, secondaryPosition ?? null, gradYear, heightInches, region, currentSchool, inPortal ?? false, notes ?? null, safeType, req.user.id]
    );
    const prospect = result.rows[0];
    await recordAudit({
      actorId: req.user.id,
      entityType: 'prospect',
      entityId: prospect.id,
      action: 'create',
    });
    return res.status(201).json({ prospect });
  } catch (err) {
    console.error('create prospect error:', err.message);
    return res.status(500).json({ error: 'Failed to create prospect' });
  }
});

// PATCH /prospects/:id
router.patch('/:id', requireAuth, requireRole('head_coach', 'assistant'), async (req, res) => {
  const fieldMap = {
    fullName: 'full_name',
    position: 'position',
    secondaryPosition: 'secondary_position',
    gradYear: 'grad_year',
    heightInches: 'height_inches',
    region: 'region',
    currentSchool: 'current_school',
    inPortal: 'in_portal',
    notes: 'notes',
    prospectType: 'prospect_type',
  };

  try {
    const current = await query('SELECT * FROM prospects WHERE id = $1', [req.params.id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const before = current.rows[0];

    const sets = [];
    const params = [];
    const after = {};
    for (const [apiKey, col] of Object.entries(fieldMap)) {
      if (req.body[apiKey] !== undefined) {
        params.push(req.body[apiKey]);
        sets.push(`${col} = $${params.length}`);
        after[col] = req.body[apiKey];
      }
    }
    if (sets.length === 0) return res.status(400).json({ error: 'No updatable fields provided' });

    params.push(req.params.id);
    const result = await query(
      `UPDATE prospects SET ${sets.join(', ')}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
      params
    );

    for (const change of diffFields(before, after)) {
      await recordAudit({
        actorId: req.user.id,
        entityType: 'prospect',
        entityId: req.params.id,
        action: 'update',
        ...change,
      });
    }

    return res.json({ prospect: result.rows[0] });
  } catch (err) {
    console.error('update prospect error:', err.message);
    return res.status(500).json({ error: 'Failed to update prospect' });
  }
});

// PATCH /prospects/:id/stage  — Kanban drag
router.patch('/:id/stage', requireAuth, requireRole('head_coach', 'assistant'), async (req, res) => {
  const { stage, stageOrder } = req.body;
  if (!STAGES.includes(stage)) {
    return res.status(400).json({ error: `stage must be one of: ${STAGES.join(', ')}` });
  }

  try {
    const current = await query('SELECT stage FROM prospects WHERE id = $1', [req.params.id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const oldStage = current.rows[0].stage;

    const result = await query(
      `UPDATE prospects SET stage = $1, stage_order = $2, updated_at = now() WHERE id = $3 RETURNING *`,
      [stage, stageOrder ?? 0, req.params.id]
    );

    if (oldStage !== stage) {
      await recordAudit({
        actorId: req.user.id,
        entityType: 'prospect',
        entityId: req.params.id,
        action: 'stage_change',
        field: 'stage',
        oldValue: oldStage,
        newValue: stage,
      });
    }

    return res.json({ prospect: result.rows[0] });
  } catch (err) {
    console.error('stage change error:', err.message);
    return res.status(500).json({ error: 'Failed to change stage' });
  }
});

// POST /prospects/:id/archive  — soft delete, head_coach only
router.post('/:id/archive', requireAuth, requireRole('head_coach'), async (req, res) => {
  try {
    const result = await query(
      `UPDATE prospects SET is_archived = TRUE, updated_at = now() WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    await recordAudit({
      actorId: req.user.id,
      entityType: 'prospect',
      entityId: req.params.id,
      action: 'archive',
    });
    return res.status(204).end();
  } catch (err) {
    console.error('archive error:', err.message);
    return res.status(500).json({ error: 'Failed to archive prospect' });
  }
});

// GET /prospects/:id/evaluations
router.get('/:id/evaluations', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT e.*, u.full_name AS author_name
       FROM evaluations e
       JOIN users u ON u.id = e.author_id
       WHERE e.prospect_id = $1
       ORDER BY e.eval_date ASC, e.created_at ASC`,
      [req.params.id]
    );
    return res.json({ evaluations: result.rows });
  } catch (err) {
    console.error('list evaluations error:', err.message);
    return res.status(500).json({ error: 'Failed to load evaluations' });
  }
});

// POST /prospects/:id/evaluations
router.post('/:id/evaluations', requireAuth, requireRole('head_coach', 'assistant'), async (req, res) => {
  const { rating, notes, tags, evalDate } = req.body;
  if (!rating || rating < 1 || rating > 10) {
    return res.status(400).json({ error: 'rating must be 1–10' });
  }

  try {
    const prospectCheck = await query('SELECT id FROM prospects WHERE id = $1', [req.params.id]);
    if (prospectCheck.rows.length === 0) return res.status(404).json({ error: 'Prospect not found' });

    const result = await query(
      `WITH inserted AS (
         INSERT INTO evaluations (prospect_id, author_id, eval_date, rating, notes, tags)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *
       )
       SELECT i.*, u.full_name AS author_name
       FROM inserted i
       JOIN users u ON u.id = i.author_id`,
      [
        req.params.id,
        req.user.id,
        evalDate || new Date().toISOString().slice(0, 10),
        rating,
        notes || null,
        tags && tags.length ? tags : null,
      ]
    );
    const evaluation = result.rows[0];

    await recordAudit({
      actorId: req.user.id,
      entityType: 'evaluation',
      entityId: evaluation.id,
      action: 'create',
      field: 'rating',
      newValue: String(rating),
    });

    return res.status(201).json({ evaluation });
  } catch (err) {
    console.error('create evaluation error:', err.message);
    return res.status(500).json({ error: 'Failed to create evaluation' });
  }
});

export default router;