# Web Speech as Default STT — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the browser Web Speech API the default STT engine so voice input and voice mode work without server-side Whisper, while keeping cloud STT engines admin-selectable.

**Architecture:** Flip the `AUDIO_STT_ENGINE` default to `web` (code default + deploy env). Voice input already honors `web`. Patch the voice-mode call overlay to transcribe via browser `SpeechRecognition` (live mic) instead of uploading audio to the backend, reusing the existing VAD as the turn segmenter.

**Tech Stack:** SvelteKit frontend, FastAPI backend, Web Speech API (`SpeechRecognition`), Docker Compose deploy.

**Spec:** `docs/superpowers/specs/2026-06-12-web-speech-default-stt-design.md`

---

## Testing Note

The core behavior depends on the browser `SpeechRecognition` API and live mic
input, which cannot be meaningfully unit-tested in Vitest (no component tests
exist for `CallOverlay.svelte`, and the API is unavailable in the test
environment). The automated gate for the frontend is `npm run check`
(svelte-check / type check). Behavioral correctness is verified manually in a
browser per the verification task. The backend change is a one-line config
default verified by inspection + a running-server check.

---

## File Structure

- `backend/open_webui/config.py` — change `AUDIO_STT_ENGINE` default to `web`.
- `deploy/docker-compose.sakrylle-web.yml` — add `AUDIO_STT_ENGINE=web` env.
- `src/lib/components/chat/MessageInput/CallOverlay.svelte` — add browser
  `SpeechRecognition` path for voice mode.

---

## Task 1: Backend default STT engine → `web`

**Files:**
- Modify: `backend/open_webui/config.py` (around line 2330)

- [ ] **Step 1: Change the default**

Find:

```python
AUDIO_STT_ENGINE = ConfigVar(
    'AUDIO_STT_ENGINE',
    'audio.stt.engine',
    os.getenv('AUDIO_STT_ENGINE', ''),
```

Change the default from `''` to `'web'`:

```python
AUDIO_STT_ENGINE = ConfigVar(
    'AUDIO_STT_ENGINE',
    'audio.stt.engine',
    os.getenv('AUDIO_STT_ENGINE', 'web'),
```

- [ ] **Step 2: Verify the change by inspection**

Run: `grep -n "AUDIO_STT_ENGINE', '" backend/open_webui/config.py`
Expected: the `os.getenv('AUDIO_STT_ENGINE', 'web')` line shows `'web'`.

- [ ] **Step 3: Commit**

```bash
git add backend/open_webui/config.py
git commit -m "feat(audio): default STT engine to web (browser) instead of Whisper"
```

---

## Task 2: Deploy env override

**Files:**
- Modify: `deploy/docker-compose.sakrylle-web.yml`

- [ ] **Step 1: Inspect the service environment block**

Run: `grep -n "environment\|WEBUI_NAME\|OPENID\|DATA_DIR" deploy/docker-compose.sakrylle-web.yml`
Expected: locate the `environment:` key under the web service. (If there is no
`environment:` block, add one under the service alongside the existing keys.)

- [ ] **Step 2: Add the env var**

Add this line inside the service `environment:` mapping (match the file's
existing indentation and quoting style):

```yaml
      - AUDIO_STT_ENGINE=web
```

If the file uses map style (`KEY: value`) instead of list style, add:

```yaml
      AUDIO_STT_ENGINE: web
```

- [ ] **Step 3: Verify YAML is valid**

Run: `python3 -c "import yaml,sys; yaml.safe_load(open('deploy/docker-compose.sakrylle-web.yml')); print('ok')"`
Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add deploy/docker-compose.sakrylle-web.yml
git commit -m "chore(deploy): set AUDIO_STT_ENGINE=web for deployed server"
```

---

## Task 3: Voice mode — add browser SpeechRecognition state & helpers

**Files:**
- Modify: `src/lib/components/chat/MessageInput/CallOverlay.svelte`

- [ ] **Step 1: Add state variables**

After the existing audio state declarations (after line `let audioChunks = [];`,
~line 46), add:

```js
	let speechRecognition = null;
	let webSpeechTranscript = '';
