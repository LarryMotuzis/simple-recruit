import express from 'express';
import { query, pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { errorMessage } from '../lib/errors.js';

const router = express.Router();

interface ScopeClause {
  clause: string;
  params: unknown[];
}

// Returns the user's team_id (null if they aren't on a team).
async function getTeamId(userId: string): Promise<string | null> {
  const r = await query<{ team_id: string | null }>('SELECT team_id FROM users WHERE id = $1', [userId]);
  return r.rows[0]?.team_id ?? null;
}

// WHERE clause + params for scoping a roster query to the right team/user.
// Returns { clause, params } where params already includes scopeId at position 1.
function scopeClause(teamId: string | null, userId: string): ScopeClause {
  if (teamId) return { clause: 'r.team_id = $1', params: [teamId] };
  return { clause: 'r.user_id = $1', params: [userId] };
}

// GET /roster
router.get('/', requireAuth, async (req, res) => {
  try {
    const teamId = await getTeamId(req.user!.id);
    const { clause, params } = scopeClause(teamId, req.user!.id);
    const result = await query(`
      SELECT r.*,
             dc.position  AS chart_position,
             dc.depth_order,
             p.full_name  AS prospect_name
      FROM roster r
      LEFT JOIN depth_chart dc ON dc.roster_id = r.id
      LEFT JOIN prospects    p  ON p.id = r.prospect_id
      WHERE ${clause}
      ORDER BY r.created_at ASC
    `, params);
    return res.json({ players: result.rows });
  } catch (err) {
    console.error('roster list error:', errorMessage(err));
    return res.status(500).json({ error: 'Failed to load roster' });
  }
});

// POST /roster
router.post('/', requireAuth, requireRole('head_coach', 'assistant'), async (req, res) => {
  const { fullName, position, jerseyNumber, year, heightInches, notes, prospectId } = req.body;
  if (!fullName?.trim()) return res.status(400).json({ error: 'full_name is required' });

  try {
    const teamId = await getTeamId(req.user!.id);
    const { clause, params: scopeParams } = scopeClause(teamId, req.user!.id);

    if (prospectId) {
      const existing = await query(
        `SELECT id FROM roster r WHERE r.prospect_id = $1 AND ${clause}`,
        [prospectId, ...scopeParams]
      );
      if (existing.rows.length) return res.status(409).json({ error: 'Player already on roster' });
    }

    const result = await query(
      `INSERT INTO roster (full_name, position, jersey_number, year, height_inches, notes, prospect_id, created_by, user_id, team_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [fullName.trim(), position || null, jerseyNumber || null, year || null,
       heightInches || null, notes || null, prospectId || null,
       req.user!.id, req.user!.id, teamId]
    );
    return res.status(201).json({ player: result.rows[0] });
  } catch (err) {
    console.error('roster add error:', errorMessage(err));
    return res.status(500).json({ error: 'Failed to add player' });
  }
});

// PATCH /roster/:id
router.patch('/:id', requireAuth, requireRole('head_coach', 'assistant'), async (req, res) => {
  const { fullName, position, jerseyNumber, year, heightInches, notes } = req.body;
  try {
    const teamId = await getTeamId(req.user!.id);
    const { clause, params: scopeParams } = scopeClause(teamId, req.user!.id);

    const result = await query(
      `UPDATE roster SET
         full_name     = COALESCE($1, full_name),
         position      = COALESCE($2, position),
         jersey_number = COALESCE($3, jersey_number),
         year          = COALESCE($4, year),
         height_inches = COALESCE($5, height_inches),
         notes         = COALESCE($6, notes)
       WHERE id = $7 AND ${clause.replace('$1', '$8')}
       RETURNING *`,
      [fullName || null, position || null, jerseyNumber || null,
       year || null, heightInches || null, notes || null,
       req.params.id, ...scopeParams]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Player not found' });
    return res.json({ player: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update player' });
  }
});

// DELETE /roster/:id
router.delete('/:id', requireAuth, requireRole('head_coach', 'assistant'), async (req, res) => {
  try {
    const teamId = await getTeamId(req.user!.id);
    const { clause, params: scopeParams } = scopeClause(teamId, req.user!.id);
    await query(
      `DELETE FROM roster WHERE id = $1 AND ${clause.replace('$1', '$2')}`,
      [req.params.id, ...scopeParams]
    );
    return res.status(204).end();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to remove player' });
  }
});

// PUT /roster/depth-chart
router.put('/depth-chart', requireAuth, requireRole('head_coach', 'assistant'), async (req, res) => {
  const { rosterId, position } = req.body;
  const depthOrder = Number(req.body.depthOrder);
  const validPositions = ['PG', 'SG', 'SF', 'PF', 'C'];
  if (!validPositions.includes(position) || ![1, 2, 3].includes(depthOrder)) {
    return res.status(400).json({ error: 'Invalid position or depth_order' });
  }

  try {
    const teamId = await getTeamId(req.user!.id);
    const { clause, params: scopeParams } = scopeClause(teamId, req.user!.id);

    if (!rosterId) {
      await query(
        `DELETE FROM depth_chart WHERE position = $1 AND depth_order = $2
         AND roster_id IN (SELECT id FROM roster r WHERE ${clause.replace('$1', '$3')})`,
        [position, depthOrder, ...scopeParams]
      );
    } else {
      const owns = await query(
        `SELECT id FROM roster r WHERE id = $1 AND ${clause.replace('$1', '$2')}`,
        [rosterId, ...scopeParams]
      );
      if (!owns.rows.length) return res.status(403).json({ error: 'Forbidden' });

      await query('DELETE FROM depth_chart WHERE roster_id = $1', [rosterId]);
      await query(
        `INSERT INTO depth_chart (position, depth_order, roster_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (position, depth_order) DO UPDATE SET roster_id = EXCLUDED.roster_id`,
        [position, depthOrder, rosterId]
      );
    }

    const result = await query(`
      SELECT r.*, dc.position AS chart_position, dc.depth_order
      FROM roster r
      LEFT JOIN depth_chart dc ON dc.roster_id = r.id
      WHERE ${clause}
      ORDER BY r.created_at ASC
    `, scopeParams);
    return res.json({ players: result.rows });
  } catch (err) {
    console.error('depth chart error:', errorMessage(err));
    return res.status(500).json({ error: 'Failed to update depth chart' });
  }
});

// POST /roster/depth-chart/swap
router.post('/depth-chart/swap', requireAuth, requireRole('head_coach', 'assistant'), async (req, res) => {
  const { a, b } = req.body;
  const valid = ['PG', 'SG', 'SF', 'PF', 'C'];
  if (!a?.rosterId || !b?.rosterId) return res.status(400).json({ error: 'Both slots require a rosterId' });
  if (!valid.includes(a.position) || !valid.includes(b.position)) return res.status(400).json({ error: 'Invalid position' });

  const teamId = await getTeamId(req.user!.id);
  const { clause, params: scopeParams } = scopeClause(teamId, req.user!.id);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const owns = await client.query(
      `SELECT id FROM roster r WHERE id = ANY($1) AND ${clause.replace('$1', '$2')}`,
      [[a.rosterId, b.rosterId], ...scopeParams]
    );
    if (owns.rows.length < 2) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Forbidden' });
    }

    await client.query('DELETE FROM depth_chart WHERE roster_id = $1 OR roster_id = $2', [a.rosterId, b.rosterId]);
    await client.query(
      `INSERT INTO depth_chart (position, depth_order, roster_id) VALUES ($1,$2,$3),($4,$5,$6)
       ON CONFLICT (position, depth_order) DO UPDATE SET roster_id = EXCLUDED.roster_id`,
      [b.position, b.depthOrder, a.rosterId, a.position, a.depthOrder, b.rosterId]
    );
    await client.query('COMMIT');

    const result = await client.query(`
      SELECT r.*, dc.position AS chart_position, dc.depth_order
      FROM roster r
      LEFT JOIN depth_chart dc ON dc.roster_id = r.id
      WHERE ${clause}
      ORDER BY r.created_at ASC
    `, scopeParams);
    return res.json({ players: result.rows });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('depth chart swap error:', errorMessage(err));
    return res.status(500).json({ error: 'Failed to swap depth chart slots' });
  } finally {
    client.release();
  }
});

export default router;
