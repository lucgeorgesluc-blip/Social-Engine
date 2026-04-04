# Roadmap d'implementation SEO — magnetiseuse-lacoste-corinne.fr

**Periode:** Avril - Juillet 2026 (90 jours)
**Objectif:** 47/100 → 72/100

---

## Phase 1 : Foundation technique — COMPLETE (verifie 2026-04-04)
**Impact estime: +14 points** | **Status: DONE**

### Corrections appliquees (toutes en ligne)
- [x] robots.txt corrige (Allow: /, crawlers IA, Sitemap)
- [x] config.js : domaine corrige, telephone unifie (06 95 48 60 60)
- [x] Placeholders votresite.com supprimes
- [x] Canonical sur index.html
- [x] Double viewport meta supprimee
- [x] Hero image : loading="eager" fetchpriority="high"
- [x] Schema HealthAndBeautyBusiness + AggregateRating (injecte dynamiquement par config.js)
- [x] ratingValue 4.9 sur toutes les pages service
- [x] Bouton "Laisser un avis Google" sur index.html

### Reste a faire (mineur)
- [ ] Ajouter bouton "Laisser un avis Google" sur soins.html
- [ ] Valider JSON-LD via Google Rich Results Test
- [ ] Audit PageSpeed Insights mobile (LCP < 2.5s, CLS < 0.1)

**Note:** config.js = source de verite unique (telephone, prix, schema). Ne jamais hardcoder.

---

## Phase 2 : Contenu structurel (Semaine 3-6)
**Impact estime: +6 points**
**Prerequis:** Phase 1 terminee

### Semaine 3-4 (21 avril - 2 mai)
- [ ] Collecter SERP data "meilleures methodes arreter fumer comparatif"
- [ ] Rediger pillar comparatifs tabac (methodes-arreter-fumer-comparatif-complet.html)
- [ ] Lier les 16 cluster pages existantes vers ce nouveau pillar
- [ ] Mettre a jour content-map.yaml, topic-clusters.yaml

### Semaine 5-6 (5-16 mai)
- [ ] Audit maillage interne : verifier que chaque cluster page lie vers son pillar
- [ ] Audit fraicheur : mettre a jour les articles > 60 jours si necessaire
- [ ] Optimiser les 5 pages service selon OPTIMISATIONS_pages-existantes.md
- [ ] Verifier FAQ schema sur tous les articles

**Checkpoint Phase 2:** 5/6 clusters avec pillar publie, maillage interne complet

---

## Phase 3 : Local SEO (Semaine 4-8)
**Impact estime: +7 points**
**Prerequis:** Telephone confirme (Phase 1)

### Semaine 4 (28 avril - 2 mai)
- [ ] Creer/revendiquer fiche Pages Jaunes
- [ ] Commencer campagne SMS avis Google post-seance

### Semaine 5-6 (5-16 mai)
- [ ] Inscription annuaire-magnetiseurs.fr
- [ ] Inscription therapeutes.com
- [ ] Verifier fiche GNOMA (si membre)

### Semaine 7-8 (19-30 mai)
- [ ] Creer fiche Bing Places
- [ ] Optimiser Google Business Profile (photos, categories, posts)
- [ ] Commencer Google Posts hebdomadaires (extraits blog)

**Checkpoint Phase 3:** 4+ citations locales, routine GBP en place, avis 40+

---

## Phase 4 : Autorite (Mois 3-6, juin-septembre)
**Impact estime: +5-8 points**
**Prerequis:** Phases 1-3 terminees

### Mois 3 (juin)
- [ ] Identifier 3 opportunites backlinks locaux (presse, partenaires)
- [ ] Contacter 1 media local pour article invite
- [ ] Publier 2 nouveaux articles blog (si SERP justifie)

### Mois 4-6 (juillet-septembre)
- [ ] Suivi positions sur keywords cibles via GSC
- [ ] Ajuster strategie contenu selon donnees reelles
- [ ] Audit Performance CWV : viser tous verts mobile
- [ ] Objectif 50+ avis Google atteint
- [ ] Re-audit complet score SEO

---

## Calendrier visuel

```
AVR 2026        MAI 2026         JUIN 2026        JUL 2026
S1  S2  S3  S4  S5  S6  S7  S8  S9  S10 S11 S12  S13
[=TECH FIX==]
        [===CONTENU====]
            [=====LOCAL SEO======]
                                 [====AUTORITE==========...
47pts  55pts  61pts  65pts  68pts  70pts  72pts →
```

---

## Dependances critiques

```
Phase 1 (technique) ──→ Phase 2 (contenu)
                    └─→ Phase 3 (local SEO, besoin du tel confirme)
Phase 2 + Phase 3 ──→ Phase 4 (autorite)
```

La Phase 1 est le goulot d'etranglement. Rien d'autre ne fonctionne correctement tant que l'indexation n'est pas corrigee.

---

*Roadmap generee le 2026-04-04*
