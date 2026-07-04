/**
 * Sets up the Duke Basketball staff as a shared team.
 * - Creates the "Duke Basketball" team
 * - Assigns scheyer@duke.edu and carrawell@duke.edu to it
 * - Re-scopes their existing roster rows to the team
 * - Consolidates their two team_settings rows into one team row
 */
import { pool } from './pool.js';

async function seedTeams() {
  // 1. Create Duke team
  const existing = await pool.query(`SELECT id FROM teams WHERE name = 'Duke Basketball'`);
  let dukeTeamId;
  if (existing.rows.length > 0) {
    dukeTeamId = existing.rows[0].id;
    console.log(`Duke team already exists: ${dukeTeamId}`);
  } else {
    const t = await pool.query(
      `INSERT INTO teams (name) VALUES ('Duke Basketball') RETURNING id`
    );
    dukeTeamId = t.rows[0].id;
    console.log(`Created Duke team: ${dukeTeamId}`);
  }

  // 2. Assign both Duke coaches to the team
  const coaches = await pool.query(
    `UPDATE users SET team_id = $1
     WHERE email IN ('scheyer@duke.edu','carrawell@duke.edu')
     RETURNING id, email`,
    [dukeTeamId]
  );
  for (const c of coaches.rows) console.log(`Assigned ${c.email} → Duke team`);

  // 3. Re-scope their roster rows to the team
  const rosterUpdate = await pool.query(
    `UPDATE roster SET team_id = $1
     WHERE user_id IN (SELECT id FROM users WHERE team_id = $1)
     RETURNING id`,
    [dukeTeamId]
  );
  console.log(`Migrated ${rosterUpdate.rowCount} roster rows → Duke team`);

  // 4. Consolidate team_settings: keep scheyer's row, set team_id, drop carrawell's
  const scheyer = await pool.query(`SELECT id FROM users WHERE email = 'scheyer@duke.edu'`);
  const scheyerId = scheyer.rows[0]?.id;
  if (scheyerId) {
    // Promote scheyer's settings to the team row
    await pool.query(
      `UPDATE team_settings SET team_id = $1 WHERE user_id = $2`,
      [dukeTeamId, scheyerId]
    );
    // Remove carrawell's duplicate settings row so only the team row remains
    const carrawell = await pool.query(`SELECT id FROM users WHERE email = 'carrawell@duke.edu'`);
    const carrawellId = carrawell.rows[0]?.id;
    if (carrawellId) {
      await pool.query(`DELETE FROM team_settings WHERE user_id = $1`, [carrawellId]);
      console.log(`Removed carrawell's individual settings row (now uses team row)`);
    }
    console.log(`Team settings consolidated for Duke`);
  }

  await pool.end();
  console.log('\nTeam seed complete.');
}

seedTeams().catch(err => {
  console.error('Team seed failed:', err.message);
  process.exit(1);
});
