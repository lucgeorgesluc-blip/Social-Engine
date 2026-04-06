// Shared test utilities for dashboard test suite
const path = require('path');
const fs = require('fs');

// Return DB module (loads after dotenv is configured)
function getTestDb() {
    return require('../lib/db');
}

// Truncate all tables in reverse dependency order (preserves user_sessions)
async function cleanDb() {
    const { query } = getTestDb();
    await query('TRUNCATE TABLE metrics_weekly, prospects, comments, posts RESTART IDENTITY CASCADE');
}

// Read schema.sql and execute against the DB
async function runSchema() {
    const { pool } = getTestDb();
    const schemaSQL = fs.readFileSync(path.join(__dirname, '../lib/schema.sql'), 'utf8');
    await pool.query(schemaSQL);
}

module.exports = { getTestDb, cleanDb, runSchema };
