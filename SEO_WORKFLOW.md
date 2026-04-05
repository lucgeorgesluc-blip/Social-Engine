# SEO Workflow — magnetiseuse-lacoste-corinne.fr
**Objectif:** Apparaître en 1ère position sur Google pour "magnétiseuse Troyes", "hypnose arrêt tabac Troyes" et les mots-clés symptômes sevrage → générer des RDV.

**Score actuel: 47/100 → Cible: 72/100 en 90 jours**

---

## RÈGLE D'OR
> Corriger les problèmes techniques D'ABORD.
> Publier du contenu sur un site mal indexé = travailler pour rien.

---

## PHASE 1 — CORRECTIONS URGENTES (cette semaine, ~1h)
> Le site est partiellement invisible pour Google. Ces 4 corrections débloquent tout.

### Étape 1 · robots.txt (5 min)
**Fichier:** `E:/Site CL/robots.txt`

Remplacer le contenu entier par :
```
# robots.txt — magnetiseuse-lacoste-corinne.fr

User-agent: *
Allow: /
Disallow: /backup/
Disallow: /logs/
Disallow: /test-config.html

Allow: /assets/
Allow: /api/

# AI search crawlers
User-agent: GPTBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: https://www.magnetiseuse-lacoste-corinne.fr/sitemap.xml
```

---

### Étape 2 · config.js — corriger le domaine (5 min)
**Fichier:** `E:/Site CL/assets/js/config.js`

Chercher `corinnelacoste.fr` et remplacer par `magnetiseuse-lacoste-corinne.fr` partout.

Puis régénérer :
```bash
npx terser assets/js/config.js -o assets/js/config.min.js -c -m
```

---

### Étape 3 · Corriger le numéro de téléphone (2 min)
**Fichier:** `E:/Site CL/a-propos.html`

Dans le bloc JSON-LD (Person schema), chercher `"telephone"` et vérifier lequel est correct :
- a-propos.html a : `+33695466060`
- config.js a : `+33695486060`

Appeler les deux pour savoir lequel répond. Corriger le mauvais.

---

### Étape 4 · Corriger les placeholders votresite.com (2 min)
**Fichier:** `E:/Site CL/a-propos.html`

Chercher `votresite.com` et remplacer par `www.magnetiseuse-lacoste-corinne.fr`.

---

### Étape 5 · Ajouter la balise canonical sur la page d'accueil (3 min)
**Fichier:** `E:/Site CL/index.html`

Dans le `<head>`, après les meta existantes, ajouter :
```html
<link rel="canonical" href="https://www.magnetiseuse-lacoste-corinne.fr/">
```

Et supprimer la seconde balise `<meta name="viewport">` (elle apparaît en double).

---

### Étape 6 · Corriger l'image hero (2 min)
**Fichier:** `E:/Site CL/index.html` (lignes ~279-281)

Changer :
```html
loading="lazy" fetchpriority="low"
```
En :
```html
loading="eager" fetchpriority="high"
```

---

### Étape 7 · Déployer sur le serveur
Uploader via SFTP (WinSCP ou FileZilla) :
- Host: `home755449657.1and1-data.host` — Port 22
- User: `u95030755`
- Fichiers à uploader: `robots.txt`, `assets/js/config.js`, `assets/js/config.min.js`, `a-propos.html`, `index.html`

---

## PHASE 2 — SCHEMA ET ÉTOILES GOOGLE (semaine 2, ~1h)
> Ajouter les étoiles Google (4.9★) dans les résultats de recherche → augmente le taux de clics.

### Action 1 · Schema statique sur la page d'accueil
Dans `index.html`, ajouter ce bloc dans le `<head>` (voir ACTION-PLAN.md Fix 6 pour le JSON-LD complet).

Points clés à personnaliser :
- `"telephone"` → mettre le bon numéro (corrigé en Phase 1)
- `"aggregateRating"` → `"ratingValue": "4.9"`, `"reviewCount": "35"`
- `"@type"` → utiliser `"HealthAndBeautyBusiness"` (pas `"LocalBusiness"`)

### Action 2 · Corriger le type schema sur les pages services
Dans `magnetiseur-troyes.html` et `hypnose-troyes.html` :
- Remplacer `"@type": "MedicalBusiness"` par `"@type": "HealthAndBeautyBusiness"`
- Corriger `"ratingValue": "5.0"` → `"4.9"`

### Action 3 · Lien direct pour les avis Google
Ajouter sur la page d'accueil et la page soins un bouton :
```html
<a href="https://g.page/r/Cey6GOblJRfHEAE/review"
   target="_blank" rel="noopener">
  ⭐ Laisser un avis Google
</a>
```

---

## PHASE 3 — NOUVEAUX ARTICLES BLOG (en cours, 1 article/semaine)
> Les 9 articles de LISTE_9_ARTICLES_blog.md sont déjà écrits. Voici le workflow pour les suivants.

