// Integration tests for homepage inbox sections (Phase 2 Plan 01)
'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

// Load env before requiring app modules
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { getTestDb, cleanDb, runSchema } = require('../helpers');

// ========================================
// Test helpers
// ========================================

function renderDashboardHtml(data) {
    // Simulate EJS rendering by checking the template keys and data structure
    // (real rendering requires a running Express app; these are unit-style checks)
    const ejs = require('ejs');
    const fs = require('fs');
    const templatePath = path.join(__dirname, '../../views/dashboard.ejs');
    const template = fs.readFileSync(templatePath, 'utf8');
    return ejs.render(template, { ...data });
}

const BASE_DATA = {
    currentPath: '/',
    dbConnected: true,
    dbError: false,
    counts: { posts: '0', comments: '0', prospects: '0' },
    todayPosts: [],
    todayPostsTotal: 0,
    pendingComments: [],
    pendingCommentsTotal: 0,
    overdueCommentCount: 0,
    activeProspects: [],
    activeProspectsTotal: 0,
    overdueProspectCount: 0
};

// ========================================
// Section header tests
// ========================================

describe('Dashboard inbox sections', () => {
    it('renders all three section headers', () => {
        const html = renderDashboardHtml(BASE_DATA);
        assert.ok(html.includes('Posts du jour'), 'Missing "Posts du jour" header');
        assert.ok(html.includes('Commentaires en attente'), 'Missing "Commentaires en attente" header');
        assert.ok(html.includes('Suivis DM'), 'Missing "Suivis DM" header');
    });

    it('shows "Voir tout" link to /posts when todayPostsTotal > 0', () => {
        const html = renderDashboardHtml({ ...BASE_DATA, todayPostsTotal: 3 });
        assert.ok(html.includes('href="/posts"') && html.includes('Voir tout'), 'Missing "Voir tout" link to /posts');
    });

    it('shows "Voir tout" link to /comments when pendingCommentsTotal > 0', () => {
        const html = renderDashboardHtml({ ...BASE_DATA, pendingCommentsTotal: 2 });
        assert.ok(html.includes('href="/comments"') && html.includes('Voir tout'), 'Missing "Voir tout" link to /comments');
    });

    it('shows "Voir tout" link to /pipeline when activeProspectsTotal > 0', () => {
        const html = renderDashboardHtml({ ...BASE_DATA, activeProspectsTotal: 1 });
        assert.ok(html.includes('href="/pipeline"') && html.includes('Voir tout'), 'Missing "Voir tout" link to /pipeline');
    });

    it('does NOT show "Voir tout" links when totals are 0', () => {
        const html = renderDashboardHtml(BASE_DATA);
        // With totals = 0, no Voir tout links should appear
        // Count occurrences — none expected
        const matches = (html.match(/Voir tout/g) || []);
        assert.equal(matches.length, 0, 'Should not show "Voir tout" when totals are 0');
    });
});

// ========================================
// Overdue styling tests (D-04)
// ========================================

describe('Overdue items use border-l-4 border-l-red-500 (D-04)', () => {
    it('applies border-l-red-500 to overdue comment', () => {
        const overdueComment = {
            id: 1,
            author_name: 'Marie',
            comment_text: 'Je suis intéressée',
            classification: 'info',
            created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3h ago
            date: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            post_hook: 'Test post',
            post_id: 1,
            isOverdue: true
        };
        const html = renderDashboardHtml({
            ...BASE_DATA,
            pendingComments: [overdueComment],
            pendingCommentsTotal: 1,
            overdueCommentCount: 1
        });
        assert.ok(html.includes('border-l-red-500'), 'Missing border-l-red-500 for overdue comment');
    });

    it('does NOT apply border-l-red-500 to non-overdue comment', () => {
        const freshComment = {
            id: 2,
            author_name: 'Jean',
            comment_text: 'Question',
            classification: 'info',
            created_at: new Date().toISOString(),
            date: new Date().toISOString(),
            post_hook: 'Test post',
            post_id: 1,
            isOverdue: false
        };
        const html = renderDashboardHtml({
            ...BASE_DATA,
            pendingComments: [freshComment],
            pendingCommentsTotal: 1,
            overdueCommentCount: 0
        });
        // When isOverdue is false, the card div should not contain the red border class.
        // Extract just the rendered card div (between the two comment section divs).
        // The EJS conditional produces '' for the class when isOverdue=false,
        // so the rendered div class attribute should not contain border-l-red-500.
        const cardMatch = html.match(/<div class="bg-white rounded-lg border border-gray-100 p-4 ([^"]*)">/);
        const cardClass = cardMatch ? cardMatch[1] : '';
        assert.ok(!cardClass.includes('border-l-red-500'), `Card class "${cardClass}" should not contain border-l-red-500 for non-overdue comment`);
    });

    it('does NOT use bg-red-50 fill for overdue items (D-04)', () => {
        const overdueComment = {
            id: 3,
            author_name: 'Paul',
            comment_text: 'Urgent',
            isOverdue: true,
            created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            post_hook: 'Post',
            post_id: 1
        };
        const html = renderDashboardHtml({
            ...BASE_DATA,
            pendingComments: [overdueComment],
            pendingCommentsTotal: 1,
            overdueCommentCount: 1
        });
        assert.ok(!html.includes('bg-red-50'), 'Must NOT use bg-red-50 fill for overdue items per D-04');
    });

    it('applies border-l-red-500 to overdue prospect', () => {
        const overdueProspect = {
            id: 1,
            prospect_name: 'Sophie',
            full_name: null,
            stage: 'msg1_sent',
            date_first_contact: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), // 72h ago
            notes: null,
            isOverdue: true,
            hoursSince: 72
        };
        const html = renderDashboardHtml({
            ...BASE_DATA,
            activeProspects: [overdueProspect],
            activeProspectsTotal: 1,
            overdueProspectCount: 1
        });
        assert.ok(html.includes('border-l-red-500'), 'Missing border-l-red-500 for overdue prospect');
        assert.ok(html.includes('En retard'), 'Missing "En retard" label for overdue prospect');
    });
});

// ========================================
// Cap at 5 items
// ========================================

describe('Inbox sections cap display at 5 items', () => {
    it('renders at most 5 posts (data pre-capped by route LIMIT 5)', () => {
        const posts = Array.from({ length: 5 }, (_, i) => ({
            id: i + 1,
            hook: `Post ${i + 1}`,
            status: 'scheduled',
            platform: 'facebook',
            type: 'post',
            published_date: new Date().toISOString()
        }));
        const html = renderDashboardHtml({
            ...BASE_DATA,
            todayPosts: posts,
            todayPostsTotal: 7 // more exist, but only 5 shown
        });
        // Count rendered post hooks
        const hookMatches = (html.match(/Post \d/g) || []);
        assert.ok(hookMatches.length <= 5, `Expected ≤5 posts rendered, got ${hookMatches.length}`);
    });
});

// ========================================
// dm-config module
// ========================================

describe('getDmSequenceRules', () => {
    it('returns rules with correct keys and fallback values', () => {
        const { getDmSequenceRules } = require('../../lib/dm-config');
        const rules = getDmSequenceRules();
        assert.ok(rules.new, 'Missing "new" rule');
        assert.ok(rules.msg1_sent, 'Missing "msg1_sent" rule');
        assert.ok(rules.msg2_sent, 'Missing "msg2_sent" rule');
        assert.ok(rules.msg3_sent, 'Missing "msg3_sent" rule');
        assert.equal(typeof rules.msg1_sent.follow_up_after_hours, 'number');
    });
});
