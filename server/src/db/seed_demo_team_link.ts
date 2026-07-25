/**
 * Sets up the Riverbend Basketball staff as a shared team.
 * - Creates the "Riverbend Basketball" team
 * - Assigns dwhitfield@riverbendu.edu and mreeves@riverbendu.edu to it
 * - Re-scopes their existing roster rows to the team
 * - Consolidates their two team_settings rows into one team row
 */
import { pool } from './pool.js';
import { errorMessage } from '../lib/errors.js';

async function seedDemoTeamLink() {
  // 1. Create Riverbend team
  const existing = await pool.query(`SELECT id FROM teams WHERE name = 'Riverbend Basketball'`);
  let riverbendTeamId: string;
  if (existing.rows.length > 0) {
    riverbendTeamId = existing.rows[0].id;
    console.log(`Riverbend team already exists: ${riverbendTeamId}`);
  } else {
    const t = await pool.query(
      `INSERT INTO teams (name) VALUES ('Riverbend Basketball') RETURNING id`
    );
    riverbendTeamId = t.rows[0].id;
    console.log(`Created Riverbend team: ${riverbendTeamId}`);
  }

  // 2. Assign both Riverbend coaches to the team
  const coaches = await pool.query(
    `UPDATE users SET team_id = $1
     WHERE email IN ('dwhitfield@riverbendu.edu','mreeves@riverbendu.edu')
     RETURNING id, email`,
    [riverbendTeamId]
  );
  for (const c of coaches.rows) console.log(`Assigned ${c.email} → Riverbend team`);

  // 3. Re-scope their roster rows to the team
  const rosterUpdate = await pool.query(
    `UPDATE roster SET team_id = $1
     WHERE user_id IN (SELECT id FROM users WHERE team_id = $1)
     RETURNING id`,
    [riverbendTeamId]
  );
  console.log(`Migrated ${rosterUpdate.rowCount} roster rows → Riverbend team`);

  // 4. Consolidate team_settings: keep Whitfield's row, set team_id, drop Reeves's
  const whitfield = await pool.query(`SELECT id FROM users WHERE email = 'dwhitfield@riverbendu.edu'`);
  const whitfieldId = whitfield.rows[0]?.id;
  if (whitfieldId) {
    // Promote Whitfield's settings to the team row
    await pool.query(
      `UPDATE team_settings SET team_id = $1 WHERE user_id = $2`,
      [riverbendTeamId, whitfieldId]
    );
    // Remove Reeves's duplicate settings row so only the team row remains
    const reeves = await pool.query(`SELECT id FROM users WHERE email = 'mreeves@riverbendu.edu'`);
    const reevesId = reeves.rows[0]?.id;
    if (reevesId) {
      await pool.query(`DELETE FROM team_settings WHERE user_id = $1`, [reevesId]);
      console.log(`Removed Reeves's individual settings row (now uses team row)`);
    }
    console.log(`Team settings consolidated for Riverbend`);
  }

  await pool.end();
  console.log('\nTeam seed complete.');
}

seedDemoTeamLink().catch(err => {
  console.error('Team seed failed:', errorMessage(err));
  process.exit(1);
});
