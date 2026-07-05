import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import prospectRoutes from './routes/prospects.js';
import auditRoutes from './routes/audit.js';
import portalRoutes from './routes/portal.js';
import rosterRoutes from './routes/roster.js';
import teamSettingsRoutes from './routes/teamSettings.js';
import userRoutes from './routes/users.js';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

// Fail fast in production if required env vars are missing
if (isProd && !process.env.CLIENT_ORIGIN) {
  throw new Error('CLIENT_ORIGIN env var is required in production');
}

export const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Rate-limit auth endpoints — 20 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/auth', authLimiter, authRoutes);
app.use('/prospects', prospectRoutes);
app.use('/audit', auditRoutes);
app.use('/portal', portalRoutes);
app.use('/roster', rosterRoutes);
app.use('/team-settings', teamSettingsRoutes);
app.use('/users', userRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler — catches any error passed via next(err) or thrown in middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});
