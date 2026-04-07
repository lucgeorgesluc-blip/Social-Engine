// Phase 2 comments tests — GET /comments accordion + 3-state dot
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const bcrypt = require('bcryptjs');

const TEST_PASSWORD = 'testpass123';
process.env.DASHBOARD_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 10);
process.env.SESSION_SECRET = 'test-secret-cmt';
process.env.DATABASE_URL = 'postgresql://localhost/test_unused';

// Mock db.js
const Module = require('module');
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === '../lib/db' || (parent && parent.filename && parent.filename.includes('routes') && request.includes('db'))) {
        return {
            pool: { query: async () => ({ rows: [] }) },
            query: async (sql) => {
                if (sql.includes('FROM comments c')) {
                    const now = new Date();
                    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
                    return {
                        rows: [
                            // grey: pending, recent (< 2h)
                            { id: 1, post_id: 10, post_hook: 'Post A', post_status: 'published', author_name: 'Alice', comment_text: 'Super!', classification: 'positive', response_status: 'pending', date: now.toISOString(), created_at: now.toISOString() },
                            // orange: pending, overdue (> 2h)
                            { id: 2, post_id: 10, post_hook: 'Post A', post_status: 'published', author_name: 'Bob', comment_text: 'Question?', classification: 'info', response_status: 'pending', date: threeHoursAgo.toISOString(), created_at: threeHoursAgo.toISOString() },
                            // green: responded
                            { id: 3, post_id: 10, post_hook: 'Post A', post_status: 'published', author_name: 'Carol', comment_text: 'Merci!', classification: 'positive', response_status: 'responded', date: threeHoursAgo.toISOString(), created_at: threeHoursAgo.toISOString() }
                        ]
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
    const commentsRouter = require('../../routes/comments');

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
    app.use('/', commentsRouter);
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

test('GET /comments without session redirects to /login', async () => {
    const res = await request('GET', '/comments');
    assert.equal(res.status, 302);
    assert.ok(res.headers.location && res.headers.location.includes('/login'));
});

test('GET /comments with session returns 200 with accordion markup', async () => {
    const res = await request('GET', '/comments', null, sessionCookie);
    assert.equal(res.status, 200);
    assert.ok(res.body.includes('data-accordion'), 'should contain data-accordion attribute');
    assert.ok(res.body.includes('accordion-body-'), 'should contain accordion-body- panels');
});

test('GET /comments renders 3-state dots including orange for overdue', async () => {
    const res = await request('GET', '/comments', null, sessionCookie);
    assert.equal(res.status, 200);
    assert.ok(res.body.includes('bg-orange-500'), 'should render orange dot for overdue comment');
    assert.ok(res.body.includes('bg-green-500'), 'should render green dot for responded comment');
    assert.ok(res.body.includes('bg-gray-400'), 'should render grey dot for pending comment');
});
