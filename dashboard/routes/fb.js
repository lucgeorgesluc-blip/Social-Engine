// Facebook integration routes — OAuth, token status, manual sync triggers, settings
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { isAuthenticated } = require('./auth');
const { getPageToken, checkTokenHealth, debugToken, exchangeCodeForToken, storePageToken } = require('../lib/fb-token');
const { query } = require('../lib/db');

// ── Token OAuth ───────────────────────────────────────────────────────────────

// GET /dashboard/fb/auth — redirect to Facebook OAuth
router.get('/dashboard/fb/auth', isAuthenticated, (req, res) => {
    const redirectUri = `${req.protocol}://${req.get('host')}/dashboard/fb/callback`;
    const csrfState = crypto.randomBytes(16).toString('hex');
    req.session.fbOAuthState = csrfState;
    const oauthUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${process.env.FB_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=pages_read_engagement,pages_read_user_content,read_insights,pages_manage_posts&state=${csrfState}`;
    res.redirect(oauthUrl);
});

// GET /dashboard/fb/callback — handle OAuth callback
router.get('/dashboard/fb/callback', isAuthenticated, async (req, res) => {
    const { code, state, error } = req.query;
    const redirectUri = `${req.protocol}://${req.get('host')}/dashboard/fb/callback`;

    if (error) {
        console.error('[fb] OAuth denied:', error);
        return res.redirect('/');
    }
    if (!state || state !== req.session.fbOAuthState) {
        console.error('[fb] CSRF state mismatch');
        return res.redirect('/');
    }
    delete req.session.fbOAuthState;

    try {
        const tokenData = await exchangeCodeForToken(code, redirectUri);
        await storePageToken(tokenData);
        console.log('[fb] Page token stored for page:', tokenData.page_id);
    } catch (err) {
        console.error('[fb] Token exchange failed:', err.message);
    }
    res.redirect('/');
});

// GET /dashboard/fb/status — AJAX endpoint for token health banner
router.get('/dashboard/fb/status', isAuthenticated, async (req, res) => {
    try {
        const token = await getPageToken();
        if (!token) {
            return res.json(checkTokenHealth(null));
        }
        const debug = await debugToken(token.access_token);
        return res.json(checkTokenHealth(debug));
    } catch (err) {
        console.error('[fb] status check failed:', err.message);
        return res.json({ status: 'error', color: 'red', message: 'Erreur vérification token' });
    }
});

// ── Manual sync triggers (added by Plan 02) ──────────────────────────────────

// POST /dashboard/fb/sync-comments — manual comment sync trigger
router.post('/dashboard/fb/sync-comments', isAuthenticated, async (req, res) => {
    try {
        const { syncComments } = require('../lib/fb-comments');
        const result = await syncComments();
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /dashboard/fb/sync-metrics — manual metrics sync trigger
router.post('/dashboard/fb/sync-metrics', isAuthenticated, async (req, res) => {
    try {
        const { syncMetrics } = require('../lib/fb-metrics');
        const result = await syncMetrics();
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── Settings (added by Plan 03) ───────────────────────────────────────────────

// GET /dashboard/settings — settings page
router.get('/dashboard/settings', isAuthenticated, async (req, res) => {
    try {
        const { isAutoPublishEnabled } = require('../lib/fb-publish');
        const autoPublish = await isAutoPublishEnabled();
        const token = await getPageToken();
        let hasPublishScope = false;
        if (token) {
            const debug = await debugToken(token.access_token);
            hasPublishScope = !!(debug && debug.scopes && debug.scopes.includes('pages_manage_posts'));
        }
        res.render('settings', {
            currentPath: '/dashboard/settings',
            autoPublish,
            hasPublishScope,
            hasToken: !!token,
            errorParam: req.query.error || null
        });
    } catch (err) {
        console.error('[fb] settings page error:', err.message);
        res.render('settings', {
            currentPath: '/dashboard/settings',
            autoPublish: false,
            hasPublishScope: false,
            hasToken: false,
            errorParam: null
        });
    }
});

// POST /dashboard/settings/auto-publish — toggle auto-publish feature flag
router.post('/dashboard/settings/auto-publish', isAuthenticated, async (req, res) => {
    const enable = req.body.enable === 'true';
    if (enable) {
        const token = await getPageToken();
        if (!token) return res.redirect('/dashboard/settings?error=no_token');
        const debug = await debugToken(token.access_token);
        if (!debug || !debug.scopes || !debug.scopes.includes('pages_manage_posts')) {
            return res.redirect('/dashboard/settings?error=no_scope');
        }
    }
    await query(
        `INSERT INTO fb_sync_state (key, value, updated_at) VALUES ('auto_publish_enabled', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [enable ? 'true' : 'false']
    );
    res.redirect('/dashboard/settings');
});

module.exports = router;
