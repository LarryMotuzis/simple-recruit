import express from 'express';
import { query, pool } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /roster  — full roster with depth chart slot info
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await query(`
      SELECT r.*,
             dc.position  AS chart_position,
             dc.depth_order,
             p.full_name  AS prospect_name
      FROM roster r
      LEFT JOIN depth_chart dc ON dc.roster_id = r.id
      LEFT JOIN prospects    p  ON p.id = r.prospect_id
      ORDER BY r.created_at ASC
    `);
    return res.json({ players: result.rows });
  } catch (err) {
    console.error('roster list error:', err.message);
    return res.status(500).json({ error: 'Failed to load roster' });
  }
});

// POST /roster  — add a player (manual or from prospect)
router.post('/', requireAuth, requireRole('head_coach', 'assistant'), async (req, res) => {
  const { fullName, position, jerseyNumber, year, heightInches, notes, prospectId } = req.body;
  if (!fullName?.trim()) return res.status(400).json({ error: 'full_name is required' });

  try {
    if (prospectId) {
      const existing = await query('SELECT id FROM roster WHERE prospect_id = $1', [prospectId]);
      if (existing.rows.length) return res.status(409).json({ error: 'Player already on roster' });
    }

    const result = await query(
      `INSERT INTO roster (full_name, position, jersey_number, year, height_inches, notes, prospect_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [fullName.trim(), position || null, jerseyNumber || null, year || null,
       heightInches || null, notes || null, prospectId || null, req.user.id]
    );
    return res.status(201).json({ player: result.rows[0] });
  } catch (err) {
    console.error('roster add error:', err.message);
    return res.status(500).json({ error: 'Failed to add player' });
  }
});

// PATCH /roster/:id  — edit player info
router.patch('/:id', requireAuth, requireRole('head_coach', 'assistant'), async (req, res) => {
  const { fullName, position, jerseyNumber, year, heightInches, notes } = req.body;
  try {
    const result = await query(
      `UPDATE roster SET
         full_name     = COALESCE($1, full_name),
         position      = COALESCE($2, position),
         jersey_number = COALESCE($3, jersey_number),
         year          = COALESCE($4, year),
         height_inches = COALESCE($5, height_inches),
         notes         = COALESCE($6, notes)
       WHERE id = $7 RETURNING *`,
      [fullName || null, position || null, jerseyNumber || null,
       year || null, heightInches || null, notes || null, req.params.id]
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
    await query('DELETE FROM roster WHERE id = $1', [req.params.id]);
    return res.status(204).end();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to remove player' });
  }
});

// PUT /roster/depth-chart  — assign or clear a depth chart slot
// body: { rosterId, position, depthOrder }  (rosterId=null to clear a slot)
router.put('/depth-chart', requireAuth, requireRole('head_coach', 'assistant'), async (req, res) => {
  const { rosterId, position, depthOrder } = req.body;
  const validPositions = ['PG', 'SG', 'SF', 'PF', 'C'];
  if (!validPositions.includes(position) || ![1, 2, 3].includes(depthOrder)) {
    return res.status(400).json({ error: 'Invalid position or depth_order' });
  }

  try {
    if (!rosterId) {
      // Clear the slot
      await query('DELETE FROM depth_chart WHERE position = $1 AND depth_order = $2', [position, depthOrder]);
    } else {
      // Remove player from any existing slot first (enforce UNIQUE(roster_id))
      await query('DELETE FROM depth_chart WHERE roster_id = $1', [rosterId]);
      // Upsert into the target slot
      await query(
        `INSERT INTO depth_chart (position, depth_order, roster_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (position, depth_order) DO UPDATE SET roster_id = EXCLUDED.roster_id`,
        [position, depthOrder, rosterId]
      );
    }

    // Return updated full roster
    const result = await query(`
      SELECT r.*,
             dc.position  AS chart_position,
             dc.depth_order
      FROM roster r
      LEFT JOIN depth_chart dc ON dc.roster_id = r.id
      ORDER BY r.created_at ASC
    `);
    return res.json({ players: result.rows });
  } catch (err) {
    console.error('depth chart error:', err.message);
    return res.status(500).json({ error: 'Failed to update depth chart' });
  }
});

// POST /roster/depth-chart/swap  — atomically swap two occupied depth chart slots
// body: { a: {rosterId, position, depthOrder}, b: {rosterId, position, depthOrder} }
router.post('/depth-chart/swap', requireAuth, requireRole('head_coach', 'assistant'), async (req, res) => {
  const { a, b } = req.body;
  const valid = ['PG', 'SG', 'SF', 'PF', 'C'];
  if (!a?.rosterId || !b?.rosterId) return res.status(400).json({ error: 'Both slots require a rosterId' });
  if (!valid.includes(a.position) || !valid.includes(b.position)) return res.status(400).json({ error: 'Invalid position' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Delete both slots
    await client.query('DELETE FROM depth_chart WHERE roster_id = $1 OR roster_id = $2', [a.rosterId, b.rosterId]);
    // Re-insert swapped: player from a goes to b's slot, player from b goes to a's slot
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
      ORDER BY r.created_at ASC
    `);
    return res.json({ players: result.rows });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('depth chart swap error:', err.message);
    return res.status(500).json({ error: 'Failed to swap depth chart slots' });
  } finally {
    client.release();
  }
});

export default router;
