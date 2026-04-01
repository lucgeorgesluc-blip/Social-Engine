# Corinne SEO Autopilot

## Current Milestone: v1.48.0 — SEO Page Audit & Auto-Patch

**Goal:** L'autopilot détecte les pages faibles (schema manquant, contenu fin, cannibalisation) quand un ranking chute, génère un patch HTML ciblé, et le déploie après validation — sans jamais proposer de créer une page qui existe déjà.

**Target features:**
- Page Scanner — inventaire complet des HTML + extraction signaux SEO (schema, mots, FAQ, avis, liens)
- Audit Engine — scoring 100pts, détection cannibalisation, pages orphelines
- Ranking Trigger — chute ≥5 positions → audit auto + déclenchement manuel
- Patch Generator — Claude API génère le HTML corrigé (schema, FAQ) avec liste "never auto-apply"
- Apply Flow — validation pre-patch → Corinne approuve → commit + SFTP (réutilise deploy-orchestrator)
- Dashboard Audit Tab — health scores, alertes chutes, drill-down par page, boutons approve/reject

---

## What This Is

A daily autonomous agent + web dashboard that automatically drafts, images, and deploys SEO blog articles for magnetiseuse-lacoste-corinne.fr. Built in `autopilot/` (subfolder of the existing static site repo). The system reads the existing `.seo-engine/` data files as context, calls the Claude API to generate articles, notifies the site owner (Corinne) via Telegram for approval, then deploys to production SFTP and pings Google Search Console — all without manual intervention.

## Core Value

Corinne approves one article per day from her phone and wakes up to a higher Google ranking — zero manual writing, deploying, or config editing required.

## Requirements

### Validated

- [x] Generates hero image via Gemini API → sharp → WebP 800×450 @q85 — *Validated in Phase 3: Image Generation*
- [x] Graceful fallback: when Gemini API fails, article HTML strips the `<img>` tag — no broken image shown — *Validated in Phase 3: Image Generation*

### Active

**Pipeline (daily cron)**
- [ ] Daily cron (09:00) reads `.seo-engine/` context files and picks next article from content queue
- [ ] Calls Claude API (claude-sonnet-4-6) with full SEO engine context to draft article HTML
- [ ] Cannibalization check before drafting (scans content-map.yaml)
- [ ] Internal links injected automatically (max relevant, from existing published pages)
- [ ] FAQPage + Article JSON-LD schema generated per article
- [ ] Generates hero image via Gemini API → ImageMagick → WebP 800×450 @q85
- [ ] Updates `config.js`, `config.min.js` (via terser), `sitemap.xml` atomically
- [ ] Sends Telegram notification with article preview link + ✅ Approve / ✏️ Edit buttons
- [ ] On approval: SFTP deploy → Google Search Console URL Inspection API ping
- [ ] Updates `.seo-engine/data/` files: content-map, queue, changelog after deploy

**Dashboard (web UI)**
- [ ] Article queue view: status per article (Drafted / Pending Approval / Published / Queued)
- [ ] Inline approve + edit buttons per article (mirrors Telegram)
- [ ] Keyword rankings panel: per-keyword position over time (via GSC API), article publish date markers on timeline
- [ ] Internal link mind map: hierarchy/arbre généalogique view, clickable nodes, orphan pages highlighted red
- [ ] Today's pipeline workflow: visual step-by-step showing current automation stage
- [ ] Activity feed: timestamped pipeline events (not raw logs — human-readable sentences)
- [ ] Stats row: articles published / pending / SEO score / keywords in top 10
- [ ] Mac-app dark aesthetic (Image #1 reference): navy bg, rounded cards, blue accents, sidebar nav

**Security & Ops**
- [ ] All secrets (SFTP password, API keys, Telegram token) in `.env` — never in code
- [ ] Render environment variable support for cloud deploy
- [ ] Per-day article cap (max 1) hardcoded — prevents runaway API spend
- [ ] Spending safeguard: skip image generation if Claude API cost estimate exceeds threshold
- [ ] Dashboard password-protected (simple auth)

### Out of Scope

- Full CMS / article editor in dashboard — editing happens in Claude Code or direct file edit
- Multi-site support — built for magnetiseuse-lacoste-corinne.fr only (v1)
- Automatic publishing without human approval — approval gate is non-negotiable
- rTMS mentions anywhere in generated content — per existing SEO engine rules
- Hard-coded prices in articles — always `data-price="tabac"` pattern

## Context

**Existing infrastructure (reads, does not modify structure):**
- `E:/Site CL/.seo-engine/` — SEO brain: config.yaml, features.yaml, content-queue.yaml, seo-keywords.csv, content-map.yaml, topic-clusters.yaml, tone-guide.md, blog-structures.yaml
- `E:/Site CL/CLAUDE.md` — full workflow rules, article checklist
- `E:/Site CL/INSTRUCTIONS_NOUVEAUX_ARTICLES_BLOG.md` — article creation checklist
- `E:/Site CL/assets/js/config.js` — source of truth for prices, contact, schema

**Deployment target:**
- SFTP: `home755449657.1and1-data.host` port 22, user `u95030755`
- Static HTML site, no build step — files deploy directly

**APIs available:**
- Claude API (Anthropic) — article drafting
- Gemini API (`gemini-2.5-flash-image`) — hero image generation, key: in `.env`
- DataForSEO MCP — keyword/SERP data (login: `yijop25811@fun4k.com`)
- Google Search Console API — rankings + URL inspection
- Telegram Bot API — approval notifications

**Design reference:**
- UI: dark Mac-app aesthetic (Image #1: `banana_20260329_114555_292068.png`)
- Key screens: Queue view, Rankings with timeline markers, Internal link tree, Today's pipeline workflow, Telegram toast
- Tech: Node.js + Express backend, vanilla JS or lightweight frontend framework, Tailwind CSS

**Article rules (enforced by pipeline):**
- No hard-coded prices — `<span data-price="tabac"></span>` pattern
- No rTMS mentions
- Add to HEAD of `SITE_CONFIG.blog` in config.js
- Regenerate config.min.js after every article
- Add URL to sitemap.xml

## Constraints

- **Security**: Secrets in `.env` only — never committed to git. Render env vars for cloud.
- **Spend cap**: Max 1 article/day. Estimated ~€0.20–0.50/article (Claude Sonnet).
- **Approval gate**: Deploy ONLY after Telegram ✅ or dashboard approval — never auto-publish.
- **Stack**: Node.js (existing `package.json` in repo). No Python runtime dependency for core pipeline.
- **Hosting**: Render (free tier cron jobs work; dashboard on $7/mo paid tier if always-on needed).
- **Image tool**: Gemini `gemini-2.5-flash-image` via Python script fallback (nanobanana MCP when available).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| `autopilot/` subfolder (not separate repo) | Same repo = reads `.seo-engine/` with relative paths, one git history | — Pending |
| Telegram + dashboard approval (both) | Phone convenience + desktop visibility | — Pending |
| Node.js backend | Existing package.json, JS ecosystem, good Anthropic SDK support | — Pending |
| Interactive GSD mode | Complex multi-phase project — review gates catch mistakes early | — Pending |
| GSC API for rankings (not DataForSEO) | GSC is free and authoritative for this site's own data | — Pending |
| DataForSEO for SERP research | Enables full automation of keyword angle selection | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-30 — Phase 3 (Image Generation) complete: generateImage() module with @google/genai + sharp, stripHeroImage() fallback, 78/78 tests passing*
