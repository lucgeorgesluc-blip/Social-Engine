// AI generation routes — Phase 4: AI-01, AI-02, AI-03
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('./auth');
const { generatePost, getMonthlyUsage, getFrequentObjections } = require('../lib/ai');
const { POST_TYPES } = require('../lib/prompts');

const POST_TYPE_IDS = POST_TYPES.map(p => p.id);

// GET / — AI generation page (mounted at /dashboard/ai)
router.get('/', isAuthenticated, async (req, res, next) => {
    try {
        const [usage, suggestions] = await Promise.all([
            getMonthlyUsage(),
            getFrequentObjections()
        ]);
        // Pre-fill type/context from query params (e.g. from homepage suggestion link)
        const selectedType = POST_TYPE_IDS.includes(req.query.type) ? req.query.type : null;
        const context = req.query.context || '';
        res.render('ai', {
            currentPath: '/dashboard/ai',
            postTypes: POST_TYPES,
            usage,
            suggestions,
            generated: null,
            error: null,
            selectedType,
            context
        });
    } catch (err) { next(err); }
});

// POST /generate — generate a post via Claude
router.post('/generate', isAuthenticated, async (req, res, next) => {
    try {
        const { type, context } = req.body;
        const [usage, suggestions] = await Promise.all([
            getMonthlyUsage(),
            getFrequentObjections()
        ]);

        if (!POST_TYPE_IDS.includes(type)) {
            return res.render('ai', {
                currentPath: '/dashboard/ai',
                postTypes: POST_TYPES, usage, suggestions,
                generated: null, error: 'Type de post invalide.',
                selectedType: null, context: context || ''
            });
        }

        try {
            const result = await generatePost(type, context || '');
            const updatedSuggestions = await getFrequentObjections();
            return res.render('ai', {
                currentPath: '/dashboard/ai',
                postTypes: POST_TYPES,
                usage: result.usage,
                suggestions: updatedSuggestions,
                generated: result.text,
                error: null,
                selectedType: type,
                context: context || ''
            });
        } catch (genErr) {
            const errorMsg = genErr.message === 'LIMIT_REACHED'
                ? 'Limite mensuelle atteinte (100 générations). Réessayez le mois prochain.'
                : 'Erreur de génération : ' + genErr.message;
            return res.render('ai', {
                currentPath: '/dashboard/ai',
                postTypes: POST_TYPES, usage, suggestions,
                generated: null, error: errorMsg,
                selectedType: type, context: context || ''
            });
        }
    } catch (err) { next(err); }
});

// GET /usage — JSON endpoint returning current monthly usage
router.get('/usage', isAuthenticated, async (req, res, next) => {
    try {
        const usage = await getMonthlyUsage();
        res.json(usage);
    } catch (err) { next(err); }
});

module.exports = router;
