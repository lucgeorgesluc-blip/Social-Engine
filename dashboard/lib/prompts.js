// Prompt templates for AI post generation — Phase 4
// No rTMS / TMS / stimulation magnétique transcrânienne mentions allowed

const POST_TYPES = [
    { id: 'objection-buster', label: 'Contre-objection', needsContext: true,  contextLabel: 'Quelle objection ?' },
    { id: 'temoignage',       label: 'Témoignage',        needsContext: false, contextLabel: '' },
    { id: 'myth-buster',      label: 'Destructeur de mythes', needsContext: true, contextLabel: 'Quel mythe ?' },
    { id: 'timeline',         label: 'Chronologie sevrage', needsContext: false, contextLabel: '' },
    { id: 'tip',              label: 'Conseil pratique',  needsContext: false, contextLabel: '' },
    { id: 'motivation',       label: 'Motivation',        needsContext: false, contextLabel: '' }
];

const SYSTEM_PROMPT = `Tu es une rédactrice de contenu pour Corinne Lacoste, magnétiseuse et hypnothérapeute à Troyes (Aube). Tu écris des posts Facebook pour attirer des personnes qui veulent arrêter de fumer. Ton ton est chaleureux, professionnel, non-médical. Les posts font entre 150 et 300 mots. Termine par un appel à l'action doux invitant à prendre rendez-vous.`;

const PROMPT_TEMPLATES = {
    'objection-buster': {
        system: SYSTEM_PROMPT,
        user: `Écris un post Facebook qui répond à cette objection courante sur l'arrêt du tabac par magnétisme/hypnose : "{{context}}". Montre de l'empathie, donne des faits rassurants, et termine par une invitation à essayer.`
    },
    'temoignage': {
        system: SYSTEM_PROMPT,
        user: `Écris un post Facebook sous forme de témoignage anonymisé d'une personne qui a arrêté de fumer grâce au magnétisme et à l'hypnose. Décris le parcours avant/après de manière authentique et touchante.`
    },
    'myth-buster': {
        system: SYSTEM_PROMPT,
        user: `Écris un post Facebook qui démonte ce mythe courant : "{{context}}". Utilise des faits, de l'humour bienveillant, et termine positivement.`
    },
    'timeline': {
        system: SYSTEM_PROMPT,
        user: `Écris un post Facebook qui décrit la chronologie jour par jour des bienfaits de l'arrêt du tabac (24h, 48h, 72h, 1 semaine, 1 mois). Mentionne que le magnétisme et l'hypnose facilitent ce parcours.`
    },
    'tip': {
        system: SYSTEM_PROMPT,
        user: `Écris un post Facebook avec un conseil pratique pour gérer les envies de fumer au quotidien. Sois concret et encourageant. Mentionne que les séances de magnétisme/hypnose aident à réduire ces envies.`
    },
    'motivation': {
        system: SYSTEM_PROMPT,
        user: `Écris un post Facebook motivant pour quelqu'un qui hésite à arrêter de fumer. Évoque les bénéfices concrets (santé, économie, liberté) et propose le magnétisme/hypnose comme accompagnement bienveillant.`
    }
};

/**
 * Build a prompt for the given post type and optional context string.
 * Sanitizes context to strip prompt injection attempts.
 * @param {string} type - Post type id from POST_TYPES
 * @param {string} [context=''] - User-provided context for needsContext types
 * @returns {{ system: string, user: string }}
 */
function buildPrompt(type, context) {
    const template = PROMPT_TEMPLATES[type];
    if (!template) throw new Error('Type de post inconnu: ' + type);

    // Sanitize: strip lines that look like prompt injection
    const safeContext = (context || '')
        .split('\n')
        .filter(line => !/^(system|assistant|human|user)\s*:/i.test(line.trim()))
        .join('\n')
        .trim();

    return {
        system: template.system,
        user: template.user.replace('{{context}}', safeContext)
    };
}

module.exports = { POST_TYPES, PROMPT_TEMPLATES, buildPrompt };
