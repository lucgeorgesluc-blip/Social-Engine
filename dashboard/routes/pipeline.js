// Pipeline route — DM prospect kanban (CONTEXT D-06)
// 4 display columns: INFO / CHAUD / RDV_PREVU / CONVERTI
// Lost prospects are excluded from the kanban entirely.
const express = require('express');
const router = express.Router();
const { query } = require('../lib/db');
const { isAuthenticated } = require('./auth');
const { getDmSequenceRules } = require('../lib/dm-config');

// CONTEXT D-06: 4 display columns
const DISPLAY_STAGES = ['INFO', 'CHAUD', 'RDV_PREVU', 'CONVERTI'];
const DISPLAY_LABELS = {
    INFO:      'INFO',
    CHAUD:     'CHAUD',
    RDV_PREVU: 'RDV PRÉVU',
    CONVERTI:  'CONVERTI'
};
const DISPLAY_COLORS = {
    INFO:      'bg-blue-50 border-blue-200',
    CHAUD:     'bg-orange-50 border-orange-200',
    RDV_PREVU: 'bg-amber-50 border-amber-200',
    CONVERTI:  'bg-green-50 border-green-200'
};

// Heuristic: prospect has replied at least once.
// Checks messages JSONB for role/from='prospect' OR notes contains reply markers.
function hasReply(prospect) {
    if (Array.isArray(prospect.messages)) {
        if (prospect.messages.some(function(m) {
            return m && (m.role === 'prospect' || m.from === 'prospect');
        })) return true;
    }
    const n = (prospect.notes || '').toLowerCase();
    return n.includes('[reply]') || n.includes('repondu') || n.includes('répondu');
}

// DB stage -> Display column mapping (CONTEXT D-06):
// new             -> INFO
// msg1_sent       -> INFO (CHAUD if replied)
// msg2_sent       -> INFO (CHAUD if replied)
// msg3_sent       -> INFO
// booked          -> RDV_PREVU
// converted       -> CONVERTI
// lost            -> null (excluded)
function mapToDisplayStage(prospect) {
    switch (prospect.stage) {
        case 'booked':    return 'RDV_PREVU';
        case 'converted': return 'CONVERTI';
        case 'lost':      return null; // excluded from kanban
        case 'msg1_sent':
        case 'msg2_sent':
            return hasReply(prospect) ? 'CHAUD' : 'INFO';
        case 'new':
        case 'msg3_sent':
        default:
            return 'INFO';
    }
}

router.get('/pipeline', isAuthenticated, async function(req, res, next) {
    try {
        const rules = getDmSequenceRules();
        const now = Date.now();

        const { rows: prospects } = await query(
            'SELECT * FROM prospects ORDER BY date_first_contact DESC'
        );

        // Compute display stage + overdue flag, exclude lost
        const enriched = [];
        prospects.forEach(function(p) {
            const displayStage = mapToDisplayStage(p);
            if (!displayStage) return; // lost: excluded
            const hoursSince = (now - new Date(p.date_first_contact).getTime()) / 3600000;
            const rule = rules[p.stage];
            const dueAfterHours = rule ? rule.follow_up_after_hours : null;
            enriched.push(Object.assign({}, p, {
                displayStage: displayStage,
                isOverdue: dueAfterHours !== null && hoursSince > dueAfterHours,
                hoursSince: Math.floor(hoursSince)
            }));
        });

        // Group into kanban columns (all 4 always present, even when empty)
        const byColumn = {};
        DISPLAY_STAGES.forEach(function(s) { byColumn[s] = []; });
        enriched.forEach(function(p) { byColumn[p.displayStage].push(p); });

        // Funnel data: count + percentage of non-lost total
        const total = enriched.length;
        const funnel = DISPLAY_STAGES.map(function(s) {
            return {
                stage: s,
                label: DISPLAY_LABELS[s],
                count: byColumn[s].length,
                pct: total > 0 ? Math.round((byColumn[s].length / total) * 100) : 0
            };
        });

        res.render('pipeline', {
            currentPath: '/pipeline',
            byColumn: byColumn,
            funnel: funnel,
            totalProspects: total,
            DISPLAY_STAGES: DISPLAY_STAGES,
            DISPLAY_LABELS: DISPLAY_LABELS,
            DISPLAY_COLORS: DISPLAY_COLORS
        });
    } catch (err) { next(err); }
});

module.exports = router;
