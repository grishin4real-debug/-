"""Generates narrator voice-over, word timings, mouth envelope and SFX for the reel.

Voice backends:
  * ElevenLabs — used when ELEVENLABS_API_KEY is set (key needs the Text to Speech permission).
    Voice: ELEVENLABS_VOICE_ID (default: premade "Laura", works on the free plan), model: ELEVENLABS_MODEL_ID.
    Word timings come from the /with-timestamps alignment. Takes are cached in public/voice/<id>.json
    and reused while the text is unchanged.
  * piper (offline fallback) — usage: python3 scripts/voice.py <piper-binary> <voice.onnx>

Writes public/voice/*.wav and src/timeline.json.
"""
import array
import base64
import json
import math
import os
import pathlib
import re
import subprocess
import sys
import urllib.request
import wave

ROOT = pathlib.Path(__file__).resolve().parent.parent
FPS = 30
script = json.loads((ROOT / "script.json").read_text(encoding="utf-8"))
XI_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
XI_VOICE = os.environ.get("ELEVENLABS_VOICE_ID") or "FGY2WhTYpPnrIDTdsKH5"
XI_MODEL = os.environ.get("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2")
if not XI_KEY and len(sys.argv) < 3:
    sys.exit("usage: voice.py <piper-binary> <voice.onnx>  (or set ELEVENLABS_API_KEY)")

voice_dir = ROOT / "public" / "voice"
voice_dir.mkdir(parents=True, exist_ok=True)


def ffmpeg(*args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)


