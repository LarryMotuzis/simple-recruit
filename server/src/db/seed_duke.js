import bcrypt from 'bcryptjs';
import { pool } from './pool.js';

// 2024-25 Duke Blue Devils roster
const ROSTER = [
  { fullName: 'Tyrese Proctor',    position: 'PG', jerseyNumber: '5',  year: 'Jr',   heightInches: 77 },
  { fullName: 'Caleb Foster',      position: 'PG', jerseyNumber: '1',  year: 'Jr',   heightInches: 76 },
  { fullName: 'Cooper Flagg',      position: 'SF', jerseyNumber: '2',  year: 'Fr',   heightInches: 81 },
  { fullName: 'Kon Knueppel',      position: 'SG', jerseyNumber: '4',  year: 'Fr',   heightInches: 79 },
  { fullName: 'Isaiah Evans',      position: 'SG', jerseyNumber: '8',  year: 'Fr',   heightInches: 78 },
  { fullName: 'Maliq Brown',       position: 'SF', jerseyNumber: '3',  year: 'Jr',   heightInches: 79 },
  { fullName: 'Mason Gillis',      position: 'PF', jerseyNumber: '10', year: 'Grad', heightInches: 79 },
  { fullName: 'Sean Stewart',      position: 'PF', jerseyNumber: '33', year: 'So',   heightInches: 81 },
  { fullName: 'Jarin Stevenson',   position: 'PF', jerseyNumber: '15', year: 'So',   heightInches: 81 },
  { fullName: 'Patrick Ngongba II',position: 'C',  jerseyNumber: '32', year: 'Jr',   heightInches: 82 },
  { fullName: 'Khaman Maluach',    position: 'C',  jerseyNumber: '6',  year: 'Fr',   heightInches: 85 },
];

const COACHES = [
  {
    email: 'scheyer@duke.edu',
    password: 'BlueDevils1!',
    fullName: 'Jon Scheyer',
    role: 'head_coach',
  },
  {
    email: 'carrawell@duke.edu',
    password: 'BlueDevils2!',
    fullName: 'Chris Carrawell',
    role: 'assistant',
  },
];

const TEAM_SETTINGS = {
  teamName: 'Duke Blue Devils',
  abbreviation: 'DUKE',
  primaryColor: '#003087',
  secondaryColor: '#FFFFFF',
};

async function seedDuke() {
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
  console.log('\nDuke seed complete.');
}

seedDuke().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
