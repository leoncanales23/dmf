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
  login.html            — Login + account creation (Firebase Auth or demo mode)
  academy.html          — Student Portal SPA (dashboard + module views)
  academy-config.js     — Module/lesson definitions + stream URL config
  academy-env.js        — Generated runtime config (gitignored)
  payment-result.html   — Post-checkout enrollment polling page

scripts/
  inject-academy-link.cjs — Injects "Student Access" link into landing nav
  inject-academy-env.cjs  — Generates academy-env.js from env vars at build time

workers/
  dmf-stream-signer/    — Cloudflare Worker for signed video playback
  dmf-payments/         — Cloudflare Worker for Mercado Pago checkout + enrollment

firestore.rules           — Firestore security rules for dmf-academy project
firebase.academy.json     — Firestore-only Firebase config for dmf-academy project

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

The portal now follows the actual source-video order delivered by Demian. The recorded library currently contains **13 videos grouped into 4 source modules**:

| #  | Code    | Source block | Lessons |
|----|---------|--------------|---------|
| 01 | INTRO   | Intro Ableton | 2 |
| 02 | CLASE 1 | Kick / structure / bass / Loopcloud | 4 |
| 03 | CLASE 2 | Top loops / synths / percussion / shakers | 4 |
| 04 | CLASE 3 | Edit & mix / vocals / compression | 3 |

Exact source order:

1. `INTRO ABLETON/1. Intro ableton p1.mp4`
2. `INTRO ABLETON/2. intro abeton pt2.mp4`
3. `CLASE 1/2.1 Kickk snare Hi Hat.mp4`
4. `CLASE 1/2.2 Estructura.mp4`
5. `CLASE 1/2.3 Bass line.mp4`
6. `CLASE 1/2.4 Loopcloud Intro.mp4`
7. `CLASE 2/3.1 Top Loops.mp4`
8. `CLASE 2/3.2 Synths y Categorias .mp4`
9. `CLASE 2/3.3 Percusion.mp4`
10. `CLASE 2/3.4 Shakers and Hi hat open.mp4`
11. `CLASE 3/3.5 Edit and mix.mp4`
12. `CLASE 3/3.6 Vocales.mp4`
13. `CLASE 3/3.7 Cmpression y rango dinamico.mp4`

Module states remain `AVAILABLE`, `IN PROGRESS`, `COMPLETED`, and `LOCKED`.

During staged publishing, an uploaded lesson remains accessible even if an earlier source module is still missing Stream UIDs. Once the preceding module is fully published, normal sequential completion gating applies. Demo mode keeps modules available.

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

All 13 source videos are now mapped to Cloudflare Stream:

| Source module | Lesson | UID | Title |
|---------------|--------|-----|-------|
| INTRO | L01 | `9bb8ec71e5f2cf3054979e77b65c1bba` | Intro Ableton · Parte 1 |
| INTRO | L02 | `50498c021ed78bf0913f4cac9fca9abf` | Intro Ableton · Parte 2 |
| CLASE 1 | L01 | `87da20f0d21e697054a3e84c0e6c78c7` | Kick / Snare / Hi Hat |
| CLASE 1 | L02 | `27ee0d56d12a968546d5b80da955fdbc` | Estructura |
| CLASE 1 | L03 | `4581cdfceeb66d354e3955f8ed1dcd2f` | Bass Line |
| CLASE 1 | L04 | `180062ebab5a977e26de4c795c7cd8bb` | Loopcloud Intro |
| CLASE 2 | L01 | `c6dc2d298f6d8e27d97e4d6d0a50328d` | Top Loops |
| CLASE 2 | L02 | `befcbb6d84febc96d250621c8cfa5e0f` | Synths y Categorías |
| CLASE 2 | L03 | `4ffdfd64e37d8b403a43b6edd512deb2` | Percusión |
| CLASE 2 | L04 | `86cbcecd235e9c28a79004a1d6996ccd` | Shakers y Hi-Hat Open |
| CLASE 3 | L01 | `88d5de963525591ca88cf6f0c58ac4ca` | Edit & Mix |
| CLASE 3 | L02 | `dc376fe4c26dec1815663f1a2b4792d6` | Vocales |
| CLASE 3 | L03 | `2d7916aade419637676f917cbcc14dce` | Compresión y rango dinámico |

### Ordered Cloudflare Upload

Use the repository helper from the machine that contains `~/dmf-media/source`:

