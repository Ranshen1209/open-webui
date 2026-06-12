# Hide All STT/TTS Entry Points Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide every STT/TTS UI entry point behind a single frontend constant `HIDE_VOICE_FEATURES` that defaults to `true` (voice off by default), leaving backend and components intact.

**Architecture:** Add one build-time constant in `src/lib/constants.ts`. Each entry point imports it and wraps its rendered button/trigger in `{#if !HIDE_VOICE_FEATURES}`, or (for the settings tab lists) filters the `audio` tab out of the tab array. No components, routes, config, or deps are deleted.

**Tech Stack:** SvelteKit frontend, Svelte `{#if}` blocks, ES module constant.

**Spec:** `docs/superpowers/specs/2026-06-12-hide-voice-features-design.md`

---

## Execution Order & Parallelism

- **Task 1 must run first** — every other task imports the constant it adds.
- **Tasks 2–9 are independent files** and can run in parallel (different files, no shared state).
- **Task 10 (verification) runs last**, after all others merge.

## Testing Note

These are UI-visibility changes gated by a build-time constant; there are no
component unit tests for these files and the behavior (rendered/not-rendered)
is not meaningfully unit-testable in the existing Vitest setup. The automated
gate is `npm run check` (svelte-check, must stay at 0 errors) plus a grep-based
check that no gated anchor renders unguarded. Behavior is confirmed by the
manual visual pass in Task 10.

## File Structure

- `src/lib/constants.ts` — add `HIDE_VOICE_FEATURES` constant (Task 1).
- `src/lib/components/chat/MessageInput.svelte` — mic + voice-mode buttons (Task 2).
- `src/lib/components/channel/MessageInput.svelte` — mic button (Task 3).
- `src/lib/components/notes/NoteEditor.svelte` — record menu trigger (Task 4).
- `src/lib/components/workspace/Knowledge/KnowledgeBase/AddTextContentModal.svelte` — mic button (Task 5).
- `src/lib/components/chat/Messages/ResponseMessage.svelte` — read-aloud button (Task 6).
- `src/lib/components/chat/SettingsModal.svelte` — remove user "Audio/Voice" tab (Task 7).
- `src/lib/components/admin/Settings.svelte` — remove admin "Audio" tab + guard route (Task 8).
- `src/lib/components/chat/Chat.svelte` — gate alternate voice-mode entry points (Task 9).

---

## Task 1: Add the `HIDE_VOICE_FEATURES` constant

**Files:**
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Append the constant**

Add at the end of `src/lib/constants.ts`:

```ts
// Sakrylle: voice (STT/TTS) is off by default — hide all its UI entry points.
// Backend audio routes/config remain intact; flip to false to restore voice.
export const HIDE_VOICE_FEATURES = true;
```

- [ ] **Step 2: Verify export**

Run: `grep -n "HIDE_VOICE_FEATURES" src/lib/constants.ts`
Expected: one line showing `export const HIDE_VOICE_FEATURES = true;`

- [ ] **Step 3: Commit**

```bash
git add src/lib/constants.ts
git commit -m "feat(voice): add HIDE_VOICE_FEATURES constant (default true)"
```

---

## Task 2: Hide chat mic + voice-mode buttons

**Files:**
- Modify: `src/lib/components/chat/MessageInput.svelte`

- [ ] **Step 1: Import the constant**

Find the import (line ~64):

```js
	import { WEBUI_BASE_URL, WEBUI_API_BASE_URL, PASTED_TEXT_CHARACTER_LIMIT } from '$lib/constants';
```

Replace with:

```js
	import {
		WEBUI_BASE_URL,
		WEBUI_API_BASE_URL,
		PASTED_TEXT_CHARACTER_LIMIT,
		HIDE_VOICE_FEATURES
	} from '$lib/constants';
```

- [ ] **Step 2: Wrap the mic (voice-input) button**

Find the `<Tooltip>` block whose button has `id="voice-input-button"` (the
button that sets `recording = true`, ~lines 1990–2038). Wrap the entire
`<Tooltip> … </Tooltip>` for that button:

Before:

```svelte
												<Tooltip content={$i18n.t('Record voice')}>
													<button
														id="voice-input-button"
```