### Commande à donner à Claude Code pour un nouvel article :

```
Crée l'article de blog [TITRE]. Fichier : blog/[slug].html.
Applique intégralement INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md :
- Bloc "Articles qui pourraient vous intéresser" avec data-blog-list="related" et data-blog-current="[slug]"
- Ajouter en première position de SITE_CONFIG.blog dans config.js
- Régénérer config.min.js
- Ajouter l'URL dans sitemap.xml
- Prendre la dernière image de articles-to-do/ → assets/images/blog/[slug].webp
- Utiliser data-price="tabac" pour les prix, pas de montant en dur
- Schema FAQPage avec "name"
- Pas de mention rTMS
```

### Checklist publication après chaque article :
- [ ] Fichier `blog/[slug].html` créé
- [ ] Entrée ajoutée en tête de `SITE_CONFIG.blog` dans `config.js`
- [ ] `config.min.js` régénéré
- [ ] URL ajoutée dans `sitemap.xml`
- [ ] Fichiers uploadés sur SFTP
- [ ] URL inspectée dans Google Search Console (outil "Inspection d'URL")

---

## PHASE 4 — AVIS GOOGLE (objectif: 50+ avis en 3 mois)
> 35 avis aujourd'hui → objectif 50+. Les avis améliorent le classement local.

**Méthode :** Après chaque séance réussie, envoyer un SMS ou message :
> "Bonjour [Prénom], je suis ravie que notre séance vous ait aidé. Si vous souhaitez partager votre expérience, voici le lien pour laisser un avis Google (ça m'aide beaucoup) : [lien court]"

**Lien avis Google :** https://g.page/r/Cey6GOblJRfHEAE/review

---

## PHASE 5 — CITATIONS LOCALES (dans le mois)
> Se faire lister sur les annuaires français = signaux de confiance pour Google.

Par ordre de priorité :
1. **Pages Jaunes** (pagesjaunes.fr) — chercher le cabinet, revendiquer la fiche
2. **Annuaire-magnetiseurs.fr** — créer une fiche praticienne
3. **GNOMA** — si membre (formateur Pascal Bescos est GNOMA)
4. **Therapeutes.com** — fiche praticienne
5. **Bing Places** — synchroniser avec Google Business Profile

NAP à utiliser partout (identique) :
- Nom : `Corinne Lacoste — Magnétiseuse & Hypnothérapeute`
- Adresse : `7 rue du Printemps, 10120 Saint-Germain`
- Téléphone : `06 95 48 60 60` (à confirmer en Phase 1)

---

## TABLEAU DE BORD — Progression SEO

| Semaine | Action | Impact |
|---------|--------|--------|
| 1 | Fixes critiques robots.txt + config.js + canonical | +8 pts score |
| 2 | Schema HealthAndBeautyBusiness + AggregateRating | +6 pts |
| 3-6 | Articles blog hebdomadaires | +3 pts/article |
| 4 | Citations Pages Jaunes + annuaire-magnetiseurs | +4 pts |
| 8 | 50+ avis Google | +3 pts |
| 12 | Score estimé | ~72/100 |

---

## COMMENT UTILISER CLAUDE CODE COMME MENTOR SEO

### Pour créer un article :
```
Crée l'article blog [titre]. Fichier blog/[slug].html.
Suis INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md.
```

### Pour corriger une page existante :
```
Optimise [nom-page].html selon OPTIMISATIONS_pages-existantes.md
et les recommandations de l'FULL-AUDIT-REPORT.md.
```

### Pour vérifier l'état du site :
```
Vérifie que les 7 corrections de Phase 1 du SEO_WORKFLOW.md ont été appliquées.
Donne-moi un statut pour chacune.
```

### Pour déployer :
```
Déploie les fichiers modifiés via SFTP sur home755449657.1and1-data.host
(demande-moi le mot de passe avant de commencer).
```

### Pour le prochain article de blog :
```
Quel est le prochain article à écrire selon LISTE_9_ARTICLES_blog.md ?
Écris-le en suivant INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md.
```

---

## FICHIERS DE RÉFÉRENCE

| Fichier | Utilité |
|---------|---------|
| `FULL-AUDIT-REPORT.md` | Rapport complet de l'audit SEO |
| `ACTION-PLAN.md` | Toutes les corrections avec code prêt à copier |
| `SEO_WORKFLOW.md` | Ce fichier — workflow simplifié |
| `INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md` | Checklist création article |
| `LISTE_9_ARTICLES_blog.md` | Planning éditorial 9 articles |
| `OPTIMISATIONS_pages-existantes.md` | Améliorations pages actuelles |
| `assets/js/config.js` | Source de vérité prix/contact/schema |

---

*Généré le 26 mars 2026 — audit 8 sous-agents SEO*
