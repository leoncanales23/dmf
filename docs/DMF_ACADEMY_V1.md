# DMF Academy — Student Portal v1

## Architecture

The Student Portal is a client-side SPA served alongside the existing DMF landing page.
It does not modify or interfere with the 3D/WebGL pipeline, Manufacturing Master,
or any existing inject scripts (PR25–35 scope is frozen).

### Infrastructure Separation

DMF uses two separate Firebase projects intentionally:

| Concern | Firebase Project | Purpose |
|---------|-----------------|---------|
| **Hosting** | `vibraaltoai-11f55` | Firebase Hosting for `dmf.vibraalto.cl` (landing, 3D, dmfTraining) |
| **Academy Auth + Firestore** | `dmf-academy` | Firebase Authentication, Cloud Firestore (enrollments) |
| **Video Streaming** | Cloudflare Stream | HLS video delivery via per-lesson UID mapping |

The web app hosted on `vibraaltoai-11f55` consumes Firebase Auth + Firestore
from the `dmf-academy` project via runtime configuration injected by `academy-env.js`.

**Do not merge these projects.** `.firebaserc` points to `vibraaltoai-11f55`
for Hosting deployments. Firestore rules must be deployed separately with
`--project dmf-academy`.

### File Structure

```
public/
  login.html          — Login page (Firebase Auth or demo mode)
  academy.html        — Student Portal SPA (dashboard + module views)
  academy-config.js   — Module/lesson definitions + stream URL config
  academy-env.js      — Generated runtime config (gitignored)

scripts/
  inject-academy-link.cjs — Injects "Student Access" link into landing nav
  inject-academy-env.cjs  — Generates academy-env.js from env vars at build time

firestore.rules       — Firestore security rules for dmf-academy project

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

Direct URL access to locked modules is enforced: if a module's state is `LOCKED`,
navigating to `/academy/module/:id` redirects to the dashboard.

### Build Pipeline

The landing page build pipeline is unchanged:

```
index.html → build-3d.cjs → public/index.html → inject-*.cjs (codex, oracle,
transmission, compute-uplink, training-state, academy-link, academy-env)
```

`inject-academy-link.cjs` adds a "Student Access" link to the nav in `public/index.html`.
It uses the `DMF_ACADEMY_LINK` marker to avoid duplicate injection.

`inject-academy-env.cjs` generates `public/academy-env.js` from environment variables,
setting `window.__DMF_STREAM_BASE__`, `window.__DMF_ACADEMY_DEMO__`, and
`window.__DMF_FIREBASE_CONFIG__` for runtime use. The Firebase config points to the
`dmf-academy` project (via `DMF_FIREBASE_PROJECT_ID` GitHub Secret).

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

## Video / HLS Streaming — Cloudflare Stream

Videos are hosted on **Cloudflare Stream**. Each lesson maps to a video by its
Cloudflare **Video UID** (`streamUid` in `academy-config.js`), not by file path.

No video files are stored in the repository — all streams are external.

### URL Pattern

```
{DMF_STREAM_BASE}/{VIDEO_UID}/manifest/video.m3u8
```

- `DMF_STREAM_BASE` is injected at build time (e.g. `https://customer-XXXX.cloudflarestream.com`)
- The domain MUST NOT be hardcoded in source — it comes from environment variables only
- Video UIDs are public identifiers (not secrets) and safe to commit

### Lesson Mapping

Lessons with a `streamUid` property produce a playable stream URL.
Lessons without `streamUid` show a "Próximamente" placeholder — no network
request is made, `loadSource()` / `video.src` is never called.

### Current Video Map

| Module | Lesson | UID | Title |
|--------|--------|-----|-------|
| 01 | L01 | `87da20f0d21e697054a3e84c0e6c78c7` | Kick / Snare / Hi Hat |

Remaining lessons will be mapped as videos are uploaded to Cloudflare Stream.

### Player

- **HLS.js** (loaded on demand from CDN) for non-Safari browsers
- **Native HLS** for Safari (via `canPlayType('application/vnd.apple.mpegurl')`)

### Security