def elevenlabs(text, out):
    """Returns word start times (seconds) taken from the character alignment."""
    # mp3 works on every plan (pcm needs a paid tier); 1.2 is the API's max speed
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{XI_VOICE}/with-timestamps?output_format=mp3_44100_128",
        data=json.dumps({
            "text": text,
            "model_id": XI_MODEL,
            "voice_settings": {"stability": 0.35, "similarity_boost": 0.8, "style": 0.6, "use_speaker_boost": True, "speed": 1.2},
        }).encode(),
        headers={"xi-api-key": XI_KEY, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.load(r)
    raw = out.with_suffix(".raw.mp3")
    raw.write_bytes(base64.b64decode(data["audio_base64"]))
    tempo = float(script.get("tempo", 1.0))
    ffmpeg("-i", str(raw), "-af", f"atempo={tempo},silenceremove=start_periods=1:start_threshold=-45dB,loudnorm=I=-14:TP=-1.5",
           "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", str(out))
    raw.unlink()
    al = data.get("alignment") or {}
    chars, starts = al.get("characters", []), al.get("character_start_times_seconds", [])
    words, prev_space = [], True
    for ch, st in zip(chars, starts):
        if ch.isspace():
            prev_space = True
        elif prev_space:
            words.append(st)
            prev_space = False
    # timings follow the extra tempo change and the trimmed leading silence
    lead = words[0] if words else 0
    return [(t - lead) / tempo for t in words]


def piper(text, out):
    raw = out.with_suffix(".raw.wav")
    subprocess.run(
        [sys.argv[1], "-m", sys.argv[2], "-f", str(raw), "--length-scale", str(script.get("lengthScale", 0.85))],
        input=text.encode("utf-8"), check=True, capture_output=True,
    )
    # higher, faster, punchier "cartoon kid" delivery
    ffmpeg("-i", str(raw), "-af",
           "asetrate=22050*1.22,aresample=44100,atempo=0.92,"
           "acompressor=threshold=-20dB:ratio=4:attack=3:release=60,loudnorm=I=-14:TP=-1.5",
           "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", str(out))
    raw.unlink()
    return None


def tighten(path, max_gap=0.09, thresh=0.012):
    """Shortens every silence longer than max_gap (s) and trims both ends.

    Rewrites the wav in place and returns a function mapping old times to new
    ones. Idempotent: a second pass finds nothing to cut and maps identically.
    """
    with wave.open(str(path)) as w:
        sr = w.getframerate()
        pcm = array.array("h", w.readframes(w.getnframes()))
    win = sr // 100  # 10 ms
    loud = []
    for i in range(0, len(pcm), win):
        chunk = pcm[i:i + win]
        loud.append(math.sqrt(sum(x * x for x in chunk) / max(1, len(chunk))) / 32768 > thresh)
    keep = int(max_gap * 100)
    spans, i, n = [], 0, len(loud)
    while i < n:  # kept [start, end) in windows
        j = i
        while j < n and loud[j] == loud[i]:
            j += 1
        if loud[i]:
            spans.append((i, j))
        else:
            edge = i == 0 or j == n
            k = 1 if edge else keep  # trim ends almost fully
            if j - i <= k:
                spans.append((i, j))
            else:
                h = k // 2
                if i > 0:
                    spans.append((i, i + h))
                if j < n:
                    spans.append((j - (k - h), j))
        i = j
    out = array.array("h")
    table = []  # (old_start_s, old_end_s, new_start_s)
    for a, b in spans:
        table.append((a / 100, b / 100, len(out) / sr))
        out.extend(pcm[a * win:b * win])
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(out.tobytes())

    def remap(t):
        for a, b, ns in table:
            if t < b:
                return ns + max(0.0, t - a)
        return len(out) / sr
    return remap


scenes = []
for s in script["scenes"]:
    out = voice_dir / f"{s['id']}.wav"
    # Reuse committed ElevenLabs takes when the text and voice are unchanged:
    # saves API quota and lets keyless CI runs keep the ElevenLabs voice.
    meta = voice_dir / f"{s['id']}.json"
    cached = json.loads(meta.read_text(encoding="utf-8")) if meta.exists() else None
    if cached and out.exists() and cached["text"] == s["say"] and cached.get("tempo") == script.get("tempo", 1.0) \
            and (not XI_KEY or cached["voice"] == XI_VOICE):
        word_t = cached["words"]
    elif XI_KEY:
        word_t = elevenlabs(s["say"], out)
        meta.write_text(json.dumps({"text": s["say"], "voice": XI_VOICE, "tempo": script.get("tempo", 1.0), "words": word_t}, ensure_ascii=False), encoding="utf-8")
    else:
        word_t = piper(s["say"], out)
        meta.unlink(missing_ok=True)

    remap = tighten(out, float(script.get("maxGap", 0.09)))
    if word_t:
        word_t = [round(remap(t), 4) for t in word_t]
        if meta.exists():
            m = json.loads(meta.read_text(encoding="utf-8"))
            m["words"] = word_t
            meta.write_text(json.dumps(m, ensure_ascii=False), encoding="utf-8")

    with wave.open(str(out)) as w:
        sr = w.getframerate()
        pcm = array.array("h", w.readframes(w.getnframes()))
    hop = sr // FPS
    env = []
    for i in range(0, len(pcm), hop):
        chunk = pcm[i:i + hop]
        env.append(math.sqrt(sum(x * x for x in chunk) / max(1, len(chunk))) / 32768)
    peak = max(env) or 1
    mouth = [round(min(1.0, (e / peak) * 1.6), 3) for e in env]

    words = [w for w in re.split(r"\s+", s["say"].replace("—", " ")) if w]
    if word_t and len(word_t) >= len(words):
        starts = [round(t * FPS, 1) for t in word_t[:len(words)]]
    else:
        # estimate: spread words over the voiced span proportionally to their length
        voiced = [i for i, m in enumerate(mouth) if m > 0.12]
        a, b = (voiced[0], voiced[-1]) if voiced else (0, len(mouth))
        weights = [len(w) + 2 for w in words]
        tot, acc, starts = sum(weights), 0, []
        for wgt in weights:
            starts.append(round(a + (acc / tot) * (b - a), 1))
            acc += wgt

    lead, tail = int(script.get("leadFrames", 3)), int(script.get("tailFrames", 4))
    scenes.append({
        "id": s["id"],
        "title": s.get("title", []),
        "say": s["say"],
        "words": words,
        "wordStarts": starts,
        "voice": f"voice/{s['id']}.wav",
        "voiceFrom": lead,
        "frames": lead + len(mouth) + tail + int(s.get("extraFrames", 0)),
        "mouth": mouth,
    })

total = sum(s["frames"] for s in scenes)
meta = {k: script[k] for k in ("telegram",) if k in script}
(ROOT / "src" / "timeline.json").write_text(
    json.dumps({"fps": FPS, "total": total, "voiceBackend": "elevenlabs" if XI_KEY or all((voice_dir / f"{x['id']}.json").exists() for x in script["scenes"]) else "piper", **meta, "scenes": scenes}, ensure_ascii=False),
    encoding="utf-8",
)
print(f"backend {'elevenlabs' if XI_KEY else 'piper'}; total {total} frames = {total / FPS:.1f}s")
for s in scenes:
    print(f"  {s['id']:8s} {s['frames'] / FPS:5.1f}s")

# --- SFX, synthesised so there are no licensing questions ---
sfx = ROOT / "public" / "sfx"
sfx.mkdir(exist_ok=True)
def gen(args, name):
    ffmpeg(*args, "-ar", "44100", "-ac", "2", str(sfx / name))
gen(["-f", "lavfi", "-i", "anoisesrc=d=0.45:c=pink:a=0.6",
     "-af", "highpass=f=300,lowpass=f=6000,afade=t=in:d=0.25:curve=exp,afade=t=out:st=0.25:d=0.2,volume=0.7"], "whoosh.wav")
gen(["-f", "lavfi", "-i", "sine=f=2400:d=0.03", "-af", "afade=t=out:d=0.03,volume=0.8"], "click.wav")
gen(["-f", "lavfi", "-i", "sine=f=90:d=0.5", "-af", "afade=t=out:st=0.05:d=0.45:curve=exp,volume=2.2"], "boom.wav")
gen(["-f", "lavfi", "-i", "sine=f=1318:d=0.12", "-f", "lavfi", "-i", "sine=f=1976:d=0.35",
     "-filter_complex", "[0]afade=t=out:d=0.12[a];[1]adelay=90|90,afade=t=out:st=0.1:d=0.35[b];[a][b]amix=2,volume=1.4"], "ding.wav")
gen(["-f", "lavfi", "-i", "sine=f=660:d=0.06", "-af", "afade=t=out:d=0.06,volume=0.35"], "tick.wav")
