import express from 'express';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { errorMessage } from '../lib/errors.js';
import { z } from '../lib/zod.js';
import { registry } from '../lib/openapi.js';
import { validate } from '../lib/validate.js';

const router = express.Router();

const teamSettingsSchema = z
  .object({
    id: z.string(),
    team_id: z.string().nullable(),
    user_id: z.string().nullable(),
    team_name: z.string().nullable(),
    abbreviation: z.string().nullable(),
    primary_color: z.string().nullable(),
    secondary_color: z.string().nullable(),
  })
  .openapi('TeamSettings');

const patchTeamSettingsSchema = z
  .object({
    teamName: z.string().min(1).optional(),
    abbreviation: z.string().max(10).optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
  })
  .openapi('TeamSettingsUpdate');

registry.registerPath({
  method: 'get',
  path: '/team-settings',
  tags: ['team-settings'],
  summary: "Get the current coach's team settings",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Team settings, or null if none set yet',
      content: { 'application/json': { schema: z.object({ settings: teamSettingsSchema.nullable() }) } },
    },
    401: { description: 'Not authenticated' },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/team-settings',
  tags: ['team-settings'],
  summary: 'Update team settings (head_coach or assistant)',
  security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: patchTeamSettingsSchema } } } },
  responses: {
    200: {
      description: 'Updated team settings',
      content: { 'application/json': { schema: z.object({ settings: teamSettingsSchema }) } },
    },
    401: { description: 'Not authenticated' },
    403: { description: 'Insufficient permissions' },
  },
});

async function getTeamId(userId: string): Promise<string | null> {
  const r = await query<{ team_id: string | null }>('SELECT team_id FROM users WHERE id = $1', [userId]);
  return r.rows[0]?.team_id ?? null;
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const teamId = await getTeamId(req.user!.id);
    const result = teamId
      ? await query('SELECT * FROM team_settings WHERE team_id = $1', [teamId])
      : await query('SELECT * FROM team_settings WHERE user_id = $1', [req.user!.id]);
    res.json({ settings: result.rows[0] ?? null });
  } catch (err) {
    console.error('team settings get error:', errorMessage(err));
    res.status(500).json({ error: 'Failed to load team settings' });
  }
});

router.patch(
  '/',
  requireAuth,
  requireRole('head_coach', 'assistant'),
  validate({ body: patchTeamSettingsSchema }),
  async (req, res) => {
    const { teamName, abbreviation, primaryColor, secondaryColor } = req.body as z.infer<typeof patchTeamSettingsSchema>;
    try {
      const teamId = await getTeamId(req.user!.id);
      let result;
      if (teamId) {
        result = await query(
          `INSERT INTO team_settings (team_id, team_name, abbreviation, primary_color, secondary_color)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (team_id) WHERE team_id IS NOT NULL DO UPDATE SET
           team_name       = COALESCE(EXCLUDED.team_name,       team_settings.team_name),
           abbreviation    = COALESCE(EXCLUDED.abbreviation,    team_settings.abbreviation),
           primary_color   = COALESCE(EXCLUDED.primary_color,   team_settings.primary_color),
           secondary_color = COALESCE(EXCLUDED.secondary_color, team_settings.secondary_color),
           updated_at      = now()
         RETURNING *`,
          [teamId, teamName || null, abbreviation || null, primaryColor || null, secondaryColor || null]
        );
      } else {
        result = await query(
          `INSERT INTO team_settings (user_id, team_name, abbreviation, primary_color, secondary_color)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO UPDATE SET
           team_name       = COALESCE(EXCLUDED.team_name,       team_settings.team_name),
           abbreviation    = COALESCE(EXCLUDED.abbreviation,    team_settings.abbreviation),
           primary_color   = COALESCE(EXCLUDED.primary_color,   team_settings.primary_color),
           secondary_color = COALESCE(EXCLUDED.secondary_color, team_settings.secondary_color),
           updated_at      = now()
         RETURNING *`,
          [req.user!.id, teamName || null, abbreviation || null, primaryColor || null, secondaryColor || null]
        );
      }
      res.json({ settings: result.rows[0] });
    } catch (err) {
      console.error('team settings patch error:', errorMessage(err));
      res.status(500).json({ error: 'Failed to update team settings' });
    }
  }
);

export default router;