- No Signed URLs in this phase — public delivery domain only
- `CLOUDFLARE_STREAM_API_TOKEN` never appears in frontend code
- `customer-*.cloudflarestream.com` domain never hardcoded in source
- CI validates: at least one UID mapped, manifest pattern present, no secrets

### Local Testing

```
DMF_STREAM_BASE=http://localhost:8080
```

For local testing without Cloudflare, set `DMF_STREAM_BASE` to a local server
that serves HLS at `/{uid}/manifest/video.m3u8`.

## Environment Variables

| Variable                  | Default                    | Description                              |
|---------------------------|----------------------------|------------------------------------------|
| `DMF_STREAM_BASE`         | `http://localhost:8080`    | HLS stream server base URL               |
| `DMF_ACADEMY_DEMO`        | (not set)                  | Set `true` to enable demo login mode     |
| `DMF_FIREBASE_API_KEY`    | (not set)                  | Firebase Web API key (dmf-academy)       |
| `DMF_FIREBASE_AUTH_DOMAIN`| `dmf-academy.firebaseapp.com` | Firebase Auth domain (dmf-academy)    |
| `DMF_FIREBASE_PROJECT_ID` | `dmf-academy`              | Firebase project ID for Auth + Firestore |
| `MP_PUBLIC_KEY`            | —                          | Mercado Pago public key (existing)       |
| `MP_ACCESS_TOKEN`          | —                          | Mercado Pago access token (existing)     |
| `PORT`                     | `3000`                     | Express server port (existing)           |
| `BASE_URL`                 | `http://localhost:3000`    | Base URL for payment callbacks (existing)|

## Demo Mode

When `DMF_ACADEMY_DEMO=true` (build-time env only):
- Login accepts any email/password
- Auth stored in `sessionStorage` (not persistent)
- All modules unlocked (no sequential gating)
- No Firebase Auth required
- Entitlement check bypassed

Demo mode is activated **only** via build-time environment variable.
Query string `?demo=true` is **not** supported — it was removed to prevent
production bypass. Do not set `DMF_ACADEMY_DEMO` in production.

## Authentication

Firebase Auth SDK loaded from CDN (firebase-app-compat + firebase-auth-compat v10.12.0).
Initialized at page load if `window.__DMF_FIREBASE_CONFIG__` is set by `academy-env.js`.

The Firebase config points to the **`dmf-academy`** project, not the hosting project.

Initialization is guarded: if `firebase.initializeApp()` fails or the SDK is not
loaded, login shows "Authentication service is not configured." instead of
throwing an unhandled exception.

Flow:
1. `login.html`: `signInWithEmailAndPassword` → redirect to `/academy`
2. `academy.html`: `onAuthStateChanged` → if user exists, check entitlement → init

Firebase Auth maintains its own session persistence. Production auth does **not**
depend on `sessionStorage` (`dmf_auth`) — that key is used exclusively by demo mode.

### Error Handling

Login error codes are mapped to safe, non-enumerating messages:

| Firebase Code | User Message |
|---------------|-------------|
| `auth/invalid-credential` | Invalid email or password. |
| `auth/user-not-found` | Invalid email or password. |
| `auth/wrong-password` | Invalid email or password. |
| `auth/invalid-email` | Please enter a valid email address. |
| `auth/too-many-requests` | Too many attempts. Try again later. |
| `auth/user-disabled` | This account has been disabled. Contact support. |

No error code reveals whether an email exists in the system.

## Entitlement

Separated from authentication. Auth answers "who are you?", entitlement answers
"do you have access?"

Implementation: Firestore document check at `enrollments/{uid}` in the
**`dmf-academy`** project.
- Document must exist with `status: 'active'` for access to be granted
- Requires firebase-firestore-compat SDK (loaded in academy.html)
- In demo mode, entitlement check is bypassed

Access is **fail-closed**: any Firestore error, missing document, or non-active
status results in "Access Required." Access is never granted by:
- Query parameters
- localStorage / sessionStorage
- URL patterns
- Payment result URLs
- Email alone
- Presence of streamUid

### Firestore Setup Required