```bash
export CLOUDFLARE_ACCOUNT_ID="<account-id>"
export CLOUDFLARE_STREAM_API_TOKEN="<token>"

bash scripts/upload-dmf-stream.sh
node scripts/apply-stream-map.cjs .dmf-stream-map.local.json

git diff -- public/academy-config.js
```

`upload-dmf-stream.sh`:
- uploads in Demian's exact source order
- reuses the existing Kick / Snare / Hi Hat UID instead of re-uploading it
- never writes or echoes the Cloudflare API token
- writes only the local `.dmf-stream-map.local.json` file, which is gitignored

`apply-stream-map.cjs` validates all 13 UIDs and updates `academy-config.js`. A complete map must end with 13 configured lessons and 0 pending lessons.

### Player

- **HLS.js** (loaded on demand from CDN) for non-Safari browsers
- **Native HLS** for Safari (via `canPlayType('application/vnd.apple.mpegurl')`)

### Signed Stream Playback — Production

The signer runs on a Cloudflare Worker so the Academy does not depend on billing-enabled Firebase Functions or Google Secret Manager.

Flow:

```
Firebase Auth user
→ POST <DMF_STREAM_SIGNER_URL>/stream-token with Firebase ID token
→ Worker validates the token with Firebase Auth REST
→ Firestore REST verifies enrollments/{uid} under the student's Security Rules
→ active enrollment required
→ Cloudflare Stream /token endpoint issues a 2-hour playback token
→ Academy uses the token in the HLS manifest URL
```

The Worker only signs the 13 known DMF video UIDs. It cannot mint tokens for arbitrary videos in the Cloudflare account.

### Fail-Closed Playback

The frontend is **fail-closed**: if the signer is unavailable, the user is not authenticated, or any error occurs in the signing flow, playback returns `null` and the player shows "Video no disponible." There is no public URL fallback.

Signed tokens are never logged (`console.log`/`console.warn`), never stored in `localStorage`, Firestore, or the DOM, and never placed in query parameters. The token is used exclusively to construct the HLS manifest URL passed to `hls.js` or native HLS.

### Signed Playback Production Status

All 13 Cloudflare Stream videos are protected with `requireSignedURLs: true`. Raw manifest requests return HTTP 401.

| Item | Status |
|------|--------|
| Videos with `requireSignedURLs: true` | **13 / 13** |
| Raw UID manifest requests blocked (HTTP 401) | **13 / 13** |
| Frontend fail-closed (no public URL fallback) | **Yes** |
| Worker signer operational | **Yes** |
| Worker validates: origin, Firebase Auth, enrollment, UID allowlist | **Yes** |
| Signed tokens: no logging, no storage, no DOM/query exposure | **Yes** |

### Manual Browser Smoke Test

> **Status: pending user confirmation**

To validate end-to-end signed playback in production, play one lesson from each module with a real enrolled account:

1. INTRO — any lesson
2. CLASE 1 — any lesson
3. CLASE 2 — any lesson
4. CLASE 3 — any lesson

Each lesson must load the HLS manifest via signed token and play without error.

### Worker deployment

From the repository:

```bash
cd workers/dmf-stream-signer
npx wrangler deploy
```

Then set the Worker secrets interactively:

```bash
npx wrangler secret put DMF_CLOUDFLARE_STREAM_API_TOKEN
npx wrangler secret put DMF_FIREBASE_API_KEY
```

Never put either value in `wrangler.toml`, source code, shell history, or the frontend.

Production now defaults to `https://dmf-stream-signer.vibraalto-cl.workers.dev`. `DMF_STREAM_SIGNER_URL` can still override that value for staging or future Worker migration.

## Security

