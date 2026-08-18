import express from 'express';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { recordAudit, diffFields } from '../services/auditService.js';
import { efficiency, fgPercentage, averageEfficiency, type BoxScoreStat } from '../services/metricsService.js';
import type { StatEntryRow } from '../types/domain.js';
import { errorMessage } from '../lib/errors.js';

// stat_entries columns are nullable in the DB; metricsService expects undefined for "not present".
function toBoxScoreStat(row: StatEntryRow): BoxScoreStat {
  return {
    points: row.points ?? undefined,
    rebounds: row.rebounds ?? undefined,
    assists: row.assists ?? undefined,
    fg_made: row.fg_made ?? undefined,
    fg_attempted: row.fg_attempted ?? undefined,
  };
}
import { z } from '../lib/zod.js';
import { registry } from '../lib/openapi.js';
import { validate } from '../lib/validate.js';
import { idParamSchema } from '../lib/commonSchemas.js';

const router = express.Router();

const STAGES = ['keeping_tabs', 'evaluating', 'offered', 'committed'] as const;
const stageSchema = z.enum(STAGES);
const prospectTypeSchema = z.enum(['high_school', 'transfer', 'juco']);

const prospectSchema = z
  .object({
    id: z.string().uuid(),
    full_name: z.string(),
    position: z.string().nullable(),
    secondary_position: z.string().nullable(),
    grad_year: z.number().nullable(),
    height_inches: z.number().nullable(),
    weight_lbs: z.number().nullable(),
    region: z.string().nullable(),
    current_school: z.string().nullable(),
    stage: stageSchema,
    stage_order: z.number(),
    is_archived: z.boolean(),
    created_by: z.string().uuid().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    in_portal: z.boolean(),
    notes: z.string().nullable(),
    prospect_type: prospectTypeSchema,
    contact_phone: z.string().nullable(),
    contact_email: z.string().nullable(),
    parent_name: z.string().nullable(),
    parent_phone: z.string().nullable(),
    parent_email: z.string().nullable(),
    aau_coach_name: z.string().nullable(),
    aau_coach_phone: z.string().nullable(),
    aau_coach_email: z.string().nullable(),
    hs_coach_name: z.string().nullable(),
    hs_coach_phone: z.string().nullable(),
    hs_coach_email: z.string().nullable(),
  })
  .openapi('Prospect');

const evaluationSchema = z
  .object({
    id: z.string().uuid(),
    prospect_id: z.string().uuid(),
    author_id: z.string().uuid().nullable(),
    eval_date: z.string(),
    rating: z.number(),
    notes: z.string().nullable(),
    tags: z.array(z.string()).nullable(),
    created_at: z.string(),
    author_name: z.string().nullable().optional(),
  })
  .openapi('Evaluation');

const prospectQuerySchema = z.object({
  search: z.string().optional(),
  position: z.string().optional(),
  gradYear: z.coerce.number().optional(),
  stage: stageSchema.optional(),
  region: z.string().optional(),
  heightMin: z.coerce.number().optional(),
  heightMax: z.coerce.number().optional(),
  prospectType: prospectTypeSchema.optional(),
});

const createProspectSchema = z
  .object({
    fullName: z.string().min(1),
    position: z.string().optional(),
    secondaryPosition: z.string().optional(),
    gradYear: z.number().optional(),
    heightInches: z.number().optional(),
    weightLbs: z.number().optional(),
    region: z.string().optional(),
    currentSchool: z.string().optional(),
    inPortal: z.boolean().optional(),
    notes: z.string().optional(),
    prospectType: prospectTypeSchema.optional(),
    contactPhone: z.string().optional(),
    contactEmail: z.string().optional(),
    parentName: z.string().optional(),
    parentPhone: z.string().optional(),
    parentEmail: z.string().optional(),
    aauCoachName: z.string().optional(),
    aauCoachPhone: z.string().optional(),
    aauCoachEmail: z.string().optional(),
    hsCoachName: z.string().optional(),
    hsCoachPhone: z.string().optional(),
    hsCoachEmail: z.string().optional(),
  })
  .openapi('CreateProspect');

