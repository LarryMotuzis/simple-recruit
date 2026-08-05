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
  email: `stats-coach-${suffix}@example.test`,
  fullName: 'Stats Coach',
  role: 'assistant',
};

let postProspectId = '';
let getProspectId = '';

beforeAll(async () => {
  const passwordHash = await bcrypt.hash('test-password', 12);
  const userResult = await query(
    `INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id`,
    [coach.email, passwordHash, coach.fullName, coach.role]
  );
  coach.id = userResult.rows[0].id;

  const prospects = await query(
    `INSERT INTO prospects (full_name, created_by)
     VALUES ($1, $3), ($2, $3)
     RETURNING id, full_name`,
    [`Stats POST Prospect ${suffix}`, `Stats GET Prospect ${suffix}`, coach.id]
  );
  postProspectId = prospects.rows.find((p) => p.full_name.startsWith('Stats POST'))!.id;
  getProspectId = prospects.rows.find((p) => p.full_name.startsWith('Stats GET'))!.id;
});

afterAll(async () => {
  await query('DELETE FROM prospects WHERE id = ANY($1)', [[postProspectId, getProspectId]]);
  await query('DELETE FROM users WHERE id = $1', [coach.id]);
  await pool.end();
});

describe('POST /prospects/:id/stats', () => {
  test('requires authentication', async () => {
    const response = await request(app).post(`/prospects/${postProspectId}/stats`).send({ points: 10 });
    expect(response.status).toBe(401);
  });

  test('returns 404 for a nonexistent prospect', async () => {
    const response = await request(app)
      .post('/prospects/00000000-0000-0000-0000-000000000000/stats')
      .set('Authorization', `Bearer ${signAccessToken(coach)}`)
      .send({ points: 10 });
    expect(response.status).toBe(404);
  });

  test('creates a stat entry with efficiency and FG% computed via metricsService', async () => {
    const response = await request(app)
      .post(`/prospects/${postProspectId}/stats`)
      .set('Authorization', `Bearer ${signAccessToken(coach)}`)
      .send({ points: 20, rebounds: 5, assists: 4, fgMade: 8, fgAttempted: 12, gameDate: '2025-01-15' });

    // efficiency = (20 + 5 + 4) - (12 - 8) = 25; fg% = 8/12 -> 66.7
    expect(response.status).toBe(201);
    expect(response.body.statEntry).toMatchObject({
      prospect_id: postProspectId,
      points: 20,
      rebounds: 5,
      assists: 4,
      fg_made: 8,
      fg_attempted: 12,
      efficiency: 25,
      fg_percentage: 66.7,
    });
  });

  test('defaults unset stat fields to zero', async () => {
    const response = await request(app)
      .post(`/prospects/${postProspectId}/stats`)
      .set('Authorization', `Bearer ${signAccessToken(coach)}`)
      .send({ points: 12 });

    expect(response.status).toBe(201);
    expect(response.body.statEntry).toMatchObject({
      points: 12,
      rebounds: 0,
      assists: 0,
      fg_made: 0,
      fg_attempted: 0,
      efficiency: 12,
      fg_percentage: 0,
    });
  });
});

describe('GET /prospects/:id/stats', () => {
  beforeAll(async () => {
    await query(
      `INSERT INTO stat_entries (prospect_id, game_date, points, rebounds, assists, fg_made, fg_attempted)
       VALUES ($1, '2025-01-10', 10, 0, 0, 0, 0), ($1, '2025-01-20', 20, 0, 0, 0, 0)`,
      [getProspectId]
    );
  });

  test('requires authentication', async () => {
    const response = await request(app).get(`/prospects/${getProspectId}/stats`);
    expect(response.status).toBe(401);
  });

  test('returns entries ordered by game date with per-entry metrics and an average efficiency', async () => {
    const response = await request(app)
      .get(`/prospects/${getProspectId}/stats`)
      .set('Authorization', `Bearer ${signAccessToken(coach)}`);

    expect(response.status).toBe(200);
    expect(response.body.statEntries.map((s: { points: number }) => s.points)).toEqual([10, 20]);
    expect(response.body.statEntries[0]).toMatchObject({ efficiency: 10, fg_percentage: 0 });
    expect(response.body.statEntries[1]).toMatchObject({ efficiency: 20, fg_percentage: 0 });
    expect(response.body.averageEfficiency).toBe(15);
  });
});