- Signed URLs enforced for all 13 videos (`requireSignedURLs: true` on every Cloudflare Stream UID)
- `CLOUDFLARE_STREAM_API_TOKEN` never appears in frontend code
- `customer-*.cloudflarestream.com` domain never hardcoded in source
- CI validates: all 13 UIDs mapped, manifest pattern present, no secrets, no fallback, UID parity between config and Worker

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
| `DMF_STREAM_SIGNER_URL`   | (not set)                  | Cloudflare Worker signer base URL        |
| `DMF_ACADEMY_DEMO`        | (not set)                  | Set `true` to enable demo login mode     |
| `DMF_FIREBASE_API_KEY`    | (not set)                  | Firebase Web API key (dmf-academy)       |
| `DMF_FIREBASE_AUTH_DOMAIN`| `dmf-academy.firebaseapp.com` | Firebase Auth domain (dmf-academy)    |
| `DMF_FIREBASE_PROJECT_ID` | `dmf-academy`              | Firebase project ID for Auth + Firestore |
| `DMF_PAYMENTS_URL`        | `https://dmf-payments.vibraalto-cl.workers.dev` | Payments Worker base URL |
| `MP_ACCESS_TOKEN`          | —                          | Mercado Pago access token (Worker secret) |
| `MP_WEBHOOK_SECRET`        | —                          | Mercado Pago webhook secret (Worker secret) |
| `DMF_MP_ENVIRONMENT`       | `production`               | Checkout URL selector: `production` or `sandbox` |
| `DMF_FIREBASE_PRIVATE_KEY` | —                          | Firebase service account JSON (Worker secret) |
| `DMF_FIREBASE_WEB_API_KEY` | —                          | Firebase Web API key (Worker secret) |
| `PORT`                     | `3000`                     | Express server port (existing)           |

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
| `auth/user-disabled` | Invalid email or password. |

No error code reveals whether an email exists in the system, including disabled accounts.

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
- Active students can read/write only their own `progress/{uid}` document
- Progress writes are schema-limited to version, lessons and server timestamp fields
- Progress writes require an active enrollment
- All other collections are deny-by-default
- Enrollment grants are done by backend/admin only (not implemented yet)

## Firestore Rules Deployment

### Project Isolation

DMF uses **two separate Firebase configs** to prevent accidental cross-deployment:

| Config File | Firebase Project | Contains |
|-------------|-----------------|----------|
| `firebase.json` | `vibraaltoai-11f55` (via `.firebaserc`) | Hosting, Functions (dmfTraining) |
| `firebase.academy.json` | `dmf-academy` (via `--project` flag) | Firestore rules only |

`firebase.json` does **not** contain any Firestore configuration. This ensures
that even an accidental `firebase deploy` (which uses `.firebaserc` default =
`vibraaltoai-11f55`) cannot deploy Firestore rules to the wrong project.

### Deploy Command

The **only** correct command to deploy DMF Academy Firestore rules:

```bash
firebase deploy \
  --config firebase.academy.json \
  --only firestore:rules \
  --project dmf-academy
```

> **WARNING**: NEVER deploy DMF Academy Firestore rules with the default Firebase
> project. The `.firebaserc` default is `vibraaltoai-11f55` (Hosting). Using
> `firebase deploy --only firestore:rules` without `--config firebase.academy.json`
> and `--project dmf-academy` would target the wrong project.

### Unsafe Commands (NEVER use)

```bash
# WRONG — uses .firebaserc default (vibraaltoai-11f55)
firebase deploy --only firestore:rules

# WRONG — deploys everything to hosting project
firebase deploy
```

The CI/CD deploy workflow (`deploy.yml`) deploys **only Hosting** (and optionally
the dmfTraining function) to `vibraaltoai-11f55`. It does **not** deploy Firestore
rules. It does **not** reference `firebase.academy.json`. Firestore rules must be
deployed manually or via a separate workflow targeting `dmf-academy`.

## Progress Tracking

`ProgressStore` in `academy.html` is now local-first and Firestore-backed:
- Keeps an instant per-user browser cache under `dmf_progress_v3:{uid}`
- Uses Firestore document `progress/{uid}` as the cross-device copy
- Stores completion timestamps in the `lessons` map with schema version `3`
- Merges local and remote completion timestamps on login, preserving the newest completion for each lesson
- Debounces Firestore writes after a completion change
- Falls back to the local copy if Firestore is temporarily unavailable
- Automatically opens the first incomplete playable lesson when entering a module
- Marks a lesson complete at video end or when the student presses **Continuar →**

Progress is user-scoped. One browser account cannot read or write another student's progress document.

The previous `dmf_progress_v2` cache is intentionally not auto-migrated because it was not user-scoped and could contain another account's state on a shared browser.

## Mercado Pago — Checkout & Enrollment Bridge

Payment processing runs on a Cloudflare Worker (`dmf-payments`) that bridges Mercado Pago Checkout Pro with Firestore enrollment activation. No Firebase Functions billing is required.

### Architecture

