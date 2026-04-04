# SEO Strategy — magnetiseuse-lacoste-corinne.fr

**Date:** 2026-04-04
**Score actuel:** 47/100 | **Cible:** 72/100 en 90 jours (deadline: 2026-07-04)
**Objectif:** #1 Google pour "magnetiseuse Troyes", "hypnose arret tabac Troyes" + keywords sevrage

---

## 1. Situation actuelle

### Assets
| Metrique | Valeur |
|----------|--------|
| Pages service | 8 (index, magnetiseur-troyes, hypnose-troyes, magnetiseur-aube, arret-tabac-troyes, soins, a-propos, faq) |
| Articles blog | 57 publiés |
| Topic clusters | 6 (4 avec pillar publie, 2 avec pillar planned) |
| Avis Google | 35 (4.9 etoiles) |
| Schema type | HealthAndBeautyBusiness |
| Analytics | GA4 + GTM |
| Search Console | Connecte |

### Forces
- Volume de contenu exceptionnel (57 articles) pour un site local
- Specialisation arret tabac bien documentee (14 articles cluster principal)
- Differenciation claire : combo magnetisme + hypnose (unique localement)
- 85% taux de reussite 1ere seance (metric E-E-A-T forte)
- 2 seances de suivi gratuites (USP concurrentiel)
- Formation GNOMA certifiee (signal d'autorite)

### Faiblesses
- ~~Score technique 47/100~~ Corrections techniques Phase 1+2 appliquees — score a re-evaluer
- Aucune donnee de volume reel sur les keywords (CSV = tous 0)
- 1 pillar manquant (comparatifs tabac — 16 cluster pages orphelines)
- Zero citations locales (annuaires)
- 35 avis vs objectif 50+
- Pas de strategie backlinks
- Donnees concurrents partiellement verifiees
- config.js = source de verite unique (telephone, prix, schema) — ne jamais hardcoder

### Concurrents directs
| Concurrent | Force | Faiblesse | Menace |
|-----------|-------|-----------|--------|
| Alexis DI LEGAMI (magnetiseur-troyes.fr) | Domaine exact-match | 368 mots, pas d'arret tabac | Moyenne (domaine fort) |
| Sebastien Geoffron | Prix bas (40-50EUR) | Pas d'hypnose, pas de tabac | Faible |
| Francoise TELLIER (hypnose-et-sens.fr) | Reseau ATH, specialiste tabac | 2 seances min, 45min de Troyes | Moyenne |
| Karine DURST | Communaute Facebook | Pas de site web | Faible |
| Denise Prugnot (abchypnose-troyes.com) | Cabinet centre-ville Troyes | Non verifiee | A evaluer |

---

## 2. Strategie par pilier

### Pilier A — Technical SEO (Impact: +14 pts)
**Priorite: CRITIQUE — A faire en premier**

Le contenu publie sur un site mal indexe est invisible. Les corrections techniques debloquent tout le reste.

#### A1. Corrections Phase 1 (Score +8 pts) — COMPLETE
- [x] robots.txt corrige (Allow: /, Sitemap declare, crawlers IA)
- [x] config.js : domaine corrige (plus de corinnelacoste.fr)
- [x] Numero de telephone unifie (+33695486060 = 06 95 48 60 60)
- [x] Placeholders votresite.com supprimes
- [x] Canonical sur index.html (ligne 41)
- [x] Double viewport meta supprimee (1 seule restante)
- [x] Image hero : loading="eager" fetchpriority="high"

#### A2. Schema & Rich Snippets (Score +6 pts) — COMPLETE
- [x] Schema HealthAndBeautyBusiness + AggregateRating injecte dynamiquement par config.js sur TOUTES les pages
- [x] ratingValue 4.9 sur toutes les pages service
- [x] Bouton "Laisser un avis Google" sur index.html (ligne 650)
- [ ] Ajouter bouton "Laisser un avis Google" sur soins.html
- [ ] Verifier JSON-LD valide via Google Rich Results Test (validation manuelle)

#### A3. Performance & Core Web Vitals — Semaine 3-4
- [ ] Audit PageSpeed Insights (mobile) : viser LCP < 2.5s, CLS < 0.1
- [ ] Optimisation images (WebP, dimensions correctes, lazy/eager selon position)
- [ ] Minification CSS/JS supplementaire si necessaire
- [ ] Preload font critique + hero image

### Pilier B — Contenu (Impact: +12-18 pts)

#### B1. Pillar manquant : Comparatifs Methodes (tc_comparatifs_tabac)
**Status:** 16 cluster pages publiees, 0 pillar
**Action:** Creer `blog/methodes-arreter-fumer-comparatif-complet.html`
- Keyword cible : "meilleures methodes arreter fumer comparatif"
- SERP data requise avant redaction (demander au user)
- Lier les 16 cluster pages existantes vers ce pillar
- Impact : orphelin → structure coherente pour Google

#### B2. Cluster bien-etre Troyes (tc_bien_etre_troyes)
**Status:** 7 cluster pages publiees, pillar cancelled
**Decision strategique:** Le pillar a ete annule (dilution thematique). Les 7 articles restent publies mais ne sont pas structures en cluster complet.
**Recommandation:** Maintenir le statu quo. Si le trafic bien-etre croit organiquement, reconsiderer un pillar leger.

#### B3. Contenu a optimiser
- Articles existants > 90 jours : audit de fraicheur necessaire
- Verifier que chaque article a : FAQ schema, E-E-A-T signal, CTA vers RDV
- Maillage interne : chaque cluster page → son pillar (audit de liens)

#### B4. Prochains articles (basés sur la queue)
| Priorite | Article | Cluster | Status queue |
|----------|---------|---------|-------------|
| 1 | Pillar comparatifs tabac | tc_comparatifs_tabac | planned |
| 2 | Nouveaux articles symptomes si SERP le justifie | tc_sevrage_symptomes | a evaluer |
| 3 | Articles "pres de moi" pour villes Aube secondaires | tc_magnetiseur_aube | a evaluer |

### Pilier C — Local SEO (Impact: +7 pts)

#### C1. Citations locales (Score +4 pts) — Semaine 4-6
NAP uniforme partout :
```
Corinne Lacoste — Magnetiseuse & Hypnotherapeute
7 rue du Printemps, 10120 Saint-Germain
06 95 48 60 60  (A CONFIRMER)
```

Par ordre de priorite :
1. **Pages Jaunes** (pagesjaunes.fr) — revendiquer/creer fiche
2. **Annuaire-magnetiseurs.fr** — fiche praticienne
3. **GNOMA** — si membre (formation Pascal Bescos)
4. **Therapeutes.com** — fiche praticienne
5. **Bing Places** — synchroniser avec Google Business Profile
6. **Doctolib** ou **Resalib** — si applicable aux praticiens bien-etre

#### C2. Google Reviews (Score +3 pts) — Continu
- Objectif : 35 → 50+ avis en 3 mois
- Methode : SMS post-seance avec lien direct
- Lien : `https://search.google.com/local/writereview?placeid=ChIJeVdQE_mZ7kcE7rpheOUlF8c`
- Bouton "Laisser un avis" sur index.html et soins.html

#### C3. Google Business Profile
- [ ] Verifier que toutes les categories sont correctes
- [ ] Ajouter photos recentes du cabinet (min 5)
- [ ] Publier 1 Google Post/semaine (reutiliser extraits blog)
- [ ] Repondre a tous les avis (positifs et negatifs)

### Pilier D — Autorite & Backlinks (Impact: +5-8 pts)

#### D1. Backlinks naturels — Mois 2-3
- Article invite sur un blog sante/bien-etre local (journal de l'Aube, etc.)
- Partenariats avec professionnels de sante Troyes (medecins, pharmacies)
- Inscription dans annuaires professionnels de qualite
- Mention dans la presse locale si possible

#### D2. E-E-A-T renforcement
- Page a-propos avec parcours detaille + diplomes + photos cabinet
- Lien vers profil GNOMA si public
- Temoignages patients detailles (avec prenom, age, resultat)
- Ajouter "Mis a jour le [date]" sur les articles pillar

### Pilier E — GEO / AI Search Readiness (Impact: futur)

#### E1. Crawlers IA (deja dans robots.txt)
- GPTBot, PerplexityBot, ClaudeBot, Google-Extended : Allow

#### E2. Optimisation pour citations IA
- Reponses concises et structurees en debut d'article (position 0)
- FAQ schema sur toutes les pages (deja en place sur la plupart)
- Tableaux comparatifs (facilement extractibles par les IA)

---

## 3. Roadmap d'implementation

### Phase 1 : Foundation technique (Semaine 1-2) — Score +14 pts
| Jour | Action | Fichiers | Effort |
|------|--------|----------|--------|
| J1 | Corriger config.js domaine + telephone | config.js, config.min.js | 15min |
| J1 | Corriger placeholders votresite.com | a-propos.html | 5min |
| J1 | Canonical + viewport double sur index.html | index.html | 5min |
| J1 | Hero image eager/high priority | index.html | 2min |
| J2 | Schema HealthAndBeautyBusiness + AggregateRating | index.html, magnetiseur-troyes.html, hypnose-troyes.html | 30min |
| J2 | Deploy SFTP | Tous les fichiers modifies | 10min |
| J3 | Valider Rich Results Test Google | — | 15min |
| J7 | Inspecter toutes les URLs modifiees dans Search Console | — | 20min |

### Phase 2 : Contenu structurel (Semaine 3-6) — Score +6 pts
| Semaine | Action | Impact |
|---------|--------|--------|
| S3 | Creer pillar comparatifs tabac (apres SERP data) | Structure cluster complete |
| S3-4 | Audit maillage interne : chaque cluster → pillar | Meilleur crawl budget |
| S4-5 | Audit fraicheur articles > 60 jours | Contenu a jour |
| S5-6 | Optimiser les 5 pages service selon OPTIMISATIONS_pages-existantes.md | UX + conversion |

### Phase 3 : Local SEO (Semaine 4-8) — Score +7 pts
| Semaine | Action | Impact |
|---------|--------|--------|
| S4 | Inscription Pages Jaunes | Citation #1 |
| S5 | Inscription annuaire-magnetiseurs.fr + therapeutes.com | Citations #2-3 |
| S6 | Bing Places | Citation #4 |
| S4-12 | Campagne avis Google (SMS post-seance) | 35 → 50+ avis |
| S6 | Google Posts hebdo (extraits blog) | Activite GBP |

### Phase 4 : Autorite (Mois 3-6) — Score +5-8 pts
| Mois | Action | Impact |
|------|--------|--------|
| M3 | 1 article invite presse locale | Backlink DA moyen |
| M3-4 | Partenariats pro sante locaux | Backlinks locaux |
| M4-6 | Suivi positions + ajustements | Optimisation continue |

---

## 4. KPIs & Suivi

| Metrique | Baseline (Avr 2026) | Cible 3 mois | Cible 6 mois | Cible 12 mois |
|----------|---------------------|-------------|-------------|--------------|
| Score SEO | 47/100 | 72/100 | 80/100 | 85+/100 |
| Articles publies | 57 | 60 | 65 | 75 |
| Avis Google | 35 (4.9★) | 50+ | 65+ | 80+ |
| Citations locales | 0 | 4+ | 6+ | 8+ |
| Pages indexees (GSC) | A mesurer | 100% | 100% | 100% |
| Clics organiques/mois | A mesurer (GSC) | +30% | +60% | +100% |
| Position "magnetiseuse Troyes" | ~6e | Top 3 | #1-2 | #1 |
| Position "hypnose arret tabac Troyes" | A mesurer | Top 5 | Top 3 | #1-2 |
| Core Web Vitals mobile | A mesurer | Tous verts | Tous verts | Tous verts |

### Outils de suivi
- **Google Search Console** : positions, clics, indexation, Core Web Vitals
- **Google Analytics 4** (G-5KYCNEBXRX) : trafic, conversions, comportement
- **Google Rich Results Test** : validation schema
- **PageSpeed Insights** : performance mobile/desktop

---

## 5. Risques & Mitigations

| Risque | Probabilite | Impact | Mitigation |
|--------|-------------|--------|-----------|
| Probleme d'indexation persiste | Moyenne | Critique | Corriger Phase 1 en priorite absolue, verifier dans GSC sous 7j |
| Exact-match domain magnetiseur-troyes.fr nous devance | Haute | Moyen | Volume de contenu + E-E-A-T + avis Google compensent |
| Cannibalisation entre les 57 articles | Moyenne | Moyen | Audit cannibalization regulier via content-map.yaml |
| Volume de recherche trop faible (niche locale) | Haute | Faible | Normal pour le local — conversion > volume. Focus qualite de trafic |
| Penalite contenu genere IA | Faible | Critique | Tous les articles passent en human-review. Ajouter experience personnelle |
| Concurrent lance offensive SEO | Faible | Moyen | Avance de 57 articles + specialisation = barriere d'entree |

---

## 6. Actions immediates (cette semaine)

~~1. URGENT : Appliquer les 7 corrections Phase 1~~ **FAIT — tout est en ligne**
1. **IMPORTANT** : Ajouter bouton avis Google sur soins.html + deployer
2. **IMPORTANT** : Commencer la campagne avis Google (SMS post-seance)
3. **IMPORTANT** : S'inscrire sur Pages Jaunes
4. **PLANIFIER** : Collecter SERP data pour le pillar comparatifs tabac (16 cluster pages orphelines)
5. **PLANIFIER** : Audit PageSpeed Insights mobile + valider Rich Results Test

---

*Strategie generee le 2026-04-04 — basee sur l'audit SEO engine + 57 articles publies + 6 clusters*
