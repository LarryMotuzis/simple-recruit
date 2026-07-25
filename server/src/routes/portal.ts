import express from 'express';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { recordAudit } from '../services/auditService.js';
import { scrapeOn3Portal } from '../services/portalScraper.js';
import { errorMessage } from '../lib/errors.js';
import { z } from '../lib/zod.js';
import { registry } from '../lib/openapi.js';
import { validate } from '../lib/validate.js';
import { idParamSchema } from '../lib/commonSchemas.js';

const router = express.Router();

const csvLevelSchema = z.enum(['d2', 'juco_d1', 'juco_d2']);

const portalEntrySchema = z
  .object({
    id: z.string().uuid(),
    on3_key: z.number().nullable(),
    full_name: z.string(),
    position_abbr: z.string().nullable(),
    height: z.string().nullable(),
    class_rank: z.string().nullable(),
    from_school: z.string().nullable(),
    to_school: z.string().nullable(),
    status: z.string(),
    stars: z.number().nullable(),
    portal_entered_at: z.string().nullable(),
    on3_slug: z.string().nullable(),
    level: z.string(),
    source: z.string(),
    csv_key: z.string().nullable(),
    scraped_at: z.string(),
    imported_prospect_id: z.string().uuid().nullable(),
  })
  .openapi('PortalEntry');

const portalQuerySchema = z.object({
  status: z.string().optional(),
  position: z.string().optional(),
  level: z.string().optional().default('d1'),
});

const csvRowSchema = z.object({
  full_name: z.string(),
  school: z.string().optional(),
  from_school: z.string().optional(),
  position: z.string().optional(),
  height: z.string().optional(),
  class: z.string().optional(),
  stars: z.union([z.string(), z.number()]).optional(),
});

const importCsvSchema = z
  .object({
    level: csvLevelSchema,
    rows: z.array(csvRowSchema).min(1),
  })
  .openapi('ImportCsvRows');

const csvEntriesQuerySchema = z.object({ level: csvLevelSchema });

registry.registerPath({
  method: 'get',
  path: '/portal',
  tags: ['portal'],
  summary: 'List transfer portal entries with optional filters',
  security: [{ bearerAuth: [] }],
  request: { query: portalQuerySchema },
  responses: {
    200: {
      description: 'Portal entries and last sync time',
      content: {
        'application/json': {
          schema: z.object({ entries: z.array(portalEntrySchema), lastSync: z.string().nullable() }),
        },
      },
    },
    401: { description: 'Not authenticated' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/portal/sync',
  tags: ['portal'],
  summary: 'Scrape On3 D1 transfer portal data and upsert into portal_feed',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Sync results',
      content: {
        'application/json': {
          schema: z.object({ synced: z.number(), inserted: z.number(), updated: z.number() }),
        },
      },
    },
    401: { description: 'Not authenticated' },
    403: { description: 'Insufficient permissions' },
    502: { description: 'On3 API request failed' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/portal/import-csv',
  tags: ['portal'],
  summary: 'Bulk import D2/JUCO transfer portal entries from CSV rows',
  security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: importCsvSchema } } } },
  responses: {
    200: {
      description: 'Import results',
      content: {
        'application/json': {
          schema: z.object({ inserted: z.number(), updated: z.number(), errors: z.array(z.string()) }),
        },
      },
    },
    400: { description: 'Invalid level, or no rows provided' },
    401: { description: 'Not authenticated' },
    403: { description: 'Insufficient permissions' },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/portal/csv-entries',
  tags: ['portal'],
  summary: 'Clear all CSV-sourced entries for a level',
  security: [{ bearerAuth: [] }],
  request: { query: csvEntriesQuerySchema },
  responses: {
    200: { description: 'Number of entries deleted', content: { 'application/json': { schema: z.object({ deleted: z.number().nullable() }) } } },
    400: { description: 'Invalid level' },
    401: { description: 'Not authenticated' },
    403: { description: 'Insufficient permissions' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/portal/{id}/import',
  tags: ['portal'],
  summary: 'Create a prospect from a portal entry',
  security: [{ bearerAuth: [] }],
  request: { params: idParamSchema },
  responses: {
    201: { description: 'Created prospect', content: { 'application/json': { schema: z.object({ prospect: z.any() }) } } },
    401: { description: 'Not authenticated' },
    403: { description: 'Insufficient permissions' },
    404: { description: 'Portal entry not found' },
    409: { description: 'Already imported' },
  },
});

// GET /portal — list portal entries with optional filters
router.get('/', requireAuth, validate({ query: portalQuerySchema }), async (req, res) => {
  const { status, position, level } = req.query as unknown as z.infer<typeof portalQuerySchema>;
  const clauses = [`level = $1`];
  const params: unknown[] = [level];

  if (status) {
    params.push(status);
    clauses.push(`status = $${params.length}`);
  }
  if (position) {
    params.push(position);
    clauses.push(`position_abbr = $${params.length}`);
  }

  const where = `WHERE ${clauses.join(' AND ')}`;

  try {
    const [entriesResult, syncResult] = await Promise.all([
      query(
        `SELECT * FROM portal_feed ${where}
         ORDER BY portal_entered_at DESC NULLS LAST, scraped_at DESC
         LIMIT 500`,
        params
      ),
      query(
        `SELECT MAX(scraped_at) AS last_sync FROM portal_feed WHERE level = $1`,
        [level]
      ),
    ]);

    return res.json({
      entries: entriesResult.rows,
      lastSync: syncResult.rows[0]?.last_sync ?? null,
    });
  } catch (err) {
    console.error('list portal error:', errorMessage(err));
    return res.status(500).json({ error: 'Failed to load portal feed' });
  }
});

// POST /portal/sync — scrape On3 D1 data and upsert
router.post('/sync', requireAuth, requireRole('head_coach', 'assistant'), async (req, res) => {
  try {
    const entries = await scrapeOn3Portal();

    let inserted = 0;
    let updated = 0;

    for (const e of entries) {
      const result = await query<{ is_new: boolean }>(
        `INSERT INTO portal_feed
           (on3_key, full_name, position_abbr, height, class_rank,
            from_school, to_school, status, stars, portal_entered_at, on3_slug,
            level, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'d1','on3')
         ON CONFLICT (on3_key) DO UPDATE SET
           full_name          = EXCLUDED.full_name,
           status             = EXCLUDED.status,
           to_school          = EXCLUDED.to_school,
           from_school        = EXCLUDED.from_school,
           scraped_at         = now()
         RETURNING (xmax = 0) AS is_new`,
        [
          e.on3Key, e.fullName, e.positionAbbr, e.height, e.classRank,
          e.fromSchool, e.toSchool, e.status, e.stars, e.portalEnteredAt, e.slug,
        ]
      );

      if (result.rows[0]?.is_new) inserted++;
      else updated++;
    }

    return res.json({ synced: entries.length, inserted, updated });
  } catch (err) {
    console.error('portal sync error:', errorMessage(err));
    return res.status(502).json({ error: errorMessage(err) || 'Sync failed' });
  }
});

// POST /portal/import-csv — bulk import D2/JUCO entries from CSV rows
router.post(
  '/import-csv',
  requireAuth,
  requireRole('head_coach', 'assistant'),
  validate({ body: importCsvSchema }),
  async (req, res) => {
    const { level, rows } = req.body as z.infer<typeof importCsvSchema>;

    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const name = row.full_name?.trim();
      const school = row.school?.trim() || row.from_school?.trim() || '';
      if (!name) { errors.push(`Skipped row with missing name`); continue; }

      const csvKey = `${name.toLowerCase()}|${school.toLowerCase()}`;

      try {
        const result = await query<{ is_new: boolean }>(
          `INSERT INTO portal_feed
           (csv_key, full_name, position_abbr, height, class_rank,
            from_school, status, stars, level, source)
         VALUES ($1,$2,$3,$4,$5,$6,'Available',$7,$8,'csv')
         ON CONFLICT (csv_key, level) WHERE csv_key IS NOT NULL DO UPDATE SET
           full_name    = EXCLUDED.full_name,
           position_abbr = EXCLUDED.position_abbr,
           height       = EXCLUDED.height,
           class_rank   = EXCLUDED.class_rank,
           from_school  = EXCLUDED.from_school,
           stars        = EXCLUDED.stars,
           scraped_at   = now()
         RETURNING (xmax = 0) AS is_new`,
          [
            csvKey,
            name,
            row.position?.trim() || null,
            row.height?.trim() || null,
            row.class?.trim() || null,
            school || null,
            (() => { const s = parseInt(String(row.stars), 10); return s >= 0 && s <= 5 ? s : null; })(),
            level,
          ]
        );

        if (result.rows[0]?.is_new) inserted++;
        else updated++;
      } catch (err) {
        errors.push(`${name}: ${errorMessage(err)}`);
      }
    }

    return res.json({ inserted, updated, errors: errors.slice(0, 10) });
  }
);