…through its matching `</Tooltip>`. Insert `{#if !HIDE_VOICE_FEATURES}` immediately
before the `<Tooltip content={$i18n.t('Record voice')}>` opener and `{/if}`
immediately after its matching `</Tooltip>`. (Tooltip content text may differ;
the unambiguous anchor is `id="voice-input-button"`.) Result shape:

```svelte
												{#if !HIDE_VOICE_FEATURES}
													<Tooltip content={$i18n.t('Record voice')}>
														<button id="voice-input-button" … >
															…
														</button>
													</Tooltip>
												{/if}
```

- [ ] **Step 3: Wrap the voice-mode (call) button**

Find the block with `<Tooltip content={$i18n.t('Voice mode')}>` and its enclosing
`<div class=" flex items-center">` (~lines 2043–2103). Wrap that `<div … flex
items-center …> … </div>` (the one directly containing the Voice-mode Tooltip):

```svelte
											{#if !HIDE_VOICE_FEATURES}
												<div class=" flex items-center">
													<!-- {$i18n.t('Call')} -->
													<Tooltip content={$i18n.t('Voice mode')}>
														…
													</Tooltip>
												</div>
											{/if}
```

Do NOT remove the outer `{#if prompt === '' && files.length === 0 && (…call…)}`
condition — nest the new `{#if !HIDE_VOICE_FEATURES}` inside it.

- [ ] **Step 4: Type-check**

Run: `npm run check 2>&1 | grep -E "MessageInput.svelte|ERROR" | head`
Expected: no new ERROR lines for `chat/MessageInput.svelte`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/chat/MessageInput.svelte
git commit -m "feat(voice): hide chat mic and voice-mode buttons behind HIDE_VOICE_FEATURES"
```

---

## Task 3: Hide channel mic button

**Files:**
- Modify: `src/lib/components/channel/MessageInput.svelte`

- [ ] **Step 1: Import the constant**

Find (line ~27):

```js
	import { WEBUI_API_BASE_URL } from '$lib/constants';
```

Replace with:

```js
	import { WEBUI_API_BASE_URL, HIDE_VOICE_FEATURES } from '$lib/constants';
