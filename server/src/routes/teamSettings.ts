import express from 'express';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { errorMessage } from '../lib/errors.js';

const router = express.Router();

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

router.patch('/', requireAuth, requireRole('head_coach', 'assistant'), async (req, res) => {
  const { teamName, abbreviation, primaryColor, secondaryColor } = req.body;
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
});

export default router;
