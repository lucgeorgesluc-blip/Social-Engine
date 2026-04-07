// DM sequence timing rules — loaded from .social-engine/config.yaml with hardcoded fallbacks
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

const DEFAULT_RULES = {
    new: { follow_up_after_hours: 0 },
    msg1_sent: { follow_up_after_hours: 48 },
    msg2_sent: { follow_up_after_hours: 168 },
    msg3_sent: { follow_up_after_hours: 336 }
};

let _rules = null;

function getDmSequenceRules() {
    if (_rules) return _rules;
    try {
        const configPath = path.resolve(__dirname, '../../.social-engine/config.yaml');
        const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
        const seq = config.dm_sequence;
        if (seq) {
            _rules = {
                new: { follow_up_after_hours: parseDelay(seq.message_1_delay) || 0 },
                msg1_sent: { follow_up_after_hours: parseDelay(seq.message_2_delay) || 48 },
                msg2_sent: { follow_up_after_hours: parseDelay(seq.message_3_delay) || 168 },
                msg3_sent: { follow_up_after_hours: 336 }
            };
        } else {
            _rules = DEFAULT_RULES;
        }
    } catch (e) {
        console.error('[dm-config] Could not load config.yaml:', e.message);
        _rules = DEFAULT_RULES;
    }
    return _rules;
}

function parseDelay(str) {
    if (!str) return null;
    const match = String(str).match(/^(\d+)h$/);
    return match ? parseInt(match[1], 10) : null;
}

module.exports = { getDmSequenceRules };