```

- [ ] **Step 2: Add the engine-resolution helper and recognition helpers**

Immediately above `const transcribeHandler = async (audioBlob) => {` (~line 157),
add:

```js
	const isWebSTT = () =>
		($config?.audio?.stt?.engine ?? '') === 'web' ||
		($settings?.audio?.stt?.engine ?? '') === 'web';

	const startWebSpeechRecognition = () => {
		if (speechRecognition) return true;

		if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
			toast.error($i18n.t('Speech recognition is not supported in this browser.'));
			return false;
		}

		speechRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
		speechRecognition.continuous = true;
		speechRecognition.interimResults = false;

		const lang = $settings?.audio?.stt?.language;
		if (lang) {
			speechRecognition.lang = lang;
		}

		speechRecognition.onresult = (event) => {
			for (let i = event.resultIndex; i < event.results.length; i++) {
				if (event.results[i].isFinal) {
					webSpeechTranscript = `${webSpeechTranscript}${event.results[i][0].transcript}`;
				}
			}
		};

		speechRecognition.onerror = (event) => {
			console.log('Web speech recognition error:', event);
			if (event.error !== 'no-speech' && event.error !== 'aborted') {
				toast.error($i18n.t(`Speech recognition error: {{error}}`, { error: event.error }));
			}
		};

		speechRecognition.onend = () => {
			// Keep recognition continuous for the duration of the call.
			if ($showCallOverlay && speechRecognition) {
				try {
					speechRecognition.start();
				} catch (error) {
					console.log('Web speech recognition restart failed:', error);
				}
			}
		};

		try {
			speechRecognition.start();
		} catch (error) {
			console.log('Web speech recognition start failed:', error);
		}
		return true;
	};

	const stopWebSpeechRecognition = () => {
		if (speechRecognition) {
			const recognition = speechRecognition;
			speechRecognition = null; // null first so onend does not restart
			try {
				recognition.stop();
			} catch (error) {
				console.log('Error stopping web speech recognition:', error);
			}
		}
		webSpeechTranscript = '';
	};
```

- [ ] **Step 3: Type-check**

Run: `npm run check`
Expected: no new errors referencing `CallOverlay.svelte`. (Pre-existing
warnings elsewhere are acceptable; confirm none are newly introduced in this
file.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/chat/MessageInput/CallOverlay.svelte
git commit -m "feat(call): add browser SpeechRecognition helpers for web STT"
```

---

## Task 4: Voice mode — wire recognition into recording, transcription, teardown

**Files:**
- Modify: `src/lib/components/chat/MessageInput/CallOverlay.svelte`

- [ ] **Step 1: Use the transcript in `transcribeHandler`**

Replace the body of `transcribeHandler` (currently lines ~157-184):

```js
	const transcribeHandler = async (audioBlob) => {
		// Create a blob from the audio chunks
		if (!audioBlob || audioBlob.size < 100) {
			console.log('Audio blob too small or empty, skipping transcription');
			return;
		}

		await tick();
		const file = blobToFile(audioBlob, 'recording.wav');

		const res = await transcribeAudio(
			localStorage.token,
			file,
			$settings?.audio?.stt?.language
		).catch((error) => {
			toast.error(`${error}`);
			return null;
		});

		if (res) {
			console.log(res.text);

			if (res.text !== '') {
				const _responses = await submitPrompt(res.text, { _raw: true });
				console.log(_responses);
			}
		}
	};
```

with (note: the web branch runs BEFORE the blob-size guard so the per-utterance
transcript is always consumed and reset):

