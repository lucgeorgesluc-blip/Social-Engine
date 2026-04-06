// Auth flow tests — uses Node.js built-in test runner
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const bcrypt = require('bcryptjs');

// Set env vars BEFORE loading the app (dotenv would override so we set directly)
const TEST_PASSWORD = 'testpass123';
process.env.DASHBOARD_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 10);
process.env.SESSION_SECRET = 'test-secret';
// Use a memory/no-op session store for tests (avoid needing real DB for auth tests)
process.env.TEST_MODE = 'true';

let server;
let baseUrl;

// Build a minimal test app that mirrors server.js auth behaviour
// but uses in-memory session store to avoid DB dependency in auth tests
function buildTestApp() {
    const express = require('express');
    const session = require('express-session');
    const expressLayouts = require('express-ejs-layouts');
    const path = require('path');
    const { router: authRouter, isAuthenticated } = require('../routes/auth');

    const app = express();
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../views'));
    app.use(expressLayouts);
    app.set('layout', 'layout');

    app.use(express.static(path.join(__dirname, '../public')));
    app.use(express.urlencoded({ extended: false }));
    app.use(express.json());

    // In-memory session store (no DB needed for auth tests)
    app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: { httpOnly: true }
    }));

    app.use('/', authRouter);

    // Protected stub route for testing redirect behaviour
    app.get('/', isAuthenticated, (req, res) => {
        res.status(200).send('dashboard ok');
    });

    return app;
}

before(async () => {
    const app = buildTestApp();
    server = http.createServer(app);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
    await new Promise(resolve => server.close(resolve));
});

// Helper: make a raw HTTP request and follow 0 redirects
function request(method, path, body, cookieHeader) {
    return new Promise((resolve, reject) => {
        const url = new URL(baseUrl + path);
        const bodyStr = body ? new URLSearchParams(body).toString() : null;
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        if (cookieHeader) headers['Cookie'] = cookieHeader;
        if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);

        const req = http.request({
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
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

test('GET /login returns 200 with login form', async () => {
    const res = await request('GET', '/login');
    assert.equal(res.status, 200);
    assert.ok(res.body.includes('Mot de passe'), 'should contain "Mot de passe"');
    assert.ok(res.body.includes('Se connecter'), 'should contain "Se connecter"');
});

test('POST /login with wrong password returns login page with error', async () => {
    const res = await request('POST', '/login', { password: 'wrongpassword' });
    assert.equal(res.status, 200);
    assert.ok(res.body.includes('Mot de passe incorrect'), 'should show error message');
});

test('POST /login with correct password redirects to /', async () => {
    const res = await request('POST', '/login', { password: TEST_PASSWORD });
    assert.equal(res.status, 302);
    assert.ok(res.headers.location === '/' || res.headers.location.endsWith('/'), 'should redirect to /');
});

test('GET / without session redirects to /login', async () => {
    const res = await request('GET', '/');
    assert.equal(res.status, 302);
    assert.ok(res.headers.location && res.headers.location.includes('/login'), 'should redirect to /login');
});
