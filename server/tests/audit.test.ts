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
const viewer: TestUser = {
  id: '',
  email: `audit-viewer-${suffix}@example.test`,
  fullName: 'Audit Viewer',
  role: 'viewer',
};
const headCoach: TestUser = {
  id: '',
  email: `audit-head-coach-${suffix}@example.test`,
  fullName: 'Audit Head Coach',
  role: 'head_coach',
};

beforeAll(async () => {
  const passwordHash = await bcrypt.hash('test-password', 12);
  const result = await query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4), ($5, $2, $6, $7)
     RETURNING id, email, role`,
    [
      viewer.email, passwordHash, viewer.fullName, viewer.role,
      headCoach.email, headCoach.fullName, headCoach.role,
    ]
  );

  for (const user of result.rows) {
    if (user.email === viewer.email) viewer.id = user.id;
    if (user.email === headCoach.email) headCoach.id = user.id;
  }
});

afterAll(async () => {
  await query('DELETE FROM users WHERE email = ANY($1)', [[viewer.email, headCoach.email]]);
  await pool.end();
});

describe('GET /audit', () => {
  test('is enforced as head_coach-only at the HTTP layer', async () => {
    const unauthenticated = await request(app).get('/audit');
    const viewerResponse = await request(app)
      .get('/audit')
      .set('Authorization', `Bearer ${signAccessToken(viewer)}`);
    const headCoachResponse = await request(app)
      .get('/audit')
      .set('Authorization', `Bearer ${signAccessToken(headCoach)}`);

    expect(unauthenticated.status).toBe(401);
    expect(viewerResponse.status).toBe(403);
    expect(headCoachResponse.status).toBe(200);
    expect(headCoachResponse.body.entries).toEqual(expect.any(Array));
  });
});