```js
	const transcribeHandler = async (audioBlob) => {
		await tick();

		// Browser-native STT (Web Speech API): use the transcript accumulated by
		// SpeechRecognition instead of uploading audio to the backend.
		if (isWebSTT()) {
			const text = webSpeechTranscript.trim();
			webSpeechTranscript = '';
			if (text !== '') {
				const _responses = await submitPrompt(text, { _raw: true });
				console.log(_responses);
			}
			return;
		}

		// Create a blob from the audio chunks
		if (!audioBlob || audioBlob.size < 100) {
			console.log('Audio blob too small or empty, skipping transcription');
			return;
		}

		const file = blobToFile(audioBlob, 'recording.wav');

		const res = await transcribeAudio(
			localStorage.token,
			file,
			$settings?.audio?.stt?.language
		).catch((error) => {
			toast.error(`${error}`);
			return null;
		});

		if (res) {
			console.log(res.text);

			if (res.text !== '') {
				const _responses = await submitPrompt(res.text, { _raw: true });
				console.log(_responses);
			}
		}
	};
```

- [ ] **Step 2: Start recognition when recording starts**

In `startRecording`, after `analyseAudio(audioStream);` (~line 267) and before
the closing brace of the `if ($showCallOverlay)` block, add:

```js
			if (isWebSTT()) {
				startWebSpeechRecognition();
			}
```

Resulting tail of `startRecording`:

```js
			analyseAudio(audioStream);

			if (isWebSTT()) {
				startWebSpeechRecognition();
			}
		}
	};
```

- [ ] **Step 3: Tear down recognition in `stopAudioStream`**

In `stopAudioStream` (~line 271), add the teardown call at the start of the
function body, before the `try { if (mediaRecorder) ... }` block:

```js
	const stopAudioStream = async () => {
		stopWebSpeechRecognition();

		try {
			if (mediaRecorder) {
				mediaRecorder.stop();
			}
		} catch (error) {
			console.log('Error stopping audio stream:', error);
		}
```

(`stopAudioStream` is already invoked by both the `onMount` cleanup return and
`onDestroy`, so this covers all call-teardown paths.)

- [ ] **Step 4: Type-check**

Run: `npm run check`
Expected: no new errors referencing `CallOverlay.svelte`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/chat/MessageInput/CallOverlay.svelte
git commit -m "feat(call): transcribe voice mode via browser SpeechRecognition when web STT"
```

---

## Task 5: Verification (manual browser + server)

**Files:** none (verification only)

- [ ] **Step 1: Frontend type/lint gate**

Run: `npm run check`
Expected: completes with no new errors in `CallOverlay.svelte`.

- [ ] **Step 2: Dev server — config served as `web`**

Run: `npm run dev` (and a backend, or rely on `$config` default). In the
browser devtools console on a loaded page, evaluate the served config or open
Settings → Voice; the STT engine effective default should resolve to Web API.
Expected: `$config.audio.stt.engine === 'web'`.

- [ ] **Step 3: Voice input (mic button)**

In a Chromium-based browser, click the mic button in the message input, speak,
and confirm text is transcribed into the input without any network call to
`/api/v1/audio/transcriptions` (check Network tab — there should be none for
transcription).
Expected: transcription appears; no backend transcription request.

- [ ] **Step 4: Voice mode (call overlay)**

Open voice mode (call button), speak an utterance, pause.
Expected: the utterance is transcribed in-browser and submitted as a prompt; no
`/api/v1/audio/transcriptions` request in the Network tab; the assistant
responds. Speak a second utterance and confirm it is treated as a separate turn
(previous transcript not duplicated).

- [ ] **Step 5: Unsupported-browser path (optional)**

In a browser without `SpeechRecognition` (or by temporarily stubbing it away),
open voice mode.
Expected: a toast "Speech recognition is not supported in this browser." and no
silent hang.

- [ ] **Step 6: Server does not load Whisper (optional, if running backend)**

Start the backend fresh (fresh DB or with `AUDIO_STT_ENGINE=web`).
Expected: no Whisper model download/initialization at startup (the
`set_faster_whisper_model` path under `if STT_ENGINE == ''` is skipped).

- [ ] **Step 7: Cloud engine still works (optional)**

In Admin Settings → Audio, switch STT engine to `openai` (with a key) or back to
default Whisper.
Expected: both voice input and voice mode upload audio to the backend again and
transcribe via the selected engine — confirming the cloud/Whisper paths are
preserved.