1. Open Firebase console for project **`dmf-academy`**
2. Enable **Authentication** → Email/Password provider
3. Enable **Cloud Firestore** database
4. Deploy security rules: `firebase deploy --only firestore:rules --project dmf-academy`
5. Create a test user in Firebase Auth
6. Get the user's Firebase UID from the Auth console
7. Create document `enrollments/{uid}` with content: `{ status: "active" }`

### Firestore Security Rules

File: `firestore.rules`

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /enrollments/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow create, update, delete: if false;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Key properties:
- Authenticated user can only read their own enrollment document
- No client can create, update, or delete enrollment documents
- All other collections are deny-by-default
- Enrollment grants are done by backend/admin only (not implemented yet)

## Firestore Rules Deployment

**IMPORTANT**: `.firebaserc` points to `vibraaltoai-11f55` (the Hosting project).
Firestore rules belong to the **`dmf-academy`** project.

To deploy Firestore rules:

```bash
firebase deploy --only firestore:rules --project dmf-academy
```

**NEVER** run `firebase deploy --only firestore:rules` without `--project dmf-academy`.
Without the project flag, rules would deploy to the hosting project, which is wrong.

The CI/CD deploy workflow (`deploy.yml`) deploys **only Hosting** (and optionally
the dmfTraining function). It does **not** deploy Firestore rules automatically.
Firestore rules must be deployed manually or via a separate workflow targeting
`dmf-academy`.

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

- [x] Firebase Auth configuration (SDK loaded, initialized from env)
- [x] Auth separated from entitlement (Firestore check)
- [x] Module lock enforced on direct URL access
- [x] Build-time runtime config (inject-academy-env.cjs)
- [x] CI hardened for MP4/TS/M3U8 (excluding public/uploads/)
- [x] Cloudflare Stream hosting (per-lesson UID mapping)
- [x] Firestore security rules (deny client writes, user-scoped reads)
- [x] Firebase init guard (graceful failure)
- [x] Login error handling (non-enumerating)
- [x] Demo mode restricted to build-time only
- [x] Two-project architecture documented (Hosting vs Academy)
- [ ] Firestore enrollment documents linked to Mercado Pago payments
- [ ] Payment webhook → entitlement grant flow
- [ ] Server-side progress persistence (Firestore or API)
- [ ] Signed playback URLs (Cloudflare Stream)
- [ ] Work submission system for practice assignments
- [ ] Review/feedback workflow for instructors
- [ ] Email notifications (enrollment confirmation, review ready)
- [ ] i18n toggle on academy pages (currently English-only in portal)

## Security

- No secrets in frontend files (validated in CI)
- No media files in repository (validated in CI, excluding `public/uploads/` stubs)
- `textContent` used for all dynamic content rendering (XSS safe)
- `escHtml()` helper for innerHTML where needed (module cards)
- Stream URLs configured via build-time injection, not hardcoded
- Demo auth in `sessionStorage` only — production uses Firebase Auth session persistence
- Entitlement check separate from authentication (Firestore document)
- URL parameters never trusted for access decisions
- Firebase config injected at build time from environment variables
- Locked modules enforced in client-side router
- Firestore rules deny all client writes (enrollment admin-only)
- Firebase init failures handled gracefully (no unhandled exceptions)
- Login errors do not reveal user existence
- No `?demo=true` query string activation in production

## CI Validation

`validate-academy` job in `.github/workflows/validate-3d.yml`:
1. Academy files exist (`login.html`, `academy.html`, `academy-config.js`)
2. 8 modules configured in `academy-config.js`
3. No media files (`.mp4`, `.ts`, `.m3u8`) in repository (excluding `public/uploads/`)
4. No secrets in frontend files
5. Firebase rewrites correct (academy routes before catch-all)
6. HLS stream URLs configurable (not hardcoded)
7. Cloudflare Stream UID mapping validated
8. No Cloudflare secrets or hardcoded domains in frontend
9. Firestore rules exist and enforce security (enrollments, deny writes)
10. Docs reference `dmf-academy` project
11. No frontend files reference `vibraaltoai-11f55` (hosting project)
12. Login does not allow demo via query string
13. No service account or admin credentials in frontend
