// Facebook token service — CRUD, health check, OAuth exchange
// All DB operations use require('./db').query
const { query } = require('./db');

/**
 * Returns the most recent page access token row or null.
 */
async function getPageToken() {
    const result = await query(
        "SELECT * FROM fb_tokens WHERE token_type = 'page_access' ORDER BY created_at DESC LIMIT 1"
    );
    return result.rows[0] || null;
}

/**
 * Deletes all existing page access tokens and inserts a new one.
 * @param {{ access_token: string, page_id: string, expires_at?: Date|string, scopes?: string }} param
 * @returns {object} The inserted row
 */
async function storePageToken({ access_token, page_id, expires_at, scopes }) {
    await query("DELETE FROM fb_tokens WHERE token_type = 'page_access'");
    const result = await query(
        `INSERT INTO fb_tokens (token_type, access_token, page_id, expires_at, scopes)
         VALUES ('page_access', $1, $2, $3, $4)
         RETURNING *`,
        [access_token, page_id, expires_at || null, scopes || null]
    );
    return result.rows[0];
}

/**
 * Pure function — computes token health from debug_token API response.
 * @param {object|null} debugResponse - The .data field from Meta debug_token response
 * @returns {{ status: string, color: string, message: string, daysLeft?: number }}
 */
function checkTokenHealth(debugResponse) {
    if (!debugResponse) {
        return {
            status: 'missing',
            color: 'red',
            message: 'Aucun token Facebook — Connecter'
        };
    }
    if (!debugResponse.is_valid) {
        return {
            status: 'expired',
            color: 'red',
            message: 'Token Facebook expiré — Reconnecter'
        };
    }
    if (debugResponse.expires_at) {
        const expiresMs = typeof debugResponse.expires_at === 'number'
            ? debugResponse.expires_at * 1000  // Unix timestamp from Meta
            : new Date(debugResponse.expires_at).getTime();
        const daysLeft = Math.ceil((expiresMs - Date.now()) / 86400000);
        if (daysLeft <= 7) {
            return {
                status: 'expiring',
                color: 'amber',
                message: `Token expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''} — Renouveler`,
                daysLeft
            };
        }
    }
    return {
        status: 'valid',
        color: 'green',
        message: 'Token Facebook valide'
    };
}

/**
 * Calls Meta debug_token endpoint to validate a token.
 * @param {string} accessToken
 * @returns {object|null} The .data field from the response
 */
async function debugToken(accessToken) {
    try {
        const appToken = `${process.env.FB_APP_ID}|${process.env.FB_APP_SECRET}`;
        const url = `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appToken)}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.error) {
            console.error('[fb-token] debugToken error:', json.error.message);
            return null;
        }
        return json.data || null;
    } catch (err) {
        console.error('[fb-token] debugToken failed:', err.message);
        return null;
    }
}

/**
 * Exchanges an OAuth code for a long-lived Page Access Token.
 * Three-step flow: code → short-lived → long-lived → page token.
 * @param {string} code - OAuth code from callback
 * @param {string} redirectUri - Must match the URI used in /auth
 * @returns {{ access_token: string, page_id: string, expires_at: Date }}
 */
async function exchangeCodeForToken(code, redirectUri) {
    const appId = process.env.FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;
    const pageId = process.env.FB_PAGE_ID;

    // Step 1: Exchange code for short-lived user token
    const shortUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;
    const shortRes = await fetch(shortUrl);
    const shortJson = await shortRes.json();
    if (shortJson.error) throw new Error(`OAuth exchange failed: ${shortJson.error.message}`);
    const shortToken = shortJson.access_token;

    // Step 2: Exchange short-lived for long-lived user token
    const longUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`;
    const longRes = await fetch(longUrl);
    const longJson = await longRes.json();
    if (longJson.error) throw new Error(`Long-lived token exchange failed: ${longJson.error.message}`);
    const longToken = longJson.access_token;
    const expiresAt = longJson.expires_in
        ? new Date(Date.now() + longJson.expires_in * 1000)
        : null;

    // Step 3: Get Page Access Token from long-lived user token
    const pageUrl = `https://graph.facebook.com/v21.0/${pageId}?fields=access_token&access_token=${longToken}`;
    const pageRes = await fetch(pageUrl);
    const pageJson = await pageRes.json();
    if (pageJson.error) throw new Error(`Page token fetch failed: ${pageJson.error.message}`);

    return {
        access_token: pageJson.access_token || longToken,
        page_id: pageId,
        expires_at: expiresAt
    };
}

module.exports = {
    getPageToken,
    storePageToken,
    checkTokenHealth,
    debugToken,
    exchangeCodeForToken
};
