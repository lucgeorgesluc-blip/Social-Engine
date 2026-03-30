# Changelog — SEO Content Engine

## 2026-03-28 — Audit blog/ : 8 articles manquants enregistrés
**Action:** Comparaison blog/ (51 fichiers) vs content-map.yaml (43 slugs) → 8 articles absents du moteur
**Articles ajoutés à content-map.yaml + topic-clusters.yaml :**
- `auriculotherapie-arret-tabac` → tc_comparatifs_tabac
- `champix-zyban-arret-tabac-effets-secondaires` → tc_comparatifs_tabac
- `combien-seances-hypnose-arreter-fumer` → tc_arret_tabac
- `gommes-nicorette-arret-tabac-efficacite` → tc_comparatifs_tabac
- `hypnose-en-ligne-arret-tabac-youtube` → tc_comparatifs_tabac
- `livres-hypnose-arret-tabac-classement` → tc_comparatifs_tabac
- `prix-seance-hypnose-arret-tabac` → tc_arret_tabac
- `spray-nicotine-arret-tabac-avis` → tc_comparatifs_tabac
**Note:** word_count = 0 pour ces 8 articles (à vérifier). Tous publiés le 2026-03-26.
**Triggered by:** user audit blog/

## 2026-03-28 — Correction moteur q_001/q_002 + tc_magnetiseur_aube
**Action:** Correction des pillar pages mal identifiées dans le moteur
- q_001 → status: done (pillar = magnetiseur-troyes.html, service page)
- q_002 → status: done (pillar = magnetiseur-aube.html, service page)
- tc_magnetiseur_aube pillar → slug: magnetiseur-aube, service_page: magnetiseur-aube.html, status: published
**Triggered by:** user correction

## 2026-03-28 — MAJ moteur + article comparatif local Troyes
**Action:** Collecte SERP via Chrome DevTools + création article + MAJ engine
**SERP findings:**
- "magnétiseur Troyes": Corinne ~6e. Top concurrents: magnetiseur-troyes.fr (368 mots, pas d'arrêt tabac), annuaires (ResaLib, PagesJaunes, therapeutes.com)
- "hypnose arrêt tabac Troyes": Corinne apparaît 2x (homepage + hypnose-troyes.html). Concurrent principal: Françoise TELLIER (2 séances ATH, Essoyes)
**Files:**
- `blog/arreter-fumer-troyes-methodes-locales-comparatif.html` (créé — comparatif 5 méthodes locales)
- `assets/js/config.js` + `config.min.js` (article ajouté en tête)
- `sitemap.xml` (URL ajoutée)
- `.seo-engine/data/content-map.yaml` (article enregistré)
- `.seo-engine/data/topic-clusters.yaml` (pillar tc_magnetiseur_troyes = magnetiseur-troyes.html confirmé published)
- `.seo-engine/data/competitors.yaml` (3 nouveaux: Françoise TELLIER, Alexis DI LEGAMI, Denise Prugnot)
**Triggered by:** user — focus arrêt tabac cluster magnétiseur Troyes

## 2026-03-26 — Initialisation du moteur SEO
**Action:** Setup initial complet du SEO Content Engine
**Files:**
- `.seo-engine/config.yaml` (créé)
- `.seo-engine/data/features.yaml` (créé — 17 features, 5 catégories)
- `.seo-engine/data/competitors.yaml` (créé — 3 concurrents directs + 6 concurrents indirects)
- `.seo-engine/data/seo-keywords.csv` (créé — 24 mots-clés seed)
- `.seo-engine/data/content-map.yaml` (créé — 42 articles enregistrés)
- `.seo-engine/data/topic-clusters.yaml` (créé — 5 clusters, 4 pillar pages planifiées)
- `.seo-engine/data/content-queue.yaml` (créé — 9 idées d'articles)
- `.seo-engine/templates/blog-frontmatter.yaml` (créé)
- `.seo-engine/templates/blog-structures.yaml` (créé)
- `.seo-engine/templates/comparison-template.md` (créé)
- `.seo-engine/templates/tone-guide.md` (créé)
- `.seo-engine/USAGE-GUIDE.md` (créé)
- `CLAUDE.md` (mis à jour — section SEO Content Engine ajoutée)
**Summary:** Moteur SEO initialisé depuis scan de 42 articles blog, 6 pages service, config.js. 5 clusters topic identifiés. 4 pillar pages en attente de données SERP.
**Triggered by:** user
