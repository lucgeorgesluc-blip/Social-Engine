import express from 'express';
import { config } from 'dotenv';
import pino from 'pino';

config(); // loads .env in local dev; no-op if missing

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
const PORT = process.env.PORT || 3000;

// Health check — Render monitors this (D-10)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Autopilot server listening');
});

export { app, server };
