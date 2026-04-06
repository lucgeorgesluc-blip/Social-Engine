# Changelog — SEO Content Engine

## 2026-04-05 — Pillar tc_comparatifs_tabac + maillage bidirectionnel
**Action:** Création du pillar article `methodes-arreter-fumer-comparatif-complet.html` pour le cluster tc_comparatifs_tabac (16 articles orphelins). Ajout de backlinks dans les 16 cluster articles pointant vers le pillar.
**Modifications :**
- blog/methodes-arreter-fumer-comparatif-complet.html : CRÉÉ (pillar, ~2800 mots, 9 méthodes comparées, FAQPage schema)
- 16 cluster articles : backlink ajouté vers le pillar (section bg-accent/10 avant "Articles qui pourraient vous intéresser")
- config.js + config.min.js : entrée blog ajoutée en tête
- sitemap.xml : URL ajoutée (priority 0.8)
- topic-clusters.yaml : pillar status planned → published
- content-map.yaml : entrée pillar ajoutée avec liens bidirectionnels
- assets/images/blog/methodes-arreter-fumer-comparatif-complet.webp : image ajoutée
**Fix visuel :** pt-24 → pt-32 (titre derrière nav), ajout pb-4 mb-12 sur blocs méthodes (espacement entre sections)
**Déploiement :** 17 fichiers uploadés via SFTP (pillar + 16 clusters + image)

## 2026-04-05 — Pillar tc_arret_tabac optimisé (Option A)
**Action:** Optimisation de `hypnose-pour-arret-du-tabac-guide-complet.html` comme pillar pour "hypnose pour arrêter de fumer" (2900/mois). Maillage bidirectionnel avec 5 cluster articles.
**Modifications :**
- Title/H1/meta/OG/schema : "Arrêt du Tabac" → "Arrêter de Fumer" (match SERP intent)
- Canonical tag ajouté
- 10 liens internes ajoutés vers cluster articles dans le corps
- 5 cluster articles : backlink ajouté vers le guide

## 2026-03-30 — DataForSEO SERP data — q_006 à q_009
**Action:** Requêtes Google Ads search volume via DataForSEO API pour tous les mots-clés des items q_006–q_009
**Résultats clés :**
- `barreur de feu` = **1600/mois** (LOW competition, CPC 0.97€) — seul mot-clé à fort volume
- `magnétisme eczéma` = 10/mois (LOW), `zona magnétisme` = 10/mois (LOW)
- Tous les autres mots-clés < 10/mois France
**Modifications :**
- content-queue.yaml : `serp_analyzed: true` + bloc `serp_data` pour q_006, q_007, q_008, q_009
- q_009 : priorité upgradée `low → medium`, title recentré sur "Barreur de Feu", target_keywords mis à jour

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
- 2026-03-30 — Pipeline: drafted "prise-de-poids-apres-arret-tabac-eviter-de-grossir-guide" (Prise de Poids Après Arrêt Tabac : Éviter de Grossir [Guide])
- 2026-03-30 — Pipeline: drafted "barreur-feu-troyes-chimio-magnetisme" (Barreur de Feu à Troyes : Récupération après Chimio avec le Magnétisme)
- 2026-03-30 — Pipeline: drafted "magnetisme-enfants-troyes-guide-parents" (Magnétisme pour les Enfants à Troyes : Que Soigner ? [Guide Parents])
- 2026-03-30 — Pipeline: drafted "allergies-eczema-magnetisme-troyes" (Allergies et Eczéma : Le Magnétisme Peut-il Aider ? [Troyes])
- 2026-04-03 — Pipeline: drafted "prise-de-poids-apres-arret-tabac-eviter-de-grossir-guide" (Prise de Poids Après Arrêt Tabac : Éviter de Grossir [Guide])
- 2026-04-04 — Pipeline: drafted "arret-tabac-sans-substituts-ni-medicaments-guide-2026" (Arrêt Tabac Sans Substituts Ni Médicaments [Guide 2026])
- 2026-04-04 — Pipeline: drafted "magnetiseur-saint-germain-troyes-seances-cabinet" (Magnétiseur Saint-Germain (Troyes) : Séances Cabinet)
- 2026-04-04 — Pipeline: drafted "sevrage-tabac-combien-de-temps-calendrier-30-jours" (Sevrage Tabac Combien de Temps ? Calendrier 30 Jours)
- 2026-04-05 — Pipeline: drafted "sevrage-nicotine-symptomes-et-duree-calendrier" (Sevrage Nicotine : Symptômes et Durée [Calendrier])
- 2026-04-05 — Pipeline: drafted "sevrage-tabagique-a-troyes-guide-complet-2026" (Sevrage Tabagique à Troyes : Guide Complet [2026])
- 2026-04-05 — Pipeline: drafted "hypnose-troyes-tarifs-avis-specialites-2026" (Hypnose Troyes : Tarifs, Avis, Spécialités [2026])
- 2026-04-05 — Pipeline: drafted "arret-tabac-sans-rien-5-methodes-100-gratuites-2026" (Arrêt Tabac Sans Rien : 5 Méthodes 100% Gratuites [2026])
- 2026-04-05 — Pipeline: drafted "arreter-fumer-seul-ou-accompagne-statistiques" (Arrêter Fumer Seul ou Accompagné ? [Statistiques])
- 2026-04-06 — Pipeline: drafted "aimant-oreille-arret-tabac-arnaque-ou-efficace" (Aimant Oreille Arrêt Tabac : Arnaque ou Efficace ?)
