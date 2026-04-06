// Idempotent YAML seed — imports .social-engine/data/*.yaml into PostgreSQL
// Safe to run on every boot: uses ON CONFLICT DO NOTHING
// Returns { posts, drafts, comments, prospects, metrics } counts of inserted rows
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const { query } = require('./db');

const DATA_DIR = path.resolve(__dirname, '../../.social-engine/data');

function loadYaml(filename) {
    const filepath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filepath)) {
        console.warn(`[seed] Warning: file not found, skipping: ${filepath}`);
        return null;
    }
    return yaml.load(fs.readFileSync(filepath, 'utf8'));
}

// Seed published posts from posts.yaml (top-level key: posts)
async function seedPosts() {
    const data = loadYaml('posts.yaml');
    if (!data || !Array.isArray(data.posts)) return 0;

    let inserted = 0;
    for (const p of data.posts) {
        const result = await query(
            `INSERT INTO posts
               (id, status, platform, type, hook, cta_type, objection_addressed,
                created_date, published_date, tags, metrics, is_draft)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             ON CONFLICT (id) DO NOTHING
             RETURNING id`,
            [
                p.id,
                p.status || 'draft',
                p.platform || 'facebook',
                p.type || null,
                p.hook || null,
                p.cta_type || null,
                p.objection_addressed || null,
                p.created_date || null,
                p.published_date || null,
                JSON.stringify(p.tags || []),
                JSON.stringify(p.metrics || {}),
                false
            ]
        );
        inserted += result.rows.length;
    }
    return inserted;
}

// Seed draft posts from posts-drafts.yaml (root-level array, no wrapper key)
async function seedDrafts() {
    const data = loadYaml('posts-drafts.yaml');
    if (!data) return 0;

    // posts-drafts.yaml is a root array (no top-level key)
    const drafts = Array.isArray(data) ? data : (data.posts || []);
    let inserted = 0;
    for (const p of drafts) {
        const result = await query(
            `INSERT INTO posts
               (id, status, platform, type, hook, cta_type, objection_addressed,
                created_date, published_date, tags, metrics, is_draft, content)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
             ON CONFLICT (id) DO NOTHING
             RETURNING id`,
            [
                p.id,
                p.status || 'draft',
                p.platform || 'facebook',
                p.type || null,
                p.hook || null,
                p.cta_type || null,
                p.objection_addressed || null,
                p.date || p.created_date || null,
                p.published_date || null,
                JSON.stringify(p.tags || []),
                JSON.stringify(p.metrics || {}),
                true,
                p.content || null
            ]
        );
        inserted += result.rows.length;
    }
    return inserted;
}

// Seed comments from comments.yaml (top-level key: comments)
async function seedComments() {
    const data = loadYaml('comments.yaml');
    if (!data || !Array.isArray(data.comments)) return 0;

    let inserted = 0;
    for (const c of data.comments) {
        const result = await query(
            `INSERT INTO comments
               (id, post_id, date, platform, author_name, full_name, classification,
                objection_type, comment_text, response_text, response_status,
                converted_to_dm, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
             ON CONFLICT (id) DO NOTHING
             RETURNING id`,
            [
                c.id,
                c.post_id || null,
                c.date || null,
                c.platform || null,
                c.author_name || null,
                c.full_name || null,
                c.classification || null,
                c.objection_type || null,
                c.comment_text || null,
                c.response_text || null,
                c.response_status || 'pending',
                c.converted_to_dm || false,
                c.notes || null
            ]
        );
        inserted += result.rows.length;
    }
    return inserted;
}

// Seed prospects from dm-pipeline.yaml (top-level key: prospects)
async function seedProspects() {
    const data = loadYaml('dm-pipeline.yaml');
    if (!data || !Array.isArray(data.prospects)) return 0;

    let inserted = 0;
    for (const p of data.prospects) {
        const result = await query(
            `INSERT INTO prospects
               (id, source_comment_id, source_post_id, platform, prospect_name,
                full_name, date_first_contact, stage, messages, calendly_date,
                conversion_date, lost_reason, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
             ON CONFLICT (id) DO NOTHING
             RETURNING id`,
            [
                p.id,
                p.source_comment_id || null,
                p.source_post_id || null,
                p.platform || null,
                p.prospect_name || null,
                p.full_name || null,
                p.date_first_contact || null,
                p.stage || 'new',
                JSON.stringify(p.messages || []),
                p.calendly_date || null,
                p.conversion_date || null,
                p.lost_reason || null,
                p.notes || null
            ]
        );
        inserted += result.rows.length;
    }
    return inserted;
}

// Seed weekly metrics from metrics-weekly.yaml (top-level key: weeks)
async function seedMetrics() {
    const data = loadYaml('metrics-weekly.yaml');
    if (!data || !Array.isArray(data.weeks) || data.weeks.length === 0) return 0;

    let inserted = 0;
    for (const m of data.weeks) {
        const result = await query(
            `INSERT INTO metrics_weekly
               (week, dates, posts_published, total_reach, total_impressions,
                total_likes, total_comments, total_shares, info_comments,
                dm_opened, calendly_booked, patients_converted, engagement_rate,
                best_post_id, worst_post_id, top_objection, learnings)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
             ON CONFLICT (week) DO NOTHING
             RETURNING week`,
            [
                m.week,
                m.dates || null,
                m.posts_published || 0,
                m.total_reach || 0,
                m.total_impressions || 0,
                m.total_likes || 0,
                m.total_comments || 0,
                m.total_shares || 0,
                m.info_comments || 0,
                m.dm_opened || 0,
                m.calendly_booked || 0,
                m.patients_converted || 0,
                m.engagement_rate || 0,
                m.best_post_id || null,
                m.worst_post_id || null,
                m.top_objection || null,
                m.learnings || null
            ]
        );
        inserted += result.rows.length;
    }
    return inserted;
}

// Main seed function — run in order (posts before comments/prospects due to FK)
async function runSeed() {
    const counts = { posts: 0, drafts: 0, comments: 0, prospects: 0, metrics: 0 };

    try {
        counts.posts = await seedPosts();
    } catch (err) {
        console.error('[seed] Error seeding posts:', err.message);
    }

    try {
        counts.drafts = await seedDrafts();
    } catch (err) {
        console.error('[seed] Error seeding drafts:', err.message);
    }

    try {
        counts.comments = await seedComments();
    } catch (err) {
        console.error('[seed] Error seeding comments:', err.message);
    }

    try {
        counts.prospects = await seedProspects();
    } catch (err) {
        console.error('[seed] Error seeding prospects:', err.message);
    }

    try {
        counts.metrics = await seedMetrics();
    } catch (err) {
        console.error('[seed] Error seeding metrics:', err.message);
    }

    return counts;
}

module.exports = { runSeed, seedPosts, seedDrafts, seedComments, seedProspects, seedMetrics };
