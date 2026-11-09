#!/usr/bin/env bash
# Cuts the source screen recordings into short clips for the reel.
# Private details (checkout e-mail, Stripe session URL) are blurred here,
# so the raw values never reach the repository.
# Usage: scripts/cut-clips.sh <dir-with-source-mp4s>
set -euo pipefail
SRC=${1:?source dir}
OUT="$(dirname "$0")/../public/clips"
mkdir -p "$OUT"
V1="$SRC/2026-11-09 02-18-39.mp4"   # plans + stripe checkout
V3="$SRC/2026-11-09 02-50-28.mp4"   # results + model picker

enc=(-an -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -r 30 -movflags +faststart)

ffmpeg -v error -y -ss 14 -t 11 -i "$V1" "${enc[@]}" "$OUT/plan.mp4"

# blur: address bar (whole width) and contact e-mail block
ffmpeg -v error -y -ss 30 -t 12.5 -i "$V1" -filter_complex "\
[0:v]split=3[base][a][b];\
[a]crop=1280:34:0:39,gblur=sigma=14:steps=3[ab];\
[b]crop=360:140:728:155,gblur=sigma=16:steps=3[eb];\
[base][ab]overlay=0:39[t];[t][eb]overlay=728:155" "${enc[@]}" "$OUT/coupon.mp4"

ffmpeg -v error -y -ss 6.5 -t 6.5 -i "$V3" "${enc[@]}" "$OUT/game.mp4"
ls -la "$OUT"
