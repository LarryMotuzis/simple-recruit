import bcrypt from 'bcryptjs';
import request from 'supertest';

import { app } from '../src/app.js';
import { pool, query } from '../src/db/pool.js';

const testEmail = `auth-test-${Date.now()}@example.test`;
const password = 'correct-horse-battery-staple';

beforeAll(async () => {
  const passwordHash = await bcrypt.hash(password, 12);
  await query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4)`,
    [testEmail, passwordHash, 'Auth Test User', 'viewer']
  );
});

afterAll(async () => {
  await query('DELETE FROM users WHERE email = $1', [testEmail]);
  await pool.end();
});

describe('POST /auth/login', () => {
  test('returns 400 when required fields are missing', async () => {
    const response = await request(app).post('/auth/login').send({ email: testEmail });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'email and password are required' });
  });

  test('returns the same 401 response for a wrong password and unknown email', async () => {
    const wrongPassword = await request(app)
      .post('/auth/login')
      .send({ email: testEmail, password: 'wrong-password' });
    const unknownEmail = await request(app)
      .post('/auth/login')
      .send({ email: `unknown-${Date.now()}@example.test`, password });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.body).toEqual({ error: 'Invalid credentials' });
  });

  test('returns an access token and httpOnly refresh cookie without a password hash', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: testEmail, password });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringMatching(/^refresh_token=.*; HttpOnly/i)])
    );
    expect(response.body.user).toMatchObject({ email: testEmail, role: 'viewer' });
    expect(response.body).not.toHaveProperty('password_hash');
    expect(response.body.user).not.toHaveProperty('password_hash');
  });
});
