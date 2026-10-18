# JIAN'S UNIVERSE Implementation Plan

> For agentic workers: use superpowers:executing-plans to implement inline, with tests before application behavior and a fresh whole-project review.

**Goal:** Build a Vercel-ready single-page digital exhibition and authenticated administration.
**Architecture:** Next.js serves the landing page and protected media routes. Supabase Auth, Postgres RLS and private Storage provide persistent content. An explicit demo mode runs without credentials.
**Tech Stack:** Next.js, React, TypeScript, CSS/SVG, Web Audio, Supabase, Node test runner and Playwright.
**Spec:** `docs/superpowers/specs/2026-10-18-jian-universe-design.md`

## Global Constraints

- Public content stays on one landing page; administrator access is `/admin`.
- Sound starts OFF, even with saved preferences; resources start only after a gesture.
- Never misrepresent examples as Jian's original works or local edits as server saves.
- Respect reduced motion, keyboard access and missing media.
- No private uploads become accessible before approval; no browser service-role key.
- Use the existing isolated checkout, without another worktree.

## Review Focus

- Saved malformed settings must not break startup or enable sound.
- Media revocation must apply to the media route and byte-range requests.
- Arbitrary URLs, SVG uploads and oversized files must be rejected.
- Failed cloud operations must leave a recoverable UI with no false success.
- Keyboard focus and playback must be restored/stopped when dialogs close.

### Task 1: Domain and development foundation

Files: `package.json`, `tsconfig.json`, `lib/model.ts`, `lib/validation.ts`, `tests/domain.test.ts`.
Interfaces: `Work`, `Media`, `SiteSettings`; `filterWorks(works, category, year)`, `parsePreferences(value)`, `youtubeId(value)`, `validateUpload(name, type, size)`.

- [x] Write domain tests for filters, invalid preferences, YouTube allowlisting and upload validation; run to observe missing behavior.
- [x] Implement typed models, defaults and validation; run `npm test` until passing.
- [x] Install locked Next/React/Supabase and test dependencies; document runtime.

### Task 2: Exhibition and sound

Files: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `components/{exhibition,artwork,work-dialog,sound-provider,media-player}.tsx`, `lib/{demo,sound}.ts`, `tests/e2e/exhibition.spec.ts`.
Consumes: domain models and defaults. Produces: responsive exhibition and accessible work dialog, gesture-gated sound controller.

- [x] Write browser tests for initial silence, filtering, dialog focus/Escape, reduced motion and admin setup state; observe failure before implementation.
- [x] Implement cream-paper hero, orbit collage, cards, list/constellation views, field storytelling, timeline and detail dialog.
- [x] Implement lazy audio engine, independent persisted preferences, theme/effects, media coordination, visibility stop and actual audio analyser.
- [x] Verify with Chromium at desktop/mobile sizes and production build.

### Task 3: Cloud content and administration

Files: `lib/{supabase,catalog}.ts`, `app/api/{catalog,media/[id],admin/media}/route.ts`, `app/admin/page.tsx`, `components/admin-panel.tsx`, `supabase/schema.sql`, `tests/e2e/routes.spec.ts`.
Consumes: `Work`, `Media`, `SiteSettings`. Produces: published-only catalog, authenticated CRUD and private media retrieval/upload.

- [x] Write failing route tests for absent configuration, inaccessible media, and unauthenticated admin uploads.
- [x] Implement Auth login and membership verification, explicit offline setup state, editable works/settings and original-file uploads.
- [x] Implement SQL tables, RLS and private Storage policies; media route verifies approval on every request, forwards Range and disables caching.
- [x] Verify setup-state routes locally; mark live Supabase checks blocked unless configuration is supplied.

### Task 4: Operations and final validation

Files: `.env.example`, `README.md`, `playwright.config.ts`, `docs/validation.md`.

- [x] Document SQL installation, admin registration, Vercel settings and media limits.
- [x] Run domain suite, type check, production build and browser tests. Inspect desktop/mobile screenshots and fix material defects.
- [x] Obtain fresh code review; fix significant findings with regression tests.
- [x] Exercise production startup and representative requests, save tested install/start instructions to the cloud draft.
- [x] Report code readiness separately from blocked live cloud integration, real assets and actual publication.

## Execution record

The user approved the design and instructed “진행해”; implementation proceeds inline in this session. Cloud onboarding inspection found no application files, no Supabase bindings, and a working Git proxy/npm registry. Node 24.19.0 is available. No Git push or production deployment is requested.

## Final outcome

All four local implementation tasks are complete. Initial implementation: 8 unit tests and 12 Chromium tests passed. After real-content integration, the current totals are 15 unit tests and 18 browser tests; see the real-content plan and validation record. Production build and typecheck passed. Live Supabase operations, external YouTube playback, actual Safari, remote push and Vercel deployment remain explicitly unverified; see `docs/validation.md`. Installation/startup configuration was saved to the cloud draft, without publication.
