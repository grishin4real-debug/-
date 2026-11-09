# Рилс: Opus 5.5 + GPT 6.1 бесплатно (Remotion)

Вертикальный ролик 1080×1920, ~57 с. Собирается кодом на [Remotion](https://www.remotion.dev/).

- `script.json` — текст озвучки и заголовки по сценам.
- `scripts/cut-clips.sh <папка-с-исходниками>` — режет записи экрана на клипы; e-mail и URL оплаты размываются на этом шаге.
- `scripts/voice.py <piper> <voice.onnx>` — озвучка, тайминги слов, огибающая для губ, звуки → `src/timeline.json`. Если заданы `ELEVENLABS_API_KEY` (ключ с правом Text to Speech) и `ELEVENLABS_VOICE_ID`, голос берётся из ElevenLabs, иначе — piper.
- `npm run studio` — редактор с превью, `npm run render` — рендер в `out/reel.mp4`.
- `node scripts/stills.mjs 40 300` — быстрые кадры для проверки.

GitHub Actions (`.github/workflows/reel.yml`) пересобирает озвучку и ролик при изменениях в `reel/` и выкладывает mp4 как артефакт `reel`.
Свою музыку можно положить в `public/` и добавить `<Html5Audio>` в `src/Reel.jsx`.
