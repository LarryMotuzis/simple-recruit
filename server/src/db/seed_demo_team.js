import bcrypt from 'bcryptjs';
import { pool } from './pool.js';

// Fictional Riverbend Basketball roster
const ROSTER = [
  { fullName: 'Jalen Whitmore',   position: 'PG', jerseyNumber: '5',  year: 'Jr',   heightInches: 77 },
  { fullName: 'Marcus Doyle',     position: 'PG', jerseyNumber: '1',  year: 'Jr',   heightInches: 76 },
  { fullName: 'Aiden Brooks',     position: 'SF', jerseyNumber: '2',  year: 'Fr',   heightInches: 81 },
  { fullName: 'Tyler Osei',       position: 'SG', jerseyNumber: '4',  year: 'Fr',   heightInches: 79 },
  { fullName: 'DeShawn Ellis',    position: 'SG', jerseyNumber: '8',  year: 'Fr',   heightInches: 78 },
  { fullName: 'Nate Calloway',    position: 'SF', jerseyNumber: '3',  year: 'Jr',   heightInches: 79 },
  { fullName: 'Colin Reyes',      position: 'PF', jerseyNumber: '10', year: 'Grad', heightInches: 79 },
  { fullName: 'Xavier Delgado',   position: 'PF', jerseyNumber: '33', year: 'So',   heightInches: 81 },
  { fullName: 'Isaiah Trent',     position: 'PF', jerseyNumber: '15', year: 'So',   heightInches: 81 },
  { fullName: 'Owen Baptiste',    position: 'C',  jerseyNumber: '32', year: 'Jr',   heightInches: 82 },
  { fullName: 'Malik Thornton',   position: 'C',  jerseyNumber: '6',  year: 'Fr',   heightInches: 85 },
];

const COACHES = [
  {
    email: 'dwhitfield@riverbendu.edu',
    password: 'RiverbendHoops1!',
    fullName: 'Derek Whitfield',
    role: 'head_coach',
  },
  {
    email: 'mreeves@riverbendu.edu',
    password: 'RiverbendHoops2!',
    fullName: 'Malcolm Reeves',
    role: 'assistant',
  },
];

const TEAM_SETTINGS = {
  teamName: 'Riverbend Basketball',
  abbreviation: 'RVB',
  primaryColor: '#003087',
  secondaryColor: '#FFFFFF',
};

async function seedDemoTeam() {
  const createdUsers = [];

  for (const c of COACHES) {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [c.email]);
    if (existing.rows.length > 0) {
      console.log(`User ${c.email} already exists — skipping`);
      createdUsers.push(existing.rows[0]);
      continue;
    }
    const hash = await bcrypt.hash(c.password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role) VALUES ($1,$2,$3,$4) RETURNING id, email`,
      [c.email, hash, c.fullName, c.role]
    );
    console.log(`Created: ${c.email} (${c.role})`);
    createdUsers.push(result.rows[0]);
  }

  // Set up team settings and roster only for the head coach (first user)
  // Assistants share via team_id — no duplicate rows needed.
  for (const u of createdUsers.slice(0, 1)) {
    // Upsert team settings
    await pool.query(
      `INSERT INTO team_settings (user_id, team_name, abbreviation, primary_color, secondary_color)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO UPDATE SET
         team_name       = EXCLUDED.team_name,
         abbreviation    = EXCLUDED.abbreviation,
         primary_color   = EXCLUDED.primary_color,
         secondary_color = EXCLUDED.secondary_color`,
      [u.id, TEAM_SETTINGS.teamName, TEAM_SETTINGS.abbreviation, TEAM_SETTINGS.primaryColor, TEAM_SETTINGS.secondaryColor]
    );
    console.log(`Team settings set for ${u.email}`);

    // Add roster players (skip any already added for this user)
    for (const p of ROSTER) {
      const existing = await pool.query(
        'SELECT id FROM roster WHERE full_name = $1 AND user_id = $2',
        [p.fullName, u.id]
      );
      if (existing.rows.length > 0) {
        console.log(`  Roster: ${p.fullName} already exists — skipping`);
        continue;
      }
      await pool.query(
        `INSERT INTO roster (full_name, position, jersey_number, year, height_inches, created_by, user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [p.fullName, p.position, p.jerseyNumber, p.year, p.heightInches, u.id, u.id]
      );
      console.log(`  Roster: added ${p.fullName}`);
    }
  }

  await pool.end();
  console.log('\nRiverbend demo team seed complete.');
}

seedDemoTeam().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