```
Landing page (buy button)
→ Firebase Auth check (user must be signed in)
→ POST dmf-payments Worker /create-preference
  → Worker validates Firebase ID token
  → Creates checkoutSessions/{purchaseId} in Firestore (via service account)
  → Creates Mercado Pago Checkout Pro preference
  → Returns init_point URL to redirect user
→ User completes payment on Mercado Pago
→ Mercado Pago sends webhook to Worker /webhook/mercadopago
  → Worker verifies HMAC SHA-256 signature
  → Fetches payment details directly from MP API (never trusts webhook body)
  → Idempotent: checks payments/{paymentId} to prevent duplicates
  → If approved: creates enrollments/{uid} with status: 'active'
  → Updates checkoutSessions/{purchaseId} with result
→ payment-result.html polls /check-status until enrolled
→ User enters Academy
```

### Worker Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/health` | Origin | Health check |
| POST | `/create-preference` | Firebase ID token | Create MP checkout preference |
| POST | `/webhook/mercadopago` | HMAC signature | Receive payment notifications |
| GET | `/check-status` | Firebase ID token | Poll enrollment status |

### Products (server-side only)

| ID | Title | Price |
|----|-------|-------|
| `starter` | DMF Academy — Starter | $247 USD |
| `pro` | DMF Academy — Pro | $497 USD |
| `elite` | DMF Academy — Elite | $997 USD |
| `addon` | DMF Academy — Labels | $80 USD |

Prices and product definitions live only in the Worker. The frontend sends only `productId`.

### Security

- **MP_ACCESS_TOKEN** is a Worker secret — never in frontend or repository
- **MP_WEBHOOK_SECRET** is a Worker secret — used for HMAC verification
- **DMF_FIREBASE_PRIVATE_KEY** is a Worker secret — service account JSON for Firestore admin writes
- Webhook HMAC uses SHA-256 with Mercado Pago's `x-signature` + `x-request-id` headers
- Webhook `data.id` normalized to lowercase before HMAC manifest construction (per MP docs)
- Webhook uses signed `data.id` from query params — never the body's `data.id`
- Webhook signature timestamp validated with 5-minute replay window
- Payment status is verified via direct API call, never from webhook body alone
- Amount and currency verified against `expectedAmount`/`expectedCurrency` stored during preference creation
- Idempotency allows pending→approved transitions; duplicate only when enrollment already granted
- Enrollment is created only after verified `approved` payment with correct amount/currency
- All Firestore writes use `updateMask.fieldPaths` (merge-safe): each write only touches its own fields, preserving fields from prior writes
- `purchaseId` is an opaque UUID (`crypto.randomUUID()`) — no user data in URLs
- `checkoutSessions` and `payments` collections deny all client reads/writes
- `/check-status` requires Firebase ID token and verifies session ownership (`uid` match, fail-closed: missing uid returns 403)
- Payment result page polls server status — never trusts URL query parameters for access
- Purchase intent flow completes checkout directly after auth (calls `/create-preference`, redirects to MP)
- Account creation available on login page for new students (purchase intent preserved via sessionStorage)

### Firestore Collections

| Collection | Access | Purpose |
|------------|--------|---------|
| `checkoutSessions/{purchaseId}` | Worker only (admin) | Links purchaseId → uid, email, productId, status, expectedAmount, expectedCurrency, createdAt (initial); preferenceId, updatedAt (post-preference); paymentId, paymentStatus, enrolled, updatedAt (post-webhook) |
| `payments/{paymentId}` | Worker only (admin) | Idempotent payment record |
| `enrollments/{uid}` | Worker write, student read own | Active enrollment grant |

### Worker Deployment

The recommended payment product is **Mercado Pago Checkout Pro** because the DMF
plans are one-time purchases and payment data remains on Mercado Pago's hosted
checkout. Production and sandbox are deployed as separate Cloudflare Workers:
`dmf-payments` and `dmf-payments-sandbox`. Their Mercado Pago secrets are never
shared, and checkout sessions are tagged with `paymentEnvironment` so a webhook
cannot cross environments. The account-owner setup checklist, sandbox procedure,
and production cutover are documented in
[`workers/dmf-payments/README.md`](../workers/dmf-payments/README.md).

```bash
cd workers/dmf-payments
npx wrangler deploy
```

Then set secrets:

```bash
npx wrangler secret put MP_ACCESS_TOKEN
npx wrangler secret put MP_WEBHOOK_SECRET
npx wrangler secret put DMF_FIREBASE_PRIVATE_KEY
npx wrangler secret put DMF_FIREBASE_WEB_API_KEY
```

Configure the Mercado Pago webhook URL in the MP dashboard:
`https://dmf-payments.vibraalto-cl.workers.dev/webhook/mercadopago`