// DELETE /portal/csv-entries — clear all CSV entries for a level
router.delete(
  '/csv-entries',
  requireAuth,
  requireRole('head_coach', 'assistant'),
  validate({ query: csvEntriesQuerySchema }),
  async (req, res) => {
    const { level } = req.query as unknown as z.infer<typeof csvEntriesQuerySchema>;
    try {
      const result = await query(
        `DELETE FROM portal_feed WHERE level = $1 AND source = 'csv'`,
        [level]
      );
      return res.json({ deleted: result.rowCount });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to clear entries' });
    }
  }
);

// POST /portal/:id/import — create a prospect from a portal entry
router.post(
  '/:id/import',
  requireAuth,
  requireRole('head_coach', 'assistant'),
  validate({ params: idParamSchema }),
  async (req, res) => {
    try {
      const entryResult = await query('SELECT * FROM portal_feed WHERE id = $1', [req.params.id]);
      if (entryResult.rows.length === 0) return res.status(404).json({ error: 'Portal entry not found' });
      const e = entryResult.rows[0];

      if (e.imported_prospect_id) {
        return res.status(409).json({ error: 'Already imported', prospectId: e.imported_prospect_id });
      }

      let heightInches = null;
      if (e.height) {
        const parts = e.height.split('-').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          heightInches = parts[0] * 12 + parts[1];
        }
      }

      const prospectResult = await query(
        `INSERT INTO prospects (full_name, position, height_inches, current_school, in_portal, created_by)
       VALUES ($1, $2, $3, $4, TRUE, $5)
       RETURNING *`,
        [e.full_name, e.position_abbr, heightInches, e.from_school, req.user!.id]
      );
      const prospect = prospectResult.rows[0];

      await query('UPDATE portal_feed SET imported_prospect_id = $1 WHERE id = $2', [
        prospect.id, e.id,
      ]);

      recordAudit({ actorId: req.user!.id, entityType: 'prospect', entityId: prospect.id, action: 'create', field: 'source', newValue: `portal_import_${e.level}` })
        .catch(err2 => console.error('audit error:', errorMessage(err2)));

      return res.status(201).json({ prospect });
    } catch (err) {
      console.error('portal import error:', errorMessage(err));
      return res.status(500).json({ error: 'Failed to import prospect' });
    }
  }
);

export default router;
