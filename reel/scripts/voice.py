"""Generates narrator voice-over + mouth envelope + SFX for the reel.

Requires: piper (pip install piper-tts), a Russian piper voice, ffmpeg.
Usage: python3 scripts/voice.py <piper-binary> <voice.onnx>
Writes public/voice/*.wav and src/timeline.json.
"""
import array
import json
import math
import pathlib
import subprocess
import sys
import wave

ROOT = pathlib.Path(__file__).resolve().parent.parent
FPS = 30
PIPER, MODEL = sys.argv[1], sys.argv[2]
script = json.loads((ROOT / "script.json").read_text(encoding="utf-8"))

voice_dir = ROOT / "public" / "voice"
voice_dir.mkdir(parents=True, exist_ok=True)
scenes = []
for s in script["scenes"]:
    raw = voice_dir / f"{s['id']}.raw.wav"
    out = voice_dir / f"{s['id']}.wav"
    subprocess.run(
        [PIPER, "-m", MODEL, "-f", str(raw), "--length-scale", str(script.get("lengthScale", 0.9))],
        input=s["say"].encode("utf-8"), check=True, capture_output=True,
    )
    # slightly higher, punchier "cartoon" voice
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-i", str(raw),
        "-af", "asetrate=22050*1.08,aresample=44100,atempo=0.96,"
               "acompressor=threshold=-18dB:ratio=3:attack=5:release=80,loudnorm=I=-15:TP=-1.5",
        "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", str(out),
    ], check=True)
    raw.unlink()

    with wave.open(str(out)) as w:
        sr = w.getframerate()
        pcm = array.array("h", w.readframes(w.getnframes()))
    hop = sr // FPS
    env = []
    for i in range(0, len(pcm), hop):
        chunk = pcm[i:i + hop]
        rms = math.sqrt(sum(x * x for x in chunk) / max(1, len(chunk))) / 32768
        env.append(rms)
    peak = max(env) or 1
    mouth = [round(min(1.0, (e / peak) * 1.6), 3) for e in env]
    lead, tail = 8, int(script.get("tailFrames", 14))
    scenes.append({
        "id": s["id"],
        "title": s.get("title", []),
        "say": s["say"],
        "voice": f"voice/{s['id']}.wav",
        "voiceFrom": lead,
        "frames": lead + len(mouth) + tail + int(s.get("extraFrames", 0)),
        "mouth": mouth,
    })

total = sum(s["frames"] for s in scenes)
(ROOT / "src" / "timeline.json").write_text(json.dumps({"fps": FPS, "total": total, "scenes": scenes}), encoding="utf-8")
print(f"total {total} frames = {total / FPS:.1f}s")
for s in scenes:
    print(f"  {s['id']:8s} {s['frames'] / FPS:5.1f}s")

# --- SFX, synthesised so there are no licensing questions ---
sfx = ROOT / "public" / "sfx"
sfx.mkdir(exist_ok=True)
def ff(args, name):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args, "-ar", "44100", "-ac", "2", str(sfx / name)], check=True)
ff(["-f", "lavfi", "-i", "anoisesrc=d=0.45:c=pink:a=0.6",
    "-af", "highpass=f=300,lowpass=f=6000,afade=t=in:d=0.25:curve=exp,afade=t=out:st=0.25:d=0.2,volume=0.7"], "whoosh.wav")
ff(["-f", "lavfi", "-i", "sine=f=2400:d=0.03", "-af", "afade=t=out:d=0.03,volume=0.8"], "click.wav")
ff(["-f", "lavfi", "-i", "sine=f=90:d=0.5", "-af", "asetrate=44100*1.0,afade=t=out:st=0.05:d=0.45:curve=exp,volume=2.2"], "boom.wav")