Never put any secret in `wrangler.toml`, source code, or the frontend.

## Production Gaps

- [x] Firebase Auth configuration (SDK loaded, initialized from env)
- [x] Auth separated from entitlement (Firestore check)
- [x] Module lock enforced on direct URL access
- [x] Build-time runtime config (inject-academy-env.cjs)
- [x] CI hardened for MP4/TS/M3U8 (excluding public/uploads/)
- [x] Cloudflare Stream hosting
- [x] Demian 13-video source order represented in Academy
- [x] Ordered Cloudflare upload + UID apply tooling
- [x] Upload and map all 13 source videos
- [x] Firestore security rules (deny client writes, user-scoped reads)
- [x] Firebase init guard (graceful failure)
- [x] Login error handling (non-enumerating)
- [x] Demo mode restricted to build-time only
- [x] Two-project architecture documented (Hosting vs Academy)
- [x] Firebase config isolation (firebase.academy.json separate from firebase.json)
- [x] Firestore enrollment documents linked to Mercado Pago payments
- [x] Payment webhook → entitlement grant flow
- [x] Server-side progress persistence (Firestore)
- [x] Signed playback URLs (Cloudflare Stream) — Production: fail-closed signer for all 13 videos; `requireSignedURLs: true` on all 13 Cloudflare Stream UIDs; raw manifest requests return HTTP 401
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
- Signed playback tokens never logged, stored, or exposed in DOM/query params
- Fail-closed playback: signer failure → no video, never public fallback
- All 13 videos require signed URLs at Cloudflare level (`requireSignedURLs: true`)

## CI Validation

`validate-academy` job in `.github/workflows/validate-3d.yml`:
1. Academy files exist (`login.html`, `academy.html`, `academy-config.js`)
2. 4 source modules / 13 lessons configured in Demian's exact source order
3. No media files (`.mp4`, `.ts`, `.m3u8`) in repository (excluding `public/uploads/`)
4. No secrets in frontend files
5. Firebase rewrites correct (academy routes before catch-all)
6. HLS stream URLs configurable (not hardcoded)
7. Cloudflare Stream UID mapping validated
8. No Cloudflare secrets or hardcoded domains in frontend
9. Firestore rules exist and enforce security (enrollments, deny writes)
10. `firebase.academy.json` exists with Firestore-only config (no hosting/functions/storage)
11. `firebase.json` does NOT contain Firestore config
12. `.firebaserc` default is `vibraaltoai-11f55`
13. Docs reference `firebase.academy.json` and `--project dmf-academy`
14. `deploy.yml` does not deploy Firestore or reference `firebase.academy.json`
15. No workflow deploys Firestore without `--project dmf-academy`
16. No frontend files reference `vibraaltoai-11f55` (hosting project)
17. Login does not allow demo via query string
18. No service account or admin credentials in frontend
19. Payments Worker files exist with Firebase Auth, HMAC webhook verification
20. Direct payment verification via MP API (never trusts webhook body alone)
21. Idempotent payment processing (payments collection)
22. Enrollment activation in Worker
23. Service account OAuth for Firestore admin writes
24. Products defined server-side with correct prices
25. No payment secrets (MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET, DMF_FIREBASE_PRIVATE_KEY) in frontend
26. CORS origin allowlist in payments Worker
27. Payment result page with server-side status polling
28. Checkout uses Worker endpoint (not Express)
29. DMF_PAYMENTS_URL in inject-academy-env.cjs
30. Account creation (createUserWithEmailAndPassword) in login
31. Firestore rules deny client writes on checkoutSessions and payments
32. Correct PKCS#8 PEM header (not RSA PRIVATE KEY)
33. Webhook uses signed dataId from signature verification
34. Webhook timestamp replay protection (5-minute window)
35. Amount/currency verification before enrollment grant
36. /check-status requires Firebase ID token with uid ownership check
37. Payment result page sends Authorization header with Firebase ID token
38. Merge-safe Firestore writes: `firestoreSet` uses `updateMask.fieldPaths` from `Object.keys(fields)`
39. `expectedAmount`/`expectedCurrency` in initial checkoutSession write (not dependent on MP response)
40. Post-preference write contains only `preferenceId` + `updatedAt`
41. Webhook denies enrollment when `expectedAmount` or `expectedCurrency` missing (session-integrity-error)
42. `/check-status` denies access when `uid` absent or mismatched (fail-closed 403)
43. Merge semantics simulation: sequential writes preserve fields from prior writes
