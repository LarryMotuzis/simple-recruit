import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import prospectRoutes from './routes/prospects.js';
import auditRoutes from './routes/audit.js';
import portalRoutes from './routes/portal.js';
import rosterRoutes from './routes/roster.js';
import teamSettingsRoutes from './routes/teamSettings.js';
import userRoutes from './routes/users.js';

dotenv.config();

export const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/prospects', prospectRoutes);
app.use('/audit', auditRoutes);
app.use('/portal', portalRoutes);
app.use('/roster', rosterRoutes);
app.use('/team-settings', teamSettingsRoutes);
app.use('/users', userRoutes);

// Fallback 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
