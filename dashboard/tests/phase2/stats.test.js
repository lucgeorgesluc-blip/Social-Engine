// Phase 2 stats tests — GET /stats KPI cards + acquisition funnel
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const bcrypt = require('bcryptjs');

const TEST_PASSWORD = 'testpass123';
process.env.DASHBOARD_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 10);
process.env.SESSION_SECRET = 'test-secret-stats';
process.env.DATABASE_URL = 'postgresql://localhost/test_unused';

// Mock db.js — return one metrics_weekly row
const Module = require('module');
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
    if (request === '../lib/db' ||
        (parent && parent.filename && parent.filename.includes('routes') && request.includes('db'))) {
        return {
            pool: { query: async () => ({ rows: [] }) },
            query: async function(sql) {
                if (sql.includes('metrics_weekly')) {
                    return {
                        rows: [{
                            week: '2026-W14',
                            dates: '31 mars — 6 avr 2026',
                            posts_published: 3,
                            total_reach: 1200,
                            total_likes: 48,
                            total_comments: 25,
                            total_shares: 7,
                            info_comments: 12,
                            dm_opened: 10,
                            calendly_booked: 4,
                            patients_converted: 3,
                            engagement_rate: null,
                            learnings: 'Bon taux INFO cette semaine'
                        }]
                    };
                }
                return { rows: [] };
            }
        };
    }
    return originalLoad.apply(this, arguments);
};

const express = require('express');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');

function buildTestApp() {
    const { router: authRouter } = require('../../routes/auth');
    const statsRouter = require('../../routes/stats');

    const app = express();
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../../views'));
    app.use(expressLayouts);
    app.set('layout', 'layout');
    app.use(express.static(path.join(__dirname, '../../public')));
    app.use(express.urlencoded({ extended: false }));
    app.use(express.json());
    app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));
    app.use('/', authRouter);
    app.use('/', statsRouter);
    app.use(function(err, req, res, next) { res.status(500).send('error: ' + err.message); });
    return app;
}

let server;
let sessionCookie;

before(async () => {
    const app = buildTestApp();
    server = http.createServer(app);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

    const loginRes = await request('POST', '/login', { password: TEST_PASSWORD });
    sessionCookie = loginRes.headers['set-cookie'] && loginRes.headers['set-cookie'][0].split(';')[0];
});

after(async () => {
    await new Promise(resolve => server.close(resolve));
});

function request(method, urlPath, body, cookie) {
    return new Promise(function(resolve, reject) {
        const bodyStr = body ? new URLSearchParams(body).toString() : null;
        const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        if (cookie) headers['Cookie'] = cookie;
        if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);
        const req = http.request({
            hostname: '127.0.0.1',
            port: server.address().port,
            path: urlPath,
            method: method,
            headers: headers
        }, function(res) {
            let data = '';
            res.on('data', function(chunk) { data += chunk; });
            res.on('end', function() { resolve({ status: res.statusCode, headers: res.headers, body: data }); });
        });
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

test('GET /stats without session redirects to /login', async () => {
    const res = await request('GET', '/stats');
    assert.equal(res.status, 302);
    assert.ok(res.headers.location && res.headers.location.includes('/login'));
});

test('GET /stats with session returns 200', async () => {
    const res = await request('GET', '/stats', null, sessionCookie);
    assert.equal(res.status, 200);
});

test('GET /stats renders Statistiques heading', async () => {
    const res = await request('GET', '/stats', null, sessionCookie);
    assert.ok(res.body.includes('Statistiques'), 'should contain Statistiques heading');
});

test('GET /stats renders KPI Taux cards', async () => {
    const res = await request('GET', '/stats', null, sessionCookie);
    assert.ok(res.body.includes("Taux d'engagement"), "should contain Taux d'engagement KPI card");
    assert.ok(res.body.includes('Taux INFO'), 'should contain INFO→DM KPI card');
    assert.ok(res.body.includes('Taux DM'), 'should contain DM→Calendly KPI card');
    assert.ok(res.body.includes('Calendly'), 'should contain Calendly→Patient KPI card');
});

test('GET /stats renders acquisition funnel section', async () => {
    const res = await request('GET', '/stats', null, sessionCookie);
    assert.ok(res.body.includes('Entonnoir'), 'should contain Entonnoir section');
});

test('GET /stats computes engagement rate from raw metrics', async () => {
    const res = await request('GET', '/stats', null, sessionCookie);
    // (48 + 25 + 7) / 1200 * 100 = 6.67%
    assert.ok(res.body.includes('6.7'), 'should compute and render engagement rate ~6.7%');
});

test('GET /stats renders funnel bar for Portée', async () => {
    const res = await request('GET', '/stats', null, sessionCookie);
    assert.ok(res.body.includes('Portée'), 'should render Portée funnel step');
    assert.ok(res.body.includes('DM ouverts'), 'should render DM ouverts funnel step');
    assert.ok(res.body.includes('Patients convertis'), 'should render Patients convertis funnel step');
});
