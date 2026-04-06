// Tests for INFRA-01 — health endpoint smoke test
'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

let server;
let port;

describe('Health endpoint', () => {
    before(async () => {
        // Start the app on a random port for testing
        const app = require('../server');
        await new Promise((resolve, reject) => {
            server = app.listen(0, (err) => {
                if (err) return reject(err);
                port = server.address().port;
                resolve();
            });
        });
    });

    after(async () => {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
        // Close DB pool to avoid test runner hanging
        const { pool } = require('../lib/db');
        await pool.end();
    });

    it('GET /health returns 200 with db connected', async () => {
        const body = await new Promise((resolve, reject) => {
            http.get(`http://localhost:${port}/health`, (res) => {
                assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}`);
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => resolve(data));
            }).on('error', reject);
        });

        const json = JSON.parse(body);
        assert.strictEqual(json.status, 'ok', `Expected status 'ok', got '${json.status}'`);
        assert.strictEqual(json.db, 'connected', `Expected db 'connected', got '${json.db}'`);
        assert.ok(json.counts, 'Expected counts object in response');
    });
});
