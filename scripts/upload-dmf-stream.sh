#!/usr/bin/env bash
set -euo pipefail

# Upload DMF Academy source videos to Cloudflare Stream in Demian's exact source order.
# Resumable behavior:
# - .dmf-stream-map.local.json is updated after every successful upload.
# - Already mapped videos are skipped on reruns.
# - Known UIDs from the first production upload are seeded if the map does not exist.
#
# Required:
#   export CLOUDFLARE_ACCOUNT_ID="..."
#   export CLOUDFLARE_STREAM_API_TOKEN="..."
# Optional:
#   export DMF_MEDIA_SOURCE="$HOME/dmf-media/source"
#
# The API token is never written to disk or echoed.

: "${CLOUDFLARE_ACCOUNT_ID:?Set CLOUDFLARE_ACCOUNT_ID}"
: "${CLOUDFLARE_STREAM_API_TOKEN:?Set CLOUDFLARE_STREAM_API_TOKEN}"

MEDIA_ROOT="${DMF_MEDIA_SOURCE:-$HOME/dmf-media/source}"
OUT_FILE=".dmf-stream-map.local.json"

entries=(
  "intro-ableton-p1|INTRO ABLETON/1. Intro ableton p1.mp4"
  "intro-ableton-p2|INTRO ABLETON/2. intro abeton pt2.mp4"
  "clase1-kick-snare-hihat|CLASE 1/2.1 Kickk snare Hi Hat.mp4"
  "clase1-estructura|CLASE 1/2.2 Estructura.mp4"
  "clase1-bass-line|CLASE 1/2.3 Bass line.mp4"
  "clase1-loopcloud-intro|CLASE 1/2.4 Loopcloud Intro.mp4"
  "clase2-top-loops|CLASE  2/3.1 Top Loops.mp4"
  "clase2-synths-categorias|CLASE  2/3.2 Synths y Categorias .mp4"
  "clase2-percusion|CLASE  2/3.3 Percusion.mp4"
  "clase2-shakers-open-hihat|CLASE  2/3.4 Shakers and Hi hat open.mp4"
  "clase3-edit-mix|CLASE 3/3.5 Edit and mix.mp4"
  "clase3-vocales|CLASE 3/3.6 Vocales.mp4"
  "clase3-compresion-rango-dinamico|CLASE 3/3.7 Cmpression y rango dinamico.mp4"
)

seed_map() {
  python3 - "$OUT_FILE" <<'PY'
import json, os, sys

path = sys.argv[1]
known = {
    "intro-ableton-p1": "9bb8ec71e5f2cf3054979e77b65c1bba",
    "intro-ableton-p2": "50498c021ed78bf0913f4cac9fca9abf",
    "clase1-kick-snare-hihat": "87da20f0d21e697054a3e84c0e6c78c7",
    "clase1-estructura": "27ee0d56d12a968546d5b80da955fdbc",
    "clase1-bass-line": "4581cdfceeb66d354e3955f8ed1dcd2f",
    "clase1-loopcloud-intro": "180062ebab5a977e26de4c795c7cd8bb",
}

mapping = {}
if os.path.exists(path):
    with open(path, encoding="utf-8") as fh:
        mapping = json.load(fh)

changed = False
for key, uid in known.items():
    if key not in mapping:
        mapping[key] = uid
        changed = True

if changed or not os.path.exists(path):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(mapping, fh, indent=2)
        fh.write("\n")
    os.replace(tmp, path)
PY
}

lookup_uid() {
  local key="$1"
  python3 - "$OUT_FILE" "$key" <<'PY'
import json, sys
path, key = sys.argv[1:3]
with open(path, encoding="utf-8") as fh:
    mapping = json.load(fh)
print(mapping.get(key, ""))
PY
}

save_uid() {
  local key="$1"
  local uid="$2"
  python3 - "$OUT_FILE" "$key" "$uid" <<'PY'
import json, os, sys
path, key, uid = sys.argv[1:4]
with open(path, encoding="utf-8") as fh:
    mapping = json.load(fh)
mapping[key] = uid
tmp = path + ".tmp"
with open(tmp, "w", encoding="utf-8") as fh:
    json.dump(mapping, fh, indent=2)
    fh.write("\n")
os.replace(tmp, path)
PY
}

seed_map

echo "DMF Academy · Cloudflare Stream resumable upload"
echo "Source: $MEDIA_ROOT"
echo "Map:    $OUT_FILE"
echo

for entry in "${entries[@]}"; do
  IFS='|' read -r key rel <<< "$entry"

  existing_uid="$(lookup_uid "$key")"
  if [[ "$existing_uid" =~ ^[0-9a-fA-F]{32}$ ]]; then
    echo "✓ $key · already mapped · $existing_uid"
    continue
  fi

  full="$MEDIA_ROOT/$rel"
  if [[ ! -f "$full" ]]; then
    echo "ERROR: source file not found: $full"
    echo "Progress already saved in $OUT_FILE"
    exit 1
  fi

  bytes="$(stat -c '%s' "$full")"
  if (( bytes > 209715200 )); then
    echo "ERROR: file exceeds 200 MiB direct-upload safety limit: $rel"
    echo "Use Cloudflare Stream resumable/TUS upload for this file before continuing."
    echo "Progress already saved in $OUT_FILE"
    exit 1
  fi

  echo "↑ Uploading: $rel"
  response="$(
    curl --fail-with-body -sS -X POST       "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/stream"       -H "Authorization: Bearer $CLOUDFLARE_STREAM_API_TOKEN"       -F "file=@$full"
  )"

  uid="$(
    printf '%s' "$response" |
      python3 -c 'import json,sys; data=json.load(sys.stdin); print((data.get("result") or {}).get("uid") or "")'
  )"

  if [[ ! "$uid" =~ ^[0-9a-fA-F]{32}$ ]]; then
    echo "ERROR: Cloudflare did not return a valid Stream UID for $rel"
    printf '%s\n' "$response" | python3 -m json.tool || true
    echo "Progress already saved in $OUT_FILE"
    exit 1
  fi

  save_uid "$key" "$uid"
  echo "✓ $key · $uid"
done

python3 - "$OUT_FILE" <<'PY'
import json, sys
path = sys.argv[1]
with open(path, encoding="utf-8") as fh:
    mapping = json.load(fh)

invalid = {k: v for k, v in mapping.items() if not isinstance(v, str) or len(v) != 32}
if invalid:
    raise SystemExit(f"Invalid UID entries: {invalid}")

print(f"Wrote {len(mapping)} mappings to {path}")
if len(mapping) != 13:
    raise SystemExit(f"Expected 13 mappings, found {len(mapping)}")
PY

echo
echo "Next:"
echo "  node scripts/apply-stream-map.cjs $OUT_FILE"
echo "  git diff -- public/academy-config.js"
