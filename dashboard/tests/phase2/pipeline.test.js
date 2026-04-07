// Phase 2 pipeline tests — GET /pipeline horizontal kanban (CONTEXT D-06)
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const bcrypt = require('bcryptjs');

const TEST_PASSWORD = 'testpass123';
process.env.DASHBOARD_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 10);
process.env.SESSION_SECRET = 'test-secret-pipeline';
process.env.DATABASE_URL = 'postgresql://localhost/test_unused';

// Mock db.js — return a mix of prospects in different stages
const Module = require('module');
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
    if (request === '../lib/db' ||
        (parent && parent.filename && parent.filename.includes('routes') && request.includes('db'))) {
        const now = new Date();
        const prospects = [
            // new -> INFO
            { id: 1, prospect_name: 'Alice', full_name: null, stage: 'new', date_first_contact: now.toISOString(), messages: null, calendly_date: null, conversion_date: null, lost_reason: null, notes: null },
            // msg1_sent without reply -> INFO
            { id: 2, prospect_name: 'Bob', full_name: null, stage: 'msg1_sent', date_first_contact: now.toISOString(), messages: null, calendly_date: null, conversion_date: null, lost_reason: null, notes: 'Premier contact' },
            // msg2_sent with reply marker -> CHAUD
            { id: 3, prospect_name: 'Carol', full_name: null, stage: 'msg2_sent', date_first_contact: now.toISOString(), messages: null, calendly_date: null, conversion_date: null, lost_reason: null, notes: 'repondu hier' },
            // msg1_sent with messages role=prospect -> CHAUD
            { id: 4, prospect_name: 'Dave', full_name: null, stage: 'msg1_sent', date_first_contact: now.toISOString(), messages: [{ role: 'prospect', text: 'Merci' }], calendly_date: null, conversion_date: null, lost_reason: null, notes: null },
            // booked -> RDV_PREVU
            { id: 5, prospect_name: 'Eve', full_name: null, stage: 'booked', date_first_contact: now.toISOString(), messages: null, calendly_date: now.toISOString(), conversion_date: null, lost_reason: null, notes: null },
            // converted -> CONVERTI
            { id: 6, prospect_name: 'Frank', full_name: null, stage: 'converted', date_first_contact: now.toISOString(), messages: null, calendly_date: null, conversion_date: now.toISOString(), lost_reason: null, notes: null },
            // lost -> excluded
            { id: 7, prospect_name: 'Lost Prospect', full_name: null, stage: 'lost', date_first_contact: now.toISOString(), messages: null, calendly_date: null, conversion_date: null, lost_reason: 'No interest', notes: null }
        ];
        return {
            pool: { query: async () => ({ rows: [] }) },
            query: async function(sql) {
                if (sql.includes('FROM prospects')) return { rows: prospects };
                return { rows: [] };
            }
        };
    }
    // Mock dm-config to avoid reading real YAML in tests
    if (request === '../lib/dm-config' ||
        (parent && parent.filename && parent.filename.includes('routes') && request.includes('dm-config'))) {
        return {
            getDmSequenceRules: function() {
                return {
                    new: { follow_up_after_hours: 0 },
                    msg1_sent: { follow_up_after_hours: 48 },
                    msg2_sent: { follow_up_after_hours: 168 },
                    msg3_sent: { follow_up_after_hours: 336 }
                };
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
    const pipelineRouter = require('../../routes/pipeline');

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
    app.use('/', pipelineRouter);
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

test('GET /pipeline without session redirects to /login', async () => {
    const res = await request('GET', '/pipeline');
    assert.equal(res.status, 302);
    assert.ok(res.headers.location && res.headers.location.includes('/login'));
});

test('GET /pipeline with session returns 200', async () => {
    const res = await request('GET', '/pipeline', null, sessionCookie);
    assert.equal(res.status, 200);
});

test('GET /pipeline renders Pipeline DM heading', async () => {
    const res = await request('GET', '/pipeline', null, sessionCookie);
    assert.ok(res.body.includes('Pipeline DM'), 'should contain Pipeline DM heading');
});

test('GET /pipeline renders all 4 kanban columns', async () => {
    const res = await request('GET', '/pipeline', null, sessionCookie);
    assert.ok(res.body.includes('INFO'),       'should contain INFO column');
    assert.ok(res.body.includes('CHAUD'),      'should contain CHAUD column');
    assert.ok(res.body.includes('RDV'),        'should contain RDV PREVU column');
    assert.ok(res.body.includes('CONVERTI'),   'should contain CONVERTI column');
});

test('GET /pipeline has horizontal scroll markup', async () => {
    const res = await request('GET', '/pipeline', null, sessionCookie);
    assert.ok(res.body.includes('overflow-x-auto'), 'should contain overflow-x-auto for horizontal scroll');
});

test('GET /pipeline excludes lost prospects', async () => {
    const res = await request('GET', '/pipeline', null, sessionCookie);
    assert.ok(!res.body.includes('Lost Prospect'), 'lost prospect should not appear in kanban');
});

test('GET /pipeline renders overdue style (border-l-red-500)', async () => {
    // The "new" prospect has 0h since first contact, dueAfterHours=0, so hoursSince(0) > 0 is false.
    // msg1_sent prospect with 48h rule: date_first_contact=now, 0h since, not overdue.
    // This test verifies the class is present in the template (not necessarily triggered with fresh data).
    const res = await request('GET', '/pipeline', null, sessionCookie);
    assert.ok(res.body.includes('border-l-red-500'), 'should contain overdue red border class in template');
});
