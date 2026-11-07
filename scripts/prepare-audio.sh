#!/usr/bin/env bash
# Prepare native-speaker recordings for the app.
#   scripts/prepare-audio.sh path/to/raw-recordings
# Each raw file must be named after a phrase or sentence id (e.g. weebale.wav, s-kale-weebale.m4a).
# Output: assets/audio/<id>.m4a — mono, 44.1 kHz, loudness-normalised to -16 LUFS, AAC 48 kbps (~6 KB per second).
# AAC/.m4a plays on iOS, Android and the web. Set FORMAT=opus to also write .opus files (Android/web only).
set -euo pipefail
SRC="${1:?usage: scripts/prepare-audio.sh <folder with raw recordings>}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/assets/audio"
mkdir -p "$OUT"
shopt -s nullglob nocaseglob
for f in "$SRC"/*.{wav,m4a,mp3,aac,flac,ogg,opus}; do
  id="$(basename "${f%.*}")"
  ffmpeg -loglevel error -y -i "$f" \
    -af "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11" \
    -ac 1 -ar 44100 -c:a aac -b:a 48k "$OUT/$id.m4a"
  if [ "${FORMAT:-}" = "opus" ]; then
    ffmpeg -loglevel error -y -i "$OUT/$id.m4a" -c:a libopus -b:a 32k "$OUT/$id.opus"
  fi
  echo "✓ $id"
done
node "$(dirname "$0")/audio-manifest.mjs"
