// Phase 2 calendar tests — GET /posts/calendar monthly-only
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const bcrypt = require('bcryptjs');

const TEST_PASSWORD = 'testpass123';
process.env.DASHBOARD_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 10);
process.env.SESSION_SECRET = 'test-secret-cal';
process.env.DATABASE_URL = 'postgresql://localhost/test_unused';

// Mock db.js
const Module = require('module');
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === '../lib/db' || (parent && parent.filename && parent.filename.includes('routes') && request.includes('db'))) {
        return {
            pool: { query: async () => ({ rows: [] }) },
            query: async () => ({ rows: [] })
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
    const postsRouter = require('../../routes/posts');

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
    app.use('/', postsRouter);
    app.use((err, req, res, next) => { res.status(500).send('error: ' + err.message); });
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
    return new Promise((resolve, reject) => {
        const bodyStr = body ? new URLSearchParams(body).toString() : null;
        const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        if (cookie) headers['Cookie'] = cookie;
        if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);
        const req = http.request({
            hostname: '127.0.0.1',
            port: server.address().port,
            path: urlPath,
            method,
            headers
        }, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
        });
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

test('GET /posts/calendar without session redirects to /login', async () => {
    const res = await request('GET', '/posts/calendar');
    assert.equal(res.status, 302);
    assert.ok(res.headers.location && res.headers.location.includes('/login'));
});

test('GET /posts/calendar with session returns 200 with monthly grid', async () => {
    const res = await request('GET', '/posts/calendar', null, sessionCookie);
    assert.equal(res.status, 200);
    assert.ok(res.body.includes('data-day-key'), 'should contain data-day-key cells');
    assert.ok(res.body.includes('day-expand-panel'), 'should contain day expand panel');
});

test('GET /posts/calendar does NOT contain week view controls', async () => {
    const res = await request('GET', '/posts/calendar', null, sessionCookie);
    assert.equal(res.status, 200);
    assert.ok(!res.body.includes('view=week'), 'should NOT contain view=week toggle');
    assert.ok(!res.body.includes('Semaine'), 'should NOT contain Semaine (week) toggle');
});
