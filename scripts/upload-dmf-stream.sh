#!/usr/bin/env bash
set -euo pipefail

# Upload DMF Academy source videos to Cloudflare Stream in Demian's exact source order.
# Required:
#   export CLOUDFLARE_ACCOUNT_ID="..."
#   export CLOUDFLARE_STREAM_API_TOKEN="..."
# Optional:
#   export DMF_MEDIA_SOURCE="$HOME/dmf-media/source"
# Output: .dmf-stream-map.local.json
# The API token is never written to disk or echoed.

: "${CLOUDFLARE_ACCOUNT_ID:?Set CLOUDFLARE_ACCOUNT_ID}"
: "${CLOUDFLARE_STREAM_API_TOKEN:?Set CLOUDFLARE_STREAM_API_TOKEN}"

MEDIA_ROOT="${DMF_MEDIA_SOURCE:-$HOME/dmf-media/source}"
OUT_FILE=".dmf-stream-map.local.json"
TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

entries=(
  "intro-ableton-p1|INTRO ABLETON/1. Intro ableton p1.mp4|"
  "intro-ableton-p2|INTRO ABLETON/2. intro abeton pt2.mp4|"
  "clase1-kick-snare-hihat|CLASE 1/2.1 Kickk snare Hi Hat.mp4|87da20f0d21e697054a3e84c0e6c78c7"
  "clase1-estructura|CLASE 1/2.2 Estructura.mp4|"
  "clase1-bass-line|CLASE 1/2.3 Bass line.mp4|"
  "clase1-loopcloud-intro|CLASE 1/2.4 Loopcloud Intro.mp4|"
  "clase2-top-loops|CLASE 2/3.1 Top Loops.mp4|"
  "clase2-synths-categorias|CLASE 2/3.2 Synths y Categorias .mp4|"
  "clase2-percusion|CLASE 2/3.3 Percusion.mp4|"
  "clase2-shakers-open-hihat|CLASE 2/3.4 Shakers and Hi hat open.mp4|"
  "clase3-edit-mix|CLASE 3/3.5 Edit and mix.mp4|"
  "clase3-vocales|CLASE 3/3.6 Vocales.mp4|"
  "clase3-compresion-rango-dinamico|CLASE 3/3.7 Cmpression y rango dinamico.mp4|"
)

echo "DMF Academy · Cloudflare Stream upload"
echo "Source: $MEDIA_ROOT"
echo

for entry in "${entries[@]}"; do
  IFS='|' read -r key rel existing_uid <<< "$entry"

  if [[ -n "$existing_uid" ]]; then
    echo "✓ $key · already mapped"
    printf '%s\t%s\n' "$key" "$existing_uid" >> "$TMP_FILE"
    continue
  fi

  full="$MEDIA_ROOT/$rel"
  if [[ ! -f "$full" ]]; then
    echo "ERROR: source file not found: $full"
    exit 1
  fi

  bytes="$(stat -c '%s' "$full")"
  if (( bytes > 209715200 )); then
    echo "ERROR: file exceeds 200 MiB direct-upload safety limit: $rel"
    echo "Use Cloudflare Stream resumable/TUS upload for this file before continuing."
    exit 1
  fi

  echo "↑ Uploading: $rel"
  response="$(curl --fail-with-body -sS -X POST \
    "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/stream" \
    -H "Authorization: Bearer $CLOUDFLARE_STREAM_API_TOKEN" \
    -F "file=@$full")"

  uid="$(printf '%s' "$response" | python3 -c 'import json,sys; data=json.load(sys.stdin); print((data.get("result") or {}).get("uid") or "")')"

  if [[ ! "$uid" =~ ^[0-9a-fA-F]{32}$ ]]; then
    echo "ERROR: Cloudflare did not return a valid Stream UID for $rel"
    printf '%s\n' "$response" | python3 -m json.tool || true
    exit 1
  fi

  echo "✓ $key · $uid"
  printf '%s\t%s\n' "$key" "$uid" >> "$TMP_FILE"
done

python3 - "$TMP_FILE" "$OUT_FILE" <<'PY'
import json, sys
src, out = sys.argv[1:3]
mapping = {}
with open(src, encoding='utf-8') as fh:
    for line in fh:
        key, uid = line.rstrip('\n').split('\t', 1)
        mapping[key] = uid
with open(out, 'w', encoding='utf-8') as fh:
    json.dump(mapping, fh, indent=2)
    fh.write('\n')
print(f'Wrote {len(mapping)} mappings to {out}')
PY

echo
echo "Next:"
echo "  node scripts/apply-stream-map.cjs $OUT_FILE"
echo "  git diff -- public/academy-config.js"
