# DMF Stream Signer

Cloudflare Worker used to mint temporary Cloudflare Stream playback tokens for authenticated DMF Academy students.

## Secrets

Set these interactively. Never commit their values:

```bash
npx wrangler secret put DMF_CLOUDFLARE_STREAM_API_TOKEN
```

## Deploy

```bash
cd workers/dmf-stream-signer
npx wrangler deploy
```

The Worker verifies the Firebase ID token through Firebase Auth REST, checks `enrollments/{uid}` through Firestore REST using the same user token and Security Rules, then requests a 2-hour Cloudflare Stream token for one of the 13 known DMF lesson UIDs.

## Firebase Web API key

The DMF Academy Firebase Web API key is public client configuration and is stored as the Wrangler variable `DMF_FIREBASE_WEB_API_KEY` in `wrangler.toml`. It is not a privileged credential. The Cloudflare Stream API token remains a Worker secret.
