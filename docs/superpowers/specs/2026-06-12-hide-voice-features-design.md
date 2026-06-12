# Hide All STT/TTS Entry Points Behind a Single Frontend Switch — Design

Date: 2026-06-12
Branch: `theme/sakrylle`
Status: Approved, ready for implementation plan

## Goal

Hide every speech-to-text (STT) and text-to-speech (TTS) entry point from the
Sakrylle Web UI behind one frontend constant. Voice features are **off by
default**, so the hide switch defaults to **on** (`true`). The backend audio
routes, config, and dependencies remain intact, as do the earlier Web Speech
default-STT changes. Flipping the constant to `false` restores all voice
features.

## Decisions

- A single build-time constant `HIDE_VOICE_FEATURES` in
  `src/lib/constants.ts`, default `true` (voice hidden / off by default).
- Each entry point imports the constant and wraps its rendered button / tab /
  trigger in `{#if !HIDE_VOICE_FEATURES}`.
- Approach A (wrap, do not delete): voice components
  (`VoiceRecording.svelte`, `CallOverlay.svelte`, `Settings/Audio.svelte`,
  `admin/Settings/Audio.svelte`) stay in the codebase, just unreferenced from
  the UI when the switch is off.
- No backend changes. No revert of the Web Speech work. The previously removed
  Help/Releases menu items are unrelated and stay removed.

## The Switch

```ts
// src/lib/constants.ts
// Sakrylle: voice (STT/TTS) is off by default — hide all its UI entry points.
// Backend audio routes/config remain intact; flip to false to restore voice.
export const HIDE_VOICE_FEATURES = true;
```

## Entry Points to Gate

| # | File | What to hide |
|---|------|--------------|
| 1 | `src/lib/components/chat/MessageInput.svelte` | Mic (voice input) button + voice-mode (call) button |
| 2 | `src/lib/components/channel/MessageInput.svelte` | Mic (voice input) button |
| 3 | `src/lib/components/notes/NoteEditor.svelte` | Voice recording entry |
| 4 | `src/lib/components/workspace/Knowledge/KnowledgeBase/AddTextContentModal.svelte` | Mic (voice input) button |
| 5 | `src/lib/components/chat/Messages/ResponseMessage.svelte` | Read-aloud (TTS) button + auto-read trigger |
| 6 | `src/lib/components/chat/SettingsModal.svelte` | User "Voice" settings tab (sidebar item + content branch) |
| 7 | `src/lib/components/admin/Settings.svelte` | Admin "Audio" settings tab (sidebar item + content branch) |

## Gating Rules

- Wrap only the **entry-point rendering** — the button, the tab list item, and
  the tab content branch. Do not delete components or unrelated imports.
- **Auto-read TTS:** in `ResponseMessage.svelte`, when voice is hidden
  (`HIDE_VOICE_FEATURES`), skip the automatic speak-on-response logic so no TTS
  request is made in the background (not just hiding the button).
- **Tab lists (items 6, 7):** the Voice/Audio tab is removed from both the
  navigation list and the rendered content. When implementing, verify the tab
  array / `selectedTab` routing has no out-of-range index or broken
  `/admin/settings/audio` deep-link fallback once the entry is gated. If the
  audio route can still be reached directly, redirect or guard it to a safe
  default tab.

## Out of Scope (YAGNI)

- Deleting any voice component, backend route, config var, or dependency.
- Reverting the Web Speech default-STT commits.
- A backend/admin config-driven toggle. The requirement is unconditional
  hiding via the frontend constant.

## Risks

- Tab index / routing breakage in the settings modals (items 6, 7) if a removed
  tab is still referenced by index or a saved route. Mitigation: verify routing
  and default-tab fallback during implementation.
- A missed entry point would leave a dangling voice button. Mitigation:
  the inventory above is derived from an exhaustive grep of `VoiceRecording`,
  `CallOverlay`, `transcribeAudio`, and `synthesizeOpenAISpeech` usages; the
  verification step re-greps to confirm none are rendered unguarded.

## Verification

- `npm run check` → 0 errors.
- `npm run dev` visual check: no mic button and no voice-mode button in chat,
  channel, notes, and knowledge-base text modal; no read-aloud button on
  responses and no auto-read; no "Voice" tab in user settings; no "Audio" tab
  in admin settings.
- Flip `HIDE_VOICE_FEATURES` to `false` and confirm one representative entry
  point (e.g. chat mic button) reappears — proving reversibility.
