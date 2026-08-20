#!/usr/bin/env bash
set -uo pipefail

cd "$(dirname "$0")/.."
mkdir -p images

node scripts/list-image-filenames.js > /tmp/tarot-image-filenames.txt

FAILED=0
OK=0
FAILED_FILES=()

# Wikimedia Commons rate-limits rapid sequential requests (observed HTTP 429
# after ~10-15 quick requests). Space requests out and retry with backoff.
REQUEST_DELAY=0.8
MAX_RETRIES=3

# Wikimedia Commons stores the pentacles suit under the abbreviation "Pents"
# (e.g. Pents01.jpg), not "Pentacles" (data/tarot-data.js's SUIT_LABEL uses
# "Pentacles" to build the local/expected filename, e.g. Pentacles01.jpg).
# Map local filename -> actual Commons filename to fetch, without touching
# data/tarot-data.js. All other filenames (major arcana, wands/cups/swords)
# match Commons exactly and need no mapping.
remote_filename_for() {
  local filename="$1"
  case "$filename" in
    Pentacles*.jpg)
      echo "Pents${filename#Pentacles}"
      ;;
    *)
      echo "$filename"
      ;;
  esac
}

download_one() {
  local filename="$1"
  local remote_name
  remote_name=$(remote_filename_for "$filename")
  local encoded
  encoded=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$remote_name")
  local url="https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}"
  local attempt=1
  local status

  while [ "$attempt" -le "$MAX_RETRIES" ]; do
    status=$(curl -sS -L -o "images/$filename" -w "%{http_code}" "$url" || echo "000")

    if [ "$status" = "200" ] && [ -s "images/$filename" ]; then
      return 0
    fi

    rm -f "images/$filename"

    if [ "$status" = "429" ]; then
      backoff=$((attempt * 5))
      echo "  429 rate-limited on $filename (attempt $attempt/$MAX_RETRIES), waiting ${backoff}s..." >&2
      sleep "$backoff"
    else
      echo "  HTTP $status on $filename (attempt $attempt/$MAX_RETRIES), retrying after 2s..." >&2
      sleep 2
    fi

    attempt=$((attempt + 1))
  done

  return 1
}

while IFS= read -r filename; do
  [ -z "$filename" ] && continue

  if [ -f "images/$filename" ] && [ -s "images/$filename" ]; then
    OK=$((OK+1))
    continue
  fi

  if download_one "$filename"; then
    echo "OK: $filename"
    OK=$((OK+1))
  else
    echo "FAILED: $filename"
    rm -f "images/$filename"
    FAILED=$((FAILED+1))
    FAILED_FILES+=("$filename")
  fi

  # Be polite to Commons regardless of outcome.
  sleep "$REQUEST_DELAY"
done < /tmp/tarot-image-filenames.txt

echo "---"
echo "성공: $OK, 실패: $FAILED"

if [ "$FAILED" -gt 0 ]; then
  echo "실패 목록:"
  for f in "${FAILED_FILES[@]}"; do
    echo "  $f"
  done
fi
