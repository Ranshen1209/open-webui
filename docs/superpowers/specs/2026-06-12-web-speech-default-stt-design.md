# Web Speech as Default STT (drop Whisper default) — Design

Date: 2026-06-12
Branch: `theme/sakrylle`
Status: Approved, ready for implementation plan

## Goal

Make **browser-native speech recognition (Web Speech API)** the default
speech-to-text (STT) engine for Sakrylle Web, so that voice input and voice
mode work without running Whisper on the server. Cloud STT engines
(openai / deepgram / azure / mistral) remain available for admins to select.

## Background / Current State

STT engine resolution today:

- Backend config `AUDIO_STT_ENGINE` default is `''` (`config.py:2330`).
  Empty string = local Whisper via `faster_whisper.WhisperModel`
  (`routers/audio.py:169`), running on the server. The model (`base`) is
  downloaded to `WHISPER_MODEL_DIR` on first use and inference runs on
  server CPU/GPU.
- The per-user Settings → Voice dropdown offers only `Default` (`''`) and
  `Web API` (`web`) (`Settings/Audio.svelte:192-193`).
- Frontend decides browser-vs-server STT by checking
  `$config.audio.stt.engine === 'web'` OR the per-user override.

Two consumers of STT:

1. **Voice input** (mic button) — `MessageInput/VoiceRecording.svelte`.
   Already honors `web`: when engine is `web` and the browser supports
   `SpeechRecognition`, it transcribes in-browser (`VoiceRecording.svelte:301`).
2. **Voice mode** (call overlay) — `MessageInput/CallOverlay.svelte`.
   Does **not** honor `web`. It always uploads recorded audio to the backend
   `transcribeAudio` endpoint (`CallOverlay.svelte:167`). The backend
   `transcribe` has no branch for `web` (`audio.py:884-893`), so with a `web`
   default, voice mode would silently fail to transcribe.

## Decisions

- Default STT engine becomes `web` at both the code-default and deployed-server
  levels.
- Voice mode is patched to also use browser `SpeechRecognition` when the engine
  is `web`, so both voice input and voice mode are Whisper-free.
- Whisper code and the cloud STT branches are **kept** — Whisper is simply no
  longer the default; cloud engines remain admin-selectable.

## Changes

### 1. Backend default engine (`backend/open_webui/config.py`)

`AUDIO_STT_ENGINE` default `''` → `'web'` (line ~2330).

Effect: on a fresh DB, the served `$config.audio.stt.engine` is `web`. Whisper
is not loaded at startup because `if STT_ENGINE == ''` (`audio.py:302`) no
longer holds. Cloud engine branches are untouched.

Note: `ConfigVar` defaults only apply on fresh initialization. Already-running
servers keep their persisted DB value unless overridden by env var — hence
change 2.

### 2. Deploy env (`deploy/docker-compose.sakrylle-web.yml`)

Add `AUDIO_STT_ENGINE=web` to the service `environment`. Env vars have highest
precedence, so this flips the already-deployed server regardless of its
persisted config value.

### 3. Voice input (`VoiceRecording.svelte`)

No change required. Already branches on `$config.audio.stt.engine === 'web'`.

### 4. Voice mode (`CallOverlay.svelte`)

Browser `SpeechRecognition` only transcribes a live mic, not a recorded blob,
so the existing VAD → blob → backend-upload path cannot be reused as-is for
`web`. Design:

- Keep the existing VAD logic as the **turn segmenter** (decides when an
  utterance ends; trigger timing unchanged).
- On call start, if engine is `web` and `SpeechRecognition` /
  `webkitSpeechRecognition` is available, start a `continuous`
  `SpeechRecognition` that accumulates the transcript (mirroring the pattern in
  `VoiceRecording.svelte:302-357`).
- In `transcribeHandler`, add a branch: when engine is `web`, **skip** the
  `transcribeAudio` backend upload; instead take the transcript accumulated for
  the current utterance, `submitPrompt(text)`, then reset the per-utterance
  transcript buffer.
- Engine resolution mirrors VoiceRecording:
  `$config.audio.stt.engine === 'web' || ($settings?.audio?.stt?.engine ?? '') === 'web'`.
- Unsupported browser (no `SpeechRecognition`): show a `toast` error and exit
  the call gracefully — do not fail silently.
- Tear down the `SpeechRecognition` instance when the call ends / audio stream
  stops, alongside existing cleanup.

## Out of Scope (YAGNI)

- Removing Whisper / `faster-whisper` from the codebase or requirements. It
  stays as a selectable engine.
- Any TTS change. TTS default is already browser speech synthesis and does not
  depend on Whisper.
- New UI/settings. The existing `Default` / `Web API` dropdown is sufficient.

## Risks

- VAD end-of-utterance and `SpeechRecognition` final-result timing may differ
  slightly; an utterance's trailing words could occasionally land in the next
  turn. Acceptable for v1; revisit if it proves disruptive.
- Web Speech quality/availability is browser-dependent (e.g. Chrome routes to
  an online Google service and needs connectivity; some browsers lack the API).
  This is the accepted trade-off for dropping server-side Whisper.

## Verification

- Fresh build serves `$config.audio.stt.engine === 'web'`.
- Server startup does not load the Whisper model.
- Voice input (mic) transcribes in-browser.
- Voice mode (call) transcribes in-browser via `SpeechRecognition` and submits
  each utterance; unsupported browsers get a clear toast.
- Admin can still switch to a cloud engine and have both paths upload to the
  backend.
