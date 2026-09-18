# DMF Academy — Student Portal v1

## Architecture

The Student Portal is a client-side SPA served alongside the existing DMF landing page.
It does not modify or interfere with the 3D/WebGL pipeline, Manufacturing Master,
or any existing inject scripts (PR25–35 scope is frozen).

### File Structure

```
public/
  login.html          — Login page (auth abstraction)
  academy.html        — Student Portal SPA (dashboard + module views)
  academy-config.js   — Module/lesson definitions + stream URL config

scripts/
  inject-academy-link.cjs — Injects "Student Access" link into landing nav

docs/
  DMF_ACADEMY_V1.md   — This file
```

### Routes

| Path                    | Page             | Notes                                |
|-------------------------|------------------|--------------------------------------|
| `/login`                | `login.html`     | Auth form (Firebase or demo mode)    |
| `/academy`              | `academy.html`   | Dashboard — module grid + progress   |
| `/academy/module/:id`   | `academy.html`   | Module view — player + lessons       |

Routing works via:
- **Express** (`server.js`): explicit routes for `/login`, `/academy`, `/academy/*`
- **Firebase Hosting** (`firebase.json`): rewrites before the `**` catch-all

### Build Pipeline

The landing page build pipeline is unchanged:

```
index.html → build-3d.cjs → public/index.html → inject-*.cjs (codex, oracle,
transmission, compute-uplink, training-state, academy-link)
```

`inject-academy-link.cjs` adds a "Student Access" link to the nav in `public/index.html`.
It uses the `DMF_ACADEMY_LINK` marker to avoid duplicate injection.

## Modules

8 modules, each with 4 lessons:

| #  | Code    | Title (EN)                     | Duration |
|----|---------|--------------------------------|----------|
| 01 | IDEA    | Track Structure & Development  | ~75 min  |
| 02 | MIX     | Mixing & Balance               | ~90 min  |
| 03 | SOUND   | Sound Selection                | ~80 min  |
| 04 | BASS    | Bass Creation                  | ~70 min  |
| 05 | FLOW    | Workflow & Efficiency          | ~60 min  |
| 06 | MINDSET | Producer Mindset               | ~60 min  |
| 07 | MARKET  | Music Market                   | ~75 min  |
| 08 | RELEASE | Mastering & Final Prep         | ~90 min  |

Module states: `AVAILABLE`, `IN PROGRESS`, `COMPLETED`, `LOCKED`, `AWAITING REVIEW`

Sequential unlock: a module becomes AVAILABLE when the previous is COMPLETED.
In demo mode, all modules are AVAILABLE.

## Video / HLS Streaming

Stream URLs are configured via `DMF_STREAM_BASE` environment variable.
No video files are stored in the repository — all streams are external.

Path pattern: `{STREAM_BASE}/mod-{id}/lesson-{n}/master.m3u8`

Player uses:
- **HLS.js** (loaded on demand from CDN) for non-Safari browsers
- **Native HLS** for Safari (via `canPlayType('application/vnd.apple.mpegurl')`)

Test locally: `DMF_STREAM_BASE=http://localhost:8080`

## Environment Variables

| Variable           | Default                | Description                              |
|--------------------|------------------------|------------------------------------------|
| `DMF_STREAM_BASE`  | `http://localhost:8080` | HLS stream server base URL              |
| `DMF_ACADEMY_DEMO` | (not set)              | Set `true` to enable demo login mode     |
| `MP_PUBLIC_KEY`     | —                      | Mercado Pago public key (existing)       |
| `MP_ACCESS_TOKEN`   | —                      | Mercado Pago access token (existing)     |
| `PORT`              | `3000`                 | Express server port (existing)           |
| `BASE_URL`          | `http://localhost:3000` | Base URL for payment callbacks (existing)|

## Demo Mode

When `DMF_ACADEMY_DEMO=true` or `?demo=true` on the login page:
- Login accepts any email/password
- Auth stored in `sessionStorage` (not persistent)
- All modules unlocked (no sequential gating)
- No Firebase Auth required

## Authentication

Two-layer abstraction:

1. **Firebase Auth** (production): `signInWithEmailAndPassword` on login,
   `onAuthStateChanged` on academy page. Requires Firebase SDK on the page.
2. **Demo mode** (development): `sessionStorage`-based auth. No external deps.

The login page auto-detects which mode is available.

## Entitlement

Separated from authentication via `hasCourseAccess(userId)`.

Current implementation: any authenticated user has access (placeholder).
Future: check Firestore document, API endpoint, or Mercado Pago payment status.

## Progress Tracking

`LocalProgressStore` in `academy.html`:
- Stores lesson completion timestamps in `localStorage` under `dmf_progress`
- Calculates per-module and overall progress
- Toggle-based: click checkmark to mark/unmark lessons
- Wrapped in try/catch for private browsing compatibility

Designed for replacement: swap `ProgressStore` implementation with
`FirestoreProgressStore` or `ApiProgressStore` matching the same interface.

## Mercado Pago

Existing payment flow is preserved. The academy does NOT grant access based on
URL parameters like `?status=approved`. Entitlement is a separate layer that
must be connected to payment webhooks (production gap).

## Production Gaps

- [ ] Firebase Auth configuration (project already exists: `vibraaltoai-11f55`)
- [ ] Firestore entitlement documents linked to Mercado Pago payments
- [ ] Payment webhook → entitlement grant flow
- [ ] Server-side progress persistence (Firestore or API)
- [ ] HLS stream hosting (Bunny.net or equivalent CDN)
- [ ] Work submission system for practice assignments
- [ ] Review/feedback workflow for instructors
- [ ] Email notifications (enrollment confirmation, review ready)
- [ ] i18n toggle on academy pages (currently English-only in portal)

## Security

- No secrets in frontend files (validated in CI)
- No media files in repository (validated in CI)
- `textContent` used for all dynamic content rendering (XSS safe)
- `escHtml()` helper for innerHTML where needed (module cards)
- Stream URLs configured server-side, not hardcoded
- Auth tokens in `sessionStorage` (cleared on tab close in demo mode)
- Entitlement check separate from authentication
- URL parameters never trusted for access decisions

## CI Validation

`validate-academy` job in `.github/workflows/validate-3d.yml`:
1. Academy files exist (`login.html`, `academy.html`, `academy-config.js`)
2. 8 modules configured in `academy-config.js`
3. No media files (`.mp4`, `.ts`, `.m3u8`) in repository
4. No secrets in frontend files
5. Firebase rewrites correct (academy routes before catch-all)
6. HLS stream URLs configurable (not hardcoded)
