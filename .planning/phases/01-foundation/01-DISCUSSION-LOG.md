# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 01-foundation
**Areas discussed:** Dashboard placement, Login experience, Post-login shell

---

## Area Selection

| Area | Selected |
|------|----------|
| Dashboard placement | ✓ |
| Database tier | |
| Login experience | ✓ |
| Post-login shell | ✓ |

---

## Dashboard Placement

### Q1: Where should the dashboard code live?

| Option | Description | Selected |
|--------|-------------|----------|
| New dashboard/ directory (Recommended) | Clean separation, own package.json, deployed independently | ✓ |
| Extend autopilot/ | Reuse existing Express/sessions/bcrypt from autopilot | |
| Monorepo root app | Dashboard at repo root alongside static site | |

**User's choice:** New dashboard/ directory
**Notes:** None

### Q2: Should the dashboard reuse any dependencies from autopilot/?

| Option | Description | Selected |
|--------|-------------|----------|
| Fully independent (Recommended) | Own package.json, no coupling to autopilot | ✓ |
| Shared root deps | Common deps in root package.json | |

**User's choice:** Fully independent
**Notes:** None

---

## Login Experience

### Q3: What should the login page look like?

| Option | Description | Selected |
|--------|-------------|----------|
| Branded minimal (Recommended) | Centered form with brand colors, logo, single password field | ✓ |
| Ultra-minimal | Plain white page, zero design | |
| Full brand page | Background image, full branding, tagline | |

**User's choice:** Branded minimal
**Notes:** None

### Q4: CSS framework for dashboard UI?

| Option | Description | Selected |
|--------|-------------|----------|
| Tailwind CSS (Recommended) | Same framework as main site, reuse brand colors, own build | ✓ |
| Plain CSS | No framework, custom CSS | |
| You decide | Claude picks | |

**User's choice:** Tailwind CSS
**Notes:** None

### Q5: UI text language?

| Option | Description | Selected |
|--------|-------------|----------|
| French (Recommended) | Consistent with main site and operator's language | ✓ |
| English | Standard for dev tools | |
| Mix | French UI labels, English technical elements | |

**User's choice:** French
**Notes:** None

---

## Post-Login Shell

### Q6: What should the authenticated user see in Phase 1?

| Option | Description | Selected |
|--------|-------------|----------|
| Nav + health status (Recommended) | Sidebar nav with placeholder items, health check card with DB status and seed counts | ✓ |
| Welcome page only | Simple greeting, just proves auth works | |
| Full nav skeleton | Complete navigation, all sections visible but empty | |

**User's choice:** Nav + health status
**Notes:** None

### Q7: Sidebar or top nav?

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar (Recommended) | Vertical left menu, collapses to hamburger on mobile | ✓ |
| Top nav | Horizontal bar at top | |
| You decide | Claude picks | |

**User's choice:** Sidebar
**Notes:** None

### Q8: Future nav items visible or hidden?

| Option | Description | Selected |
|--------|-------------|----------|
| Visible but disabled (Recommended) | All items shown, greyed out with "Bientôt" badge | ✓ |
| Hidden until ready | Only show "Accueil" in Phase 1 | |
| You decide | Claude picks | |

**User's choice:** Visible but disabled
**Notes:** None

---

## Claude's Discretion

- DB schema design (table structure, relationships, indexes)
- Seed script implementation details
- Express middleware stack ordering
- Health check endpoint design
- Error page styling

## Deferred Ideas

None — discussion stayed within phase scope
