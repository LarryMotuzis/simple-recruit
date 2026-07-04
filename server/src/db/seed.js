import bcrypt from 'bcryptjs';
import { pool } from './pool.js';

const users = [
  {
    email: 'larrymotuzis@gmail.com',
    password: 'Lewis2025!',
    fullName: 'Larry Motuzis',
    role: 'head_coach',
  },
  {
    email: 'headcoach@test.com',
    password: 'headcoach123',
    fullName: 'Test Head Coach',
    role: 'head_coach',
  },
  {
    email: 'assistant@test.com',
    password: 'assistant123',
    fullName: 'Test Assistant',
    role: 'assistant',
  },
];

async function seed() {
  for (const u of users) {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [u.email]);
    if (existing.rows.length > 0) {
      console.log(`Skipping ${u.email} — already exists`);
      continue;
    }
    const hash = await bcrypt.hash(u.password, 12);
    await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4)`,
      [u.email, hash, u.fullName, u.role]
    );
    console.log(`Created user: ${u.email} (${u.role}) — password: ${u.password}`);
  }

  await pool.end();
  console.log('Seed complete.');
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
