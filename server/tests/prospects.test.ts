import bcrypt from 'bcryptjs';
import request from 'supertest';

import { app } from '../src/app.js';
import { pool, query } from '../src/db/pool.js';
import { signAccessToken, type Role } from '../src/lib/tokens.js';

interface TestUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

const suffix = Date.now();
const coach: TestUser = {
  id: '',
  email: `patch-coach-${suffix}@example.test`,
  fullName: 'Patch Coach',
  role: 'head_coach',
};

let prospectId = '';

beforeAll(async () => {
  const passwordHash = await bcrypt.hash('test-password', 12);
  const userResult = await query(
    `INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id`,
    [coach.email, passwordHash, coach.fullName, coach.role]
  );
  coach.id = userResult.rows[0].id;

  const prospectResult = await query(
    `INSERT INTO prospects (full_name, position, weight_lbs, region, created_by)
     VALUES ($1, 'PG', 180, 'Midwest', $2) RETURNING id`,
    [`Patch Test Prospect ${suffix}`, coach.id]
  );
  prospectId = prospectResult.rows[0].id;
});

afterAll(async () => {
  await query('DELETE FROM prospects WHERE id = $1', [prospectId]);
  await query('DELETE FROM users WHERE id = $1', [coach.id]);
  await pool.end();
});

describe('PATCH /prospects/:id', () => {
  test('accepts null to clear optional fields (matches what the edit form sends)', async () => {
    const response = await request(app)
      .patch(`/prospects/${prospectId}`)
      .set('Authorization', `Bearer ${signAccessToken(coach)}`)
      .send({
        position: null,
        secondaryPosition: null,
        weightLbs: null,
        region: null,
        currentSchool: null,
        contactPhone: null,
        contactEmail: null,
        notes: null,
      });

    expect(response.status).toBe(200);
    expect(response.body.prospect).toMatchObject({
      position: null,
      secondary_position: null,
      weight_lbs: null,
      region: null,
      current_school: null,
      contact_phone: null,
      contact_email: null,
      notes: null,
    });
  });
});
