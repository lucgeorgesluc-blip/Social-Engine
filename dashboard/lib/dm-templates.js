const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

let _templates = null;

function getDmTemplates() {
    if (_templates) return _templates;
    try {
        const config = yaml.load(
            fs.readFileSync(path.resolve(__dirname, '../../.social-engine/config.yaml'), 'utf8')
        );
        const seq = config.dm_sequence || config.dm_templates || {};
        if (seq.templates || seq.messages) {
            _templates = seq.templates || seq.messages;
        }
    } catch (e) {
        console.error('[dm-templates] Could not load config.yaml:', e.message);
    }

    if (!_templates) {
        _templates = {
            msg1_sent: { label: 'Message 1 — Premier contact', text: 'Bonjour [Prenom], merci pour votre commentaire ! Souhaitez-vous en savoir plus ?' },
            msg2_sent: { label: 'Message 2 — Relance', text: 'Bonjour [Prenom], je me permets de revenir vers vous. Disponible pour un appel de 10 min ?' },
            msg3_sent: { label: 'Message 3 — Dernière relance', text: 'Bonjour [Prenom], si vous changez d\'avis, voici mon Calendly : [lien]' }
        };
    }
    return _templates;
}

module.exports = { getDmTemplates };
