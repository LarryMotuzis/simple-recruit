import express from 'express';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const result = await query('SELECT * FROM team_settings LIMIT 1');
  res.json({ settings: result.rows[0] ?? null });
});

router.patch('/', requireAuth, requireRole('head_coach', 'assistant'), async (req, res) => {
  const { teamName, abbreviation, primaryColor, secondaryColor } = req.body;
  const result = await query(
    `UPDATE team_settings SET
       team_name       = COALESCE($1, team_name),
       abbreviation    = COALESCE($2, abbreviation),
       primary_color   = COALESCE($3, primary_color),
       secondary_color = COALESCE($4, secondary_color),
       updated_at      = now()
     RETURNING *`,
    [teamName || null, abbreviation || null, primaryColor || null, secondaryColor || null]
  );
  res.json({ settings: result.rows[0] });
});

export default router;
