// Dashboard server — Express 4 CJS app entry point
// Run: node server.js  |  Dev: nodemon server.js
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const fs = require('fs');
const path = require('path');
const { pool } = require('./lib/db');
const { runSeed } = require('./lib/seed');
const { runMigrations } = require('./lib/migrate');
const { router: authRouter, isAuthenticated } = require('./routes/auth');
const dashRouter = require('./routes/dashboard');
const postsRouter = require('./routes/posts');
const commentsRouter = require('./routes/comments');
const pipelineRouter = require('./routes/pipeline');
const statsRouter = require('./routes/stats');
const metricsRouter = require('./routes/metrics');
const aiRouter = require('./routes/ai');
const fbRouter = require('./routes/fb');
const { startCronJobs } = require('./lib/fb-cron');

const app = express();

// View engine — EJS with express-ejs-layouts
const expressLayouts = require('express-ejs-layouts');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Trust Render's proxy for secure cookies in production
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parsers
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Session middleware — PgSession in production, memory store locally (no DB needed)
const sessionStore = process.env.DATABASE_URL
    ? new PgSession({ pool, tableName: 'user_sessions' })
    : undefined; // express-session defaults to MemoryStore when store is undefined

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
}));

// Mount routes — auth MUST be before dashboard routes
app.use('/', authRouter);
app.use('/', dashRouter);
app.use('/', postsRouter);
app.use('/', commentsRouter);
app.use('/', pipelineRouter);
app.use('/', statsRouter);
app.use('/', metricsRouter);
app.use('/dashboard/ai', aiRouter);
app.use('/', fbRouter);

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', { status: 404, message: 'Page non trouvée' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render('error', { status: 500, message: 'Erreur interne du serveur' });
});

const PORT = process.env.PORT || 3001;

// Boot sequence — schema + seed, then listen
(async () => {
    try {
        // Run schema migrations
        const schemaSQL = fs.readFileSync(path.join(__dirname, 'lib', 'schema.sql'), 'utf8');
        await pool.query(schemaSQL);
        console.log('[boot] Schema applied');

        // Run column migrations (idempotent ALTER TABLE statements)
        await runMigrations();

        // AI schema — ai_generations table
        const aiSchemaSQL = fs.readFileSync(path.join(__dirname, 'lib', 'ai-schema.sql'), 'utf8');
        await pool.query(aiSchemaSQL);
        console.log('[boot] AI schema applied');

        // Facebook schema — fb_tokens, fb_sync_state, post_metrics tables
        const schemaFbSQL = fs.readFileSync(path.join(__dirname, 'lib', 'schema-fb.sql'), 'utf8');
        await pool.query(schemaFbSQL);
        console.log('[boot] FB schema applied');

        // Seed YAML data (idempotent — safe to run on every boot)
        const counts = await runSeed();
        console.log('[boot] Seed complete:', counts);

        // Start Facebook sync cron jobs
        startCronJobs();
    } catch (err) {
        // Do NOT crash — server must start so /health can report DB status
        console.error('[boot] DB init failed (server still starting):', err.message);
    }

    app.listen(PORT, () => {
        console.log(`[server] Dashboard running on port ${PORT}`);
    });
})();

module.exports = app;
