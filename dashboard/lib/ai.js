// Claude API wrapper — Phase 4: AI post generation with cost guardrails
const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');
const { query } = require('./db');
const { buildPrompt } = require('./prompts');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function currentMonthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Returns current monthly usage stats.
 * @returns {Promise<{ count: number, limit: number, warning: number }>}
 */
async function getMonthlyUsage() {
    try {
        const { rows } = await query(
            'SELECT COUNT(*)::int AS count FROM ai_generations WHERE month_key = $1',
            [currentMonthKey()]
        );
        return { count: rows[0].count, limit: 100, warning: 50 };
    } catch {
        return { count: 0, limit: 100, warning: 50 };
    }
}

/**
 * Generate a Facebook post using Claude Haiku.
 * Throws 'LIMIT_REACHED' if monthly limit >= 100.
 * @param {string} type - Post type id
 * @param {string} [context=''] - Optional context for needsContext types
 * @returns {Promise<{ text: string, usage: object }>}
 */
async function generatePost(type, context) {
    const currentUsage = await getMonthlyUsage();
    if (currentUsage.count >= 100) {
        throw new Error('LIMIT_REACHED');
    }

    const { system, user } = buildPrompt(type, context);

    const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system,
        messages: [{ role: 'user', content: user }]
    });

    const text = message.content[0].text;
    const tokensUsed = message.usage ? message.usage.output_tokens : 0;

    try {
        await query(
            'INSERT INTO ai_generations (month_key, post_type, tokens_used, generated_text, created_at) VALUES ($1, $2, $3, $4, NOW())',
            [currentMonthKey(), type, tokensUsed, text]
        );
    } catch (err) {
        console.error('[ai] Failed to log generation (non-fatal):', err.message);
    }

    const updatedUsage = await getMonthlyUsage();
    return { text, usage: { ...updatedUsage, isWarning: updatedUsage.count >= 50 } };
}

/**
 * Returns objection types from comments with frequency >= 3 in last 90 days.
 * @returns {Promise<Array<{ objection_type: string, frequency: number }>>}
 */
async function getFrequentObjections() {
    try {
        const { rows } = await query(
            `SELECT objection_type, COUNT(*)::int AS frequency
             FROM comments
             WHERE objection_type IS NOT NULL
               AND objection_type != ''
               AND created_at > NOW() - INTERVAL '90 days'
             GROUP BY objection_type
             HAVING COUNT(*) >= 3
             ORDER BY frequency DESC`
        );
        return rows;
    } catch {
        return [];
    }
}

module.exports = { generatePost, getMonthlyUsage, getFrequentObjections };