const patchProspectSchema = z
  .object({
    fullName: z.string().min(1).optional(),
    position: z.string().nullable().optional(),
    secondaryPosition: z.string().nullable().optional(),
    gradYear: z.number().nullable().optional(),
    heightInches: z.number().nullable().optional(),
    weightLbs: z.number().nullable().optional(),
    region: z.string().nullable().optional(),
    currentSchool: z.string().nullable().optional(),
    inPortal: z.boolean().optional(),
    notes: z.string().nullable().optional(),
    prospectType: prospectTypeSchema.optional(),
    contactPhone: z.string().nullable().optional(),
    contactEmail: z.string().nullable().optional(),
    parentName: z.string().nullable().optional(),
    parentPhone: z.string().nullable().optional(),
    parentEmail: z.string().nullable().optional(),
    aauCoachName: z.string().nullable().optional(),
    aauCoachPhone: z.string().nullable().optional(),
    aauCoachEmail: z.string().nullable().optional(),
    hsCoachName: z.string().nullable().optional(),
    hsCoachPhone: z.string().nullable().optional(),
    hsCoachEmail: z.string().nullable().optional(),
  })
  .openapi('UpdateProspect');

const stageChangeSchema = z
  .object({
    stage: stageSchema,
    stageOrder: z.number().optional(),
  })
  .openapi('ChangeProspectStage');

const createEvaluationSchema = z
  .object({
    rating: z.number().min(1).max(10),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
    evalDate: z.string().optional(),
  })
  .openapi('CreateEvaluation');

const statEntrySchema = z
  .object({
    id: z.string().uuid(),
    prospect_id: z.string().uuid(),
    game_date: z.string(),
    points: z.number().nullable(),
    rebounds: z.number().nullable(),
    assists: z.number().nullable(),
    fg_made: z.number().nullable(),
    fg_attempted: z.number().nullable(),
    minutes: z.number().nullable(),
    created_at: z.string(),
    efficiency: z.number(),
    fg_percentage: z.number(),
  })
  .openapi('StatEntry');

const createStatEntrySchema = z
  .object({
    gameDate: z.string().optional(),
    points: z.number().min(0).optional(),
    rebounds: z.number().min(0).optional(),
    assists: z.number().min(0).optional(),
    fgMade: z.number().min(0).optional(),
    fgAttempted: z.number().min(0).optional(),
  })
  .openapi('CreateStatEntry');