```

- [ ] **Step 2: Wrap the mic button**

Find the `<Tooltip content={$i18n.t('Record voice')}>` block whose button has
`id="voice-input-button"` (sets `recording = true`, ~lines 1016–1063, inside an
existing `{#if content === ''}`). Wrap just that `<Tooltip> … </Tooltip>`:

```svelte
				{#if content === ''}
					{#if !HIDE_VOICE_FEATURES}
						<Tooltip content={$i18n.t('Record voice')}>
							<button id="voice-input-button" … >
								…
							</button>
						</Tooltip>
					{/if}
				{/if}
```

Keep the existing `{#if content === ''}` wrapper; nest the new guard inside it.

- [ ] **Step 3: Type-check**

Run: `npm run check 2>&1 | grep -E "channel/MessageInput.svelte|ERROR" | head`
Expected: no new ERROR lines for `channel/MessageInput.svelte`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/channel/MessageInput.svelte
git commit -m "feat(voice): hide channel mic button behind HIDE_VOICE_FEATURES"
```

---

## Task 4: Hide notes record menu

**Files:**
- Modify: `src/lib/components/notes/NoteEditor.svelte`

- [ ] **Step 1: Import the constant**

Find (line ~27):

```js
	import { WEBUI_API_BASE_URL, WEBUI_BASE_URL } from '$lib/constants';
```

Replace with:

```js
	import { WEBUI_API_BASE_URL, WEBUI_BASE_URL, HIDE_VOICE_FEATURES } from '$lib/constants';
```

- [ ] **Step 2: Wrap the RecordMenu trigger**

Find the `<RecordMenu … > … </RecordMenu>` block (~lines 1355–1409, the menu
whose trigger shows `<MicSolid …/>` and whose handlers set `recording = true`).
Wrap the whole `<RecordMenu> … </RecordMenu>`:

```svelte
				{#if !HIDE_VOICE_FEATURES}
					<RecordMenu
						onRecord={…}
						onCaptureAudio={…}
						onUpload={…}
					>
						<Tooltip content={$i18n.t('Record')} placement="top">
							<div … ><MicSolid className="size-4.5" /></div>
						</Tooltip>
					</RecordMenu>
				{/if}
```

Leave the `{#if recording}…<VoiceRecording …/>…{:else}` block as-is — it can
only render when `recording` is true, which is now unreachable once the trigger
is hidden.

- [ ] **Step 3: Type-check**

Run: `npm run check 2>&1 | grep -E "NoteEditor.svelte|ERROR" | head`
Expected: no new ERROR lines for `notes/NoteEditor.svelte`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/notes/NoteEditor.svelte
git commit -m "feat(voice): hide notes record menu behind HIDE_VOICE_FEATURES"
```

---

## Task 5: Hide knowledge-base text-modal mic button

**Files:**
- Modify: `src/lib/components/workspace/Knowledge/KnowledgeBase/AddTextContentModal.svelte`

- [ ] **Step 1: Import the constant**

Find (line ~13):

```js
	import VoiceRecording from '$lib/components/chat/MessageInput/VoiceRecording.svelte';
```

Add a new import line directly below it:

```js
	import { HIDE_VOICE_FEATURES } from '$lib/constants';
```

- [ ] **Step 2: Wrap the mic button**

Find the `<Tooltip content={$i18n.t('Voice Input')}>` block whose button sets
`voiceInput = true` and shows `<MicSolid className="size-5" />` (~lines 97–127,
in the `{:else}` branch of `{#if voiceInput}`). Wrap that `<Tooltip> … </Tooltip>`:

```svelte
					{#if !HIDE_VOICE_FEATURES}
						<Tooltip content={$i18n.t('Voice Input')}>
							<button … >
								<MicSolid className="size-5" />
							</button>
						</Tooltip>
					{/if}
```

- [ ] **Step 3: Type-check**

Run: `npm run check 2>&1 | grep -E "AddTextContentModal.svelte|ERROR" | head`
Expected: no new ERROR lines for `AddTextContentModal.svelte`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/workspace/Knowledge/KnowledgeBase/AddTextContentModal.svelte
git commit -m "feat(voice): hide KB text-modal mic button behind HIDE_VOICE_FEATURES"
```

---

## Task 6: Hide read-aloud (TTS) button on responses

**Files:**
- Modify: `src/lib/components/chat/Messages/ResponseMessage.svelte`

- [ ] **Step 1: Import the constant**

Find (line ~39):

```js
	import { WEBUI_API_BASE_URL, WEBUI_BASE_URL } from '$lib/constants';
```

Replace with:

```js
	import { WEBUI_API_BASE_URL, WEBUI_BASE_URL, HIDE_VOICE_FEATURES } from '$lib/constants';
```

- [ ] **Step 2: Extend the read-aloud button's guard condition**

Find the read-aloud button's enclosing `{#if …}` (~line 1057):

```svelte
				{#if !readOnly && ($user?.role === 'admin' || ($user?.permissions?.chat?.tts ?? true))}
					<Tooltip content={$i18n.t('Read Aloud')} placement="bottom">
						<button
							aria-label={$i18n.t('Read Aloud')}
							id="speak-button-{message.id}"
```

Add `!HIDE_VOICE_FEATURES &&` to the front of the condition:

```svelte
				{#if !HIDE_VOICE_FEATURES && !readOnly && ($user?.role === 'admin' || ($user?.permissions?.chat?.tts ?? true))}
```

(Once `speak-button-{message.id}` no longer renders, the auto-playback line in
`Chat.svelte` — `document.getElementById('speak-button-…')?.click()` — no-ops, so
no automatic TTS request is made. No change needed there.)

- [ ] **Step 3: Type-check**

Run: `npm run check 2>&1 | grep -E "ResponseMessage.svelte|ERROR" | head`
Expected: no new ERROR lines for `chat/Messages/ResponseMessage.svelte`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/chat/Messages/ResponseMessage.svelte
git commit -m "feat(voice): hide read-aloud TTS button behind HIDE_VOICE_FEATURES"
```

---

## Task 7: Remove user settings "Audio" tab

**Files:**
- Modify: `src/lib/components/chat/SettingsModal.svelte`

- [ ] **Step 1: Import the constant**

Add to the existing `$lib/constants` import in this file. If none exists, add a
new import near the other imports at the top of the `<script>`:

```js
	import { HIDE_VOICE_FEATURES } from '$lib/constants';
```

(If an import from `'$lib/constants'` already exists, add `HIDE_VOICE_FEATURES`
to its named list instead of adding a second import.)

- [ ] **Step 2: Filter the `audio` tab out of the settings list**

Find the array that contains the `{ id: 'audio', title: 'Audio', keywords: […] }`
entry (the `allSettings` array, audio entry ~lines 267–342). Immediately where
that array is assigned to the variable used for rendering the tab nav, append a
`.filter` that drops `audio` when voice is hidden. Concretely, locate the array
literal's closing `]` for `allSettings` and change:

```js
	];
```

(for that array) to:

```js
	].filter((s) => !(HIDE_VOICE_FEATURES && s.id === 'audio'));
```

If the array is consumed through a derived/reactive variable instead of directly,
apply the same `.filter((s) => !(HIDE_VOICE_FEATURES && s.id === 'audio'))` to
the variable that feeds the sidebar `{#each}` and the search. This removes the
tab from both the nav and the keyword search, so `selectedTab` can never become
`'audio'` via the UI. Leave the `{:else if selectedTab === 'audio'}` content
branch (~lines 921–927) untouched — it is now unreachable.

- [ ] **Step 3: Verify the audio entry is filtered**

Run: `grep -n "HIDE_VOICE_FEATURES && s.id === 'audio'" src/lib/components/chat/SettingsModal.svelte`
Expected: one match showing the filter.

- [ ] **Step 4: Type-check**

Run: `npm run check 2>&1 | grep -E "SettingsModal.svelte|ERROR" | head`
Expected: no new ERROR lines for `chat/SettingsModal.svelte`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/chat/SettingsModal.svelte
git commit -m "feat(voice): remove user Audio settings tab when HIDE_VOICE_FEATURES"
```

---

## Task 8: Remove admin settings "Audio" tab + guard route

**Files:**
- Modify: `src/lib/components/admin/Settings.svelte`

- [ ] **Step 1: Import the constant**

Add `HIDE_VOICE_FEATURES` to this file's `$lib/constants` import, or add a new
import near the top of the `<script>` if none exists:

```js
	import { HIDE_VOICE_FEATURES } from '$lib/constants';
```

- [ ] **Step 2: Filter the `audio` tab out of `baseSettings`**

Find the `baseSettings` array entry (~lines 207–223):

```js
		{
			id: 'audio',
			title: 'Audio',
			route: '/admin/settings/audio',
			keywords: [ … ]
		}
```

Locate the closing `]` of the `baseSettings` array and append the filter:

```js
	].filter((s) => !(HIDE_VOICE_FEATURES && s.id === 'audio'));
```

If the rendered tab list comes from a separate derived variable
(e.g. `filteredSettings`), apply the same
`.filter((s) => !(HIDE_VOICE_FEATURES && s.id === 'audio'))` to whichever array
feeds the `{#each … as tab}` nav loop, so the audio nav item and its keyword
search entry are both removed.

- [ ] **Step 3: Guard the route fallback for `selectedTab`**

The audio tab has a deep-link route `/admin/settings/audio`, so `selectedTab`
could still be set to `'audio'` from the URL. Find where `selectedTab` is
initialized from the route/path (search the file for `selectedTab =`). Add a
guard right after it is assigned so a hidden tab falls back to the default:

```js
	if (HIDE_VOICE_FEATURES && selectedTab === 'audio') {
		selectedTab = 'general';
	}
```

Place this immediately after the line(s) that set `selectedTab` from the
route/path param (use `'general'`, which is the first/default admin tab). Leave
the `{:else if selectedTab === 'audio'}` content branch (~line 572) untouched.

- [ ] **Step 4: Verify the filter and guard exist**

Run: `grep -n "HIDE_VOICE_FEATURES" src/lib/components/admin/Settings.svelte`
Expected: at least two matches — the array filter and the `selectedTab` guard.

- [ ] **Step 5: Type-check**

Run: `npm run check 2>&1 | grep -E "admin/Settings.svelte|ERROR" | head`
Expected: no new ERROR lines for `admin/Settings.svelte`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/admin/Settings.svelte
git commit -m "feat(voice): remove admin Audio settings tab and guard route when HIDE_VOICE_FEATURES"
```

---

## Task 9: Gate alternate voice-mode entry points in Chat

**Files:**
- Modify: `src/lib/components/chat/Chat.svelte`

- [ ] **Step 1: Import the constant**

Add `HIDE_VOICE_FEATURES` to this file's `$lib/constants` import, or add a new
import near the top of the `<script>` if none exists:

```js
	import { HIDE_VOICE_FEATURES } from '$lib/constants';
```

- [ ] **Step 2: Gate the `?call=true` URL trigger**

Find (~lines 1325–1328):

```js
		if ($page.url.searchParams.get('call') === 'true') {
			showCallOverlay.set(true);
			showControls.set(true);
		}
```

Add the constant to the condition:

```js
		if (!HIDE_VOICE_FEATURES && $page.url.searchParams.get('call') === 'true') {
			showCallOverlay.set(true);
			showControls.set(true);
		}
```

- [ ] **Step 3: Gate the desktop `call` event trigger**

Find (~lines 1335–1342):

```js
			if (event.type === 'call') {
				// Defer to next macrotask so the call overlay isn't clobbered by
				// showControlsSubscribe's initial callback (value=false → set(false))
				// which runs as a pending microtask after this function.
				setTimeout(() => {
					showCallOverlay.set(true);
					showControls.set(true);
				}, 0);
			} else if (event.type === 'query') {
```

Change the condition so a `call` event is ignored when voice is hidden:

```js
			if (event.type === 'call' && !HIDE_VOICE_FEATURES) {
				// Defer to next macrotask so the call overlay isn't clobbered by
				// showControlsSubscribe's initial callback (value=false → set(false))
				// which runs as a pending microtask after this function.
				setTimeout(() => {
					showCallOverlay.set(true);
					showControls.set(true);
				}, 0);
			} else if (event.type === 'query') {
```

- [ ] **Step 4: Type-check**

Run: `npm run check 2>&1 | grep -E "chat/Chat.svelte|ERROR" | head`
Expected: no new ERROR lines for `chat/Chat.svelte`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/chat/Chat.svelte
git commit -m "feat(voice): gate alternate voice-mode entry points behind HIDE_VOICE_FEATURES"
```

---

## Task 10: Verification

**Files:** none (verification only)

- [ ] **Step 1: Full type-check gate**

Run: `npm run check 2>&1 | tail -3`
Expected: `0 ERRORS` (warnings are pre-existing project-wide and acceptable).

- [ ] **Step 2: Confirm all entry points reference the guard**

Run:

```bash
grep -rl "HIDE_VOICE_FEATURES" src/lib/constants.ts \
  src/lib/components/chat/MessageInput.svelte \
  src/lib/components/channel/MessageInput.svelte \
  src/lib/components/notes/NoteEditor.svelte \
  src/lib/components/workspace/Knowledge/KnowledgeBase/AddTextContentModal.svelte \
  src/lib/components/chat/Messages/ResponseMessage.svelte \
  src/lib/components/chat/SettingsModal.svelte \
  src/lib/components/admin/Settings.svelte \
  src/lib/components/chat/Chat.svelte | wc -l
```

Expected: `9` (constant file + 8 modified files).

- [ ] **Step 3: Manual visual pass**

Run: `npm run dev` and check in the browser:
- Chat input: no mic button, no voice-mode (call) button.
- Channel input: no mic button.
- Notes editor: no record/mic menu.
- Knowledge base → add text content modal: no mic button.
- Assistant response actions: no read-aloud (speaker) button.
- User Settings: no "语音 / Audio" tab.
- Admin Settings: no "Audio" tab; visiting `/admin/settings/audio` directly
  falls back to the General tab (does not show the audio panel).

Expected: all the above voice controls are absent.

- [ ] **Step 4: Reversibility check**

Temporarily set `HIDE_VOICE_FEATURES = false` in `src/lib/constants.ts`, reload
`npm run dev`, and confirm the chat mic button reappears. Then revert it back to
`true`.
Expected: mic button visible with `false`, gone again with `true`. Do not commit
the temporary flip.

- [ ] **Step 5: Final confirmation (no commit needed)**

All tasks committed, `npm run check` at 0 errors, visual pass clean.
```bash
git log --oneline -10
```