registry.registerPath({
  method: 'get',
  path: '/prospects',
  tags: ['prospects'],
  summary: 'List prospects with search and filters',
  security: [{ bearerAuth: [] }],
  request: { query: prospectQuerySchema },
  responses: {
    200: { description: 'Prospects', content: { 'application/json': { schema: z.object({ prospects: z.array(prospectSchema) }) } } },
    401: { description: 'Not authenticated' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/prospects/{id}',
  tags: ['prospects'],
  summary: 'Get a single prospect',
  security: [{ bearerAuth: [] }],
  request: { params: idParamSchema },
  responses: {
    200: { description: 'Prospect', content: { 'application/json': { schema: z.object({ prospect: prospectSchema }) } } },
    401: { description: 'Not authenticated' },
    404: { description: 'Not found' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/prospects',
  tags: ['prospects'],
  summary: 'Add a new prospect',
  security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: createProspectSchema } } } },
  responses: {
    201: { description: 'Created prospect', content: { 'application/json': { schema: z.object({ prospect: prospectSchema }) } } },
    400: { description: 'fullName is required' },
    401: { description: 'Not authenticated' },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/prospects/{id}',
  tags: ['prospects'],
  summary: 'Update a prospect (partial)',
  security: [{ bearerAuth: [] }],
  request: { params: idParamSchema, body: { content: { 'application/json': { schema: patchProspectSchema } } } },
  responses: {
    200: { description: 'Updated prospect', content: { 'application/json': { schema: z.object({ prospect: prospectSchema }) } } },
    400: { description: 'No updatable fields provided' },
    401: { description: 'Not authenticated' },
    403: { description: 'Insufficient permissions' },
    404: { description: 'Not found' },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/prospects/{id}/stage',
  tags: ['prospects'],
  summary: 'Move a prospect to a different pipeline stage',
  security: [{ bearerAuth: [] }],
  request: { params: idParamSchema, body: { content: { 'application/json': { schema: stageChangeSchema } } } },
  responses: {
    200: { description: 'Updated prospect', content: { 'application/json': { schema: z.object({ prospect: prospectSchema }) } } },
    400: { description: 'Invalid stage' },
    401: { description: 'Not authenticated' },
    404: { description: 'Not found' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/prospects/{id}/archive',
  tags: ['prospects'],
  summary: 'Archive (soft-delete) a prospect',
  security: [{ bearerAuth: [] }],
  request: { params: idParamSchema },
  responses: {
    204: { description: 'Archived' },
    401: { description: 'Not authenticated' },
    403: { description: 'Insufficient permissions — head_coach only' },
    404: { description: 'Not found' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/prospects/{id}/evaluations',
  tags: ['prospects'],
  summary: 'List evaluations for a prospect',
  security: [{ bearerAuth: [] }],
  request: { params: idParamSchema },
  responses: {
    200: { description: 'Evaluations', content: { 'application/json': { schema: z.object({ evaluations: z.array(evaluationSchema) }) } } },
    401: { description: 'Not authenticated' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/prospects/{id}/evaluations',
  tags: ['prospects'],
  summary: 'Submit an evaluation for a prospect',
  security: [{ bearerAuth: [] }],
  request: { params: idParamSchema, body: { content: { 'application/json': { schema: createEvaluationSchema } } } },
  responses: {
    201: { description: 'Created evaluation', content: { 'application/json': { schema: z.object({ evaluation: evaluationSchema }) } } },
    400: { description: 'rating must be 1-10' },
    401: { description: 'Not authenticated' },
    404: { description: 'Prospect not found' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/prospects/{id}/stats',
  tags: ['prospects'],
  summary: 'List box-score stat entries for a prospect, with computed efficiency metrics',
  security: [{ bearerAuth: [] }],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: 'Stat entries',
      content: {
        'application/json': {
          schema: z.object({ statEntries: z.array(statEntrySchema), averageEfficiency: z.number() }),
        },
      },
    },
    401: { description: 'Not authenticated' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/prospects/{id}/stats',
  tags: ['prospects'],
  summary: 'Log a box-score stat entry for a prospect',
  security: [{ bearerAuth: [] }],
  request: { params: idParamSchema, body: { content: { 'application/json': { schema: createStatEntrySchema } } } },
  responses: {
    201: { description: 'Created stat entry', content: { 'application/json': { schema: z.object({ statEntry: statEntrySchema }) } } },
    401: { description: 'Not authenticated' },
    404: { description: 'Prospect not found' },
  },
});

// GET /prospects  — list with search + filters
router.get('/', requireAuth, validate({ query: prospectQuerySchema }), async (req, res) => {
  const { search, position, gradYear, stage, region, heightMin, heightMax, prospectType } =
    req.query as unknown as z.infer<typeof prospectQuerySchema>;
  const clauses: string[] = ['is_archived = FALSE'];
  const params: unknown[] = [];

  if (search) {
    params.push(`%${search}%`);
    clauses.push(`full_name ILIKE $${params.length}`);
  }
  if (position) {
    params.push(position);
    clauses.push(`(position = $${params.length} OR secondary_position = $${params.length})`);
  }
  if (gradYear) {
    params.push(gradYear);
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
    params.push(heightMin);
    clauses.push(`height_inches >= $${params.length}`);
  }
  if (heightMax) {
    params.push(heightMax);
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
    console.error('list prospects error:', errorMessage(err));
    return res.status(500).json({ error: 'Failed to load prospects' });
  }
});

// GET /prospects/:id
router.get('/:id', requireAuth, validate({ params: idParamSchema }), async (req, res) => {
  try {
    const result = await query('SELECT * FROM prospects WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    return res.json({ prospect: result.rows[0] });
  } catch (err) {
    console.error('get prospect error:', errorMessage(err));
    return res.status(500).json({ error: 'Failed to load prospect' });
  }
});

// POST /prospects — all authenticated users can add
router.post('/', requireAuth, validate({ body: createProspectSchema }), async (req, res) => {
  const {
    fullName, position, secondaryPosition, gradYear, heightInches, weightLbs, region,
    currentSchool, inPortal, notes, prospectType, contactPhone, contactEmail,
    parentName, parentPhone, parentEmail,
    aauCoachName, aauCoachPhone, aauCoachEmail,
    hsCoachName, hsCoachPhone, hsCoachEmail,
  } = req.body as z.infer<typeof createProspectSchema>;

  const safeType = prospectType ?? 'high_school';

  try {
    const result = await query(
      `INSERT INTO prospects (
         full_name, position, secondary_position, grad_year, height_inches, weight_lbs, region, current_school,
         in_portal, notes, prospect_type, contact_phone, contact_email,
         parent_name, parent_phone, parent_email,
         aau_coach_name, aau_coach_phone, aau_coach_email,
         hs_coach_name, hs_coach_phone, hs_coach_email,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
       RETURNING *`,
      [
        fullName, position ?? null, secondaryPosition ?? null, gradYear ?? null, heightInches ?? null, weightLbs ?? null, region ?? null, currentSchool ?? null,
        inPortal ?? false, notes ?? null, safeType, contactPhone ?? null, contactEmail ?? null,
        parentName ?? null, parentPhone ?? null, parentEmail ?? null,
        aauCoachName ?? null, aauCoachPhone ?? null, aauCoachEmail ?? null,
        hsCoachName ?? null, hsCoachPhone ?? null, hsCoachEmail ?? null,
        req.user!.id,
      ]
    );
    const prospect = result.rows[0];
    recordAudit({ actorId: req.user!.id, entityType: 'prospect', entityId: prospect.id, action: 'create' })
      .catch(e => console.error('audit error:', errorMessage(e)));
    return res.status(201).json({ prospect });
  } catch (err) {
    console.error('create prospect error:', errorMessage(err));
    return res.status(500).json({ error: 'Failed to create prospect' });
  }
});

// PATCH /prospects/:id
router.patch(
  '/:id',
  requireAuth,
  requireRole('head_coach', 'assistant'),
  validate({ params: idParamSchema, body: patchProspectSchema }),
  async (req, res) => {
    const fieldMap: Record<string, string> = {
      fullName: 'full_name',
      position: 'position',
      secondaryPosition: 'secondary_position',
      gradYear: 'grad_year',
      heightInches: 'height_inches',
      weightLbs: 'weight_lbs',
      region: 'region',
      currentSchool: 'current_school',
      inPortal: 'in_portal',
      notes: 'notes',
      prospectType: 'prospect_type',
      contactPhone: 'contact_phone',
      contactEmail: 'contact_email',
      parentName: 'parent_name',
      parentPhone: 'parent_phone',
      parentEmail: 'parent_email',
      aauCoachName: 'aau_coach_name',
      aauCoachPhone: 'aau_coach_phone',
      aauCoachEmail: 'aau_coach_email',
      hsCoachName: 'hs_coach_name',
      hsCoachPhone: 'hs_coach_phone',
      hsCoachEmail: 'hs_coach_email',
    };

    const body = req.body as z.infer<typeof patchProspectSchema> & Record<string, unknown>;

    try {
      const current = await query('SELECT * FROM prospects WHERE id = $1', [req.params.id]);
      if (current.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      const before = current.rows[0];

      const sets: string[] = [];
      const params: unknown[] = [];
      const after: Record<string, unknown> = {};
      for (const [apiKey, col] of Object.entries(fieldMap)) {
        if (body[apiKey] !== undefined) {
          params.push(body[apiKey]);
          sets.push(`${col} = $${params.length}`);
          after[col] = body[apiKey];
        }
      }
      if (sets.length === 0) return res.status(400).json({ error: 'No updatable fields provided' });

      params.push(req.params.id);
      const result = await query(
        `UPDATE prospects SET ${sets.join(', ')}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
        params
      );

      for (const change of diffFields(before, after)) {
        recordAudit({ actorId: req.user!.id, entityType: 'prospect', entityId: req.params.id, action: 'update', ...change })
          .catch(e => console.error('audit error:', errorMessage(e)));
      }

      return res.json({ prospect: result.rows[0] });
    } catch (err) {
      console.error('update prospect error:', errorMessage(err));
      return res.status(500).json({ error: 'Failed to update prospect' });
    }
  }
);

// PATCH /prospects/:id/stage  — all authenticated users can move stages
router.patch('/:id/stage', requireAuth, validate({ params: idParamSchema, body: stageChangeSchema }), async (req, res) => {
  const { stage, stageOrder } = req.body as z.infer<typeof stageChangeSchema>;

  try {
    const current = await query('SELECT stage FROM prospects WHERE id = $1', [req.params.id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const oldStage = current.rows[0].stage;

    const result = await query(
      `UPDATE prospects SET stage = $1, stage_order = $2, updated_at = now() WHERE id = $3 RETURNING *`,
      [stage, stageOrder ?? 0, req.params.id]
    );

    if (oldStage !== stage) {
      recordAudit({ actorId: req.user!.id, entityType: 'prospect', entityId: req.params.id, action: 'stage_change', field: 'stage', oldValue: oldStage, newValue: stage })
        .catch(e => console.error('audit error:', errorMessage(e)));
    }

    // Auto-add to the committing user's roster (or their team's roster) when stage becomes committed
    if (stage === 'committed' && oldStage !== 'committed') {
      const prospect = result.rows[0];
      const teamRow = await query<{ team_id: string | null }>('SELECT team_id FROM users WHERE id = $1', [req.user!.id]);
      const teamId = teamRow.rows[0]?.team_id ?? null;

      const alreadyOnRoster = teamId
        ? await query('SELECT id FROM roster WHERE prospect_id = $1 AND team_id = $2', [prospect.id, teamId])
        : await query('SELECT id FROM roster WHERE prospect_id = $1 AND user_id = $2', [prospect.id, req.user!.id]);

      if (alreadyOnRoster.rows.length === 0) {
        await query(
          `INSERT INTO roster (full_name, position, prospect_id, created_by, user_id, team_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [prospect.full_name, prospect.position || null, prospect.id, req.user!.id, req.user!.id, teamId]
        );
      }
    }

    return res.json({ prospect: result.rows[0] });
  } catch (err) {
    console.error('stage change error:', errorMessage(err));
    return res.status(500).json({ error: 'Failed to change stage' });
  }
});

// POST /prospects/:id/archive  — soft delete, head_coach only
router.post(
  '/:id/archive',
  requireAuth,
  requireRole('head_coach'),
  validate({ params: idParamSchema }),
  async (req, res) => {
    try {
      const result = await query(
        `UPDATE prospects SET is_archived = TRUE, updated_at = now() WHERE id = $1 RETURNING id`,
        [req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

      recordAudit({ actorId: req.user!.id, entityType: 'prospect', entityId: req.params.id, action: 'archive' })
        .catch(e => console.error('audit error:', errorMessage(e)));
      return res.status(204).end();
    } catch (err) {
      console.error('archive error:', errorMessage(err));
      return res.status(500).json({ error: 'Failed to archive prospect' });
    }
  }
);

// GET /prospects/:id/evaluations
router.get('/:id/evaluations', requireAuth, validate({ params: idParamSchema }), async (req, res) => {
  try {
    const result = await query(
      `SELECT e.*, u.full_name AS author_name
       FROM evaluations e
       LEFT JOIN users u ON u.id = e.author_id
       WHERE e.prospect_id = $1
       ORDER BY e.eval_date ASC, e.created_at ASC`,
      [req.params.id]
    );
    return res.json({ evaluations: result.rows });
  } catch (err) {
    console.error('list evaluations error:', errorMessage(err));
    return res.status(500).json({ error: 'Failed to load evaluations' });
  }
});

// POST /prospects/:id/evaluations — all authenticated users can submit evaluations
router.post(
  '/:id/evaluations',
  requireAuth,
  validate({ params: idParamSchema, body: createEvaluationSchema }),
  async (req, res) => {
    const { rating, notes, tags, evalDate } = req.body as z.infer<typeof createEvaluationSchema>;

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
          req.user!.id,
          evalDate || new Date().toISOString().slice(0, 10),
          rating,
          notes || null,
          tags && tags.length ? tags : null,
        ]
      );
      const evaluation = result.rows[0];

      await recordAudit({
        actorId: req.user!.id,
        entityType: 'evaluation',
        entityId: evaluation.id,
        action: 'create',
        field: 'rating',
        newValue: String(rating),
      });

      return res.status(201).json({ evaluation });
    } catch (err) {
      console.error('create evaluation error:', errorMessage(err));
      return res.status(500).json({ error: 'Failed to create evaluation' });
    }
  }
);

// GET /prospects/:id/stats — box-score entries plus computed efficiency metrics
router.get('/:id/stats', requireAuth, validate({ params: idParamSchema }), async (req, res) => {
  try {
    const result = await query<StatEntryRow>(
      `SELECT * FROM stat_entries WHERE prospect_id = $1 ORDER BY game_date ASC, created_at ASC`,
      [req.params.id]
    );
    const statEntries = result.rows.map((row) => ({
      ...row,
      efficiency: efficiency(toBoxScoreStat(row)),
      fg_percentage: fgPercentage(toBoxScoreStat(row)),
    }));
    return res.json({ statEntries, averageEfficiency: averageEfficiency(result.rows.map(toBoxScoreStat)) });
  } catch (err) {
    console.error('list stat entries error:', errorMessage(err));
    return res.status(500).json({ error: 'Failed to load stat entries' });
  }
});

// POST /prospects/:id/stats — all authenticated users can log a box score
router.post(
  '/:id/stats',
  requireAuth,
  validate({ params: idParamSchema, body: createStatEntrySchema }),
  async (req, res) => {
    const { gameDate, points, rebounds, assists, fgMade, fgAttempted } =
      req.body as z.infer<typeof createStatEntrySchema>;

    try {
      const prospectCheck = await query('SELECT id FROM prospects WHERE id = $1', [req.params.id]);
      if (prospectCheck.rows.length === 0) return res.status(404).json({ error: 'Prospect not found' });

      const result = await query<StatEntryRow>(
        `INSERT INTO stat_entries (prospect_id, game_date, points, rebounds, assists, fg_made, fg_attempted)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          req.params.id,
          gameDate || new Date().toISOString().slice(0, 10),
          points ?? 0,
          rebounds ?? 0,
          assists ?? 0,
          fgMade ?? 0,
          fgAttempted ?? 0,
        ]
      );
      const row = result.rows[0];
      const statEntry = {
        ...row,
        efficiency: efficiency(toBoxScoreStat(row)),
        fg_percentage: fgPercentage(toBoxScoreStat(row)),
      };

      await recordAudit({
        actorId: req.user!.id,
        entityType: 'stat_entry',
        entityId: statEntry.id,
        action: 'create',
      });

      return res.status(201).json({ statEntry });
    } catch (err) {
      console.error('create stat entry error:', errorMessage(err));
      return res.status(500).json({ error: 'Failed to create stat entry' });
    }
  }
);

export default router;
