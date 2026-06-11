---
title: Sakrylle Web Implementation Status
status: local
scope: product-local
canonical_source: ../../sub2api/sakrylle-docs/10-platform-identity/current-state.md
last_verified: 2026-06-11
---

# Sakrylle Web Implementation Status

Current documentation status: **local implementation has been completed and pushed on `theme/sakrylle` at `be4448136`; automated local verification passed before commit; Sakrylle SSO still requires IdP client registration, deployment secrets, and staging smoke tests.**

A follow-up session on 2026-06-10 advanced Sakrylle branding/UI substantially (Monet Purple theme, favicon, onboarding/auth re-skin, residual "Open WebUI" cleanup) — see [Branding & UI status (2026-06-10)](#branding--ui-status-2026-06-10). OIDC code readiness is unchanged: ready in code, not yet deployed.

Latest repository progress:

- Open WebUI Sakrylle OIDC/branding changes were committed and pushed to `origin/theme/sakrylle` in commit `be4448136` (`feat: complete Sakrylle OIDC branding integration`).
- Local verification completed before the commit: frontend build, `npm run check`, frontend test command, backend Python formatting check, targeted Python compile check, and `git diff --check` all passed.
- The pushed implementation keeps Sakrylle Web on the generic Authlib `oidc` provider path and uses deployment configuration for confidential-client SSO-only behavior.
- Shared center docs in `../sub2api` were reviewed/updated during implementation, but that separate repository was not committed or pushed from this Web repository session because its working tree contained unrelated/untracked documentation state that needs separate review.

Canonical platform status lives in [Sakrylle OIDC current state](../../sub2api/sakrylle-docs/10-platform-identity/current-state.md). This file only tracks product-local readiness and gaps.

## Product-local readiness checklist

- [x] Local configuration points are documented in [local-integration.md](./local-integration.md).
- [x] Product-specific OAuth/OIDC callback is documented: `/oauth/oidc/login/callback`.
- [x] Token storage behavior is documented: encrypted server-side `oauth_session` rows plus local browser auth/session cookies.
- [x] SSO-only deployment settings are represented in `deploy/env.example`.
- [x] Sakrylle Web manifest/static brand assets are present in tracked static paths and documented in `static/brand/README.md`; favicon icon set refreshed to the cherry-blossom mark on 2026-06-10.
- [ ] Sakrylle API IdP has an approved `sakrylle-web` confidential client registration for the deployment callback URI.
- [ ] Deployment `.env` has production secrets and URLs installed outside the repository.
- [ ] Login, refresh/access-token use, revoke/logout, and profile mapping smoke tests have been run in staging or production.

## Code readiness

- Backend OIDC remains the generic Authlib provider path; no Sakrylle-only provider branch is required.
- `/manifest.json` now returns Sakrylle Web metadata and colors when using the built-in manifest route.
- `/api/v1/auths/signout` clears local state, deletes the stored OAuth session row, and returns a provider logout URL when one is configured or discovered.
- `OPENAI_API_CONFIGS` can now be initialized from env JSON so deployments can set the Sakrylle API connection to `system_oauth` without using a static API key.
- Frontend notification/page title surfaces use the runtime WebUI name where product-facing.

## Required runtime verification

- Check `/api/config` exposes `oauth.providers.oidc` with the intended Sakrylle SSO label and `oauth.auto_redirect=true`.
- Start login via `/oauth/oidc/login` and verify redirect to the Sakrylle issuer.
- Complete callback in a staging/local environment and confirm encrypted OAuth session storage.
- Verify OpenAI-compatible calls to `https://api.sakrylle.com/v1` use the logged-in user's OAuth access token when `OPENAI_API_CONFIGS={"0":{"auth_type":"system_oauth"}}` is configured.
- Verify `/userinfo` / profile mapping and `/api/v1/auths/signout` IdP logout behavior.
- Verify `/manifest.json`, `/static/favicon.svg`, `/static/favicon.png`, `/static/splash.png`, and `/static/logo.png` show Sakrylle branding.

## Branding & UI status (2026-06-10)

Sakrylle branding/UI was advanced substantially in a follow-up session on `theme/sakrylle`. Design records: `docs/superpowers/specs/2026-06-10-monet-purple-theme-design.md` and `docs/superpowers/specs/2026-06-10-branding-finishing-design.md` (implementation plans under `docs/superpowers/plans/`). The brand-system source of truth remains the center docs (`../../sub2api/sakrylle-docs/40-brand-system/`); this file only records local status, not palette/design specs.

**Committed:**

- **Monet Purple theme** — `@theme` `primary-*` (Monet Purple) + `accent-*` (sakura) scales in `src/tailwind.css`; brand/interactive `blue-*` migrated to `primary-*`; neutral grays retinted warm-purple; sakura accent on the OIDC SSO CTA + links; dark first-paint aligned to `@theme` oklch (commits `92e6475dd`..`cdb107449`).
- **Branding finishing** — `ENABLE_VERSION_UPDATE_CHECK=False` added to `deploy/env.example`; `SyncStatsModal`/`ManifestModal` "Open WebUI" references rewritten to dynamic `{{name}}` / neutral wording; the upstream Open WebUI enterprise/sponsorship promo removed from the admin user list; i18n keys synced (commits `d48d7be79`..`a1d24aa82`).

**Also committed (2026-06-10):**

- **Favicon set** replaced with the Sakrylle cherry-blossom mark across all three serving paths — `static/static/` (dev `/static/`), `backend/open_webui/static/` (prod `/static/`, `STATIC_DIR`), and `static/brand/` (canonical source). `favicon.svg` now embeds the new PNG (browsers prefer SVG over the PNGs).
- **Onboarding** (`src/lib/components/OnBoarding.svelte`) and **auth** (`src/routes/auth/+page.svelte`) re-skinned: theme-aware sakura background (`/assets/images/sakura-{dark,light}.png`), Sakrylle taglines on onboarding, an adaptive light/dark scrim on auth for form legibility. `SlideShow.svelte` made single-image-safe.
- **Error page** (`src/routes/error/+page.svelte`): removed the upstream readme/Discord help line.

Path note: `/static/` maps to `static/static/` under the dev server and to `STATIC_DIR = backend/open_webui/static` under the backend (see `CLAUDE.md` → Local Development & Builds). Still upstream (gated, hidden at deploy or by `WEBUI_NAME`): community-sharing strings and the `About.svelte` attribution block.

## Slim profile for 2c2g deploy (2026-06-11)

The server build runs a "slim" profile so it fits a 2 vCPU / 2 GB RAM host. Design + plan: `docs/superpowers/specs/2026-06-11-slim-for-2c2g-design.md`, `docs/superpowers/plans/2026-06-11-slim-for-2c2g.md`. **Cut by default:** RAG / document upload / knowledge bases, in-process embeddings + vector store, in-app web search, code interpreter, the Ollama passthrough, and **Memories**. **Kept:** chat (OpenAI-compatible upstream), OIDC, admin, Notes/Calendar/Channels/Automations, Tools/MCP, and remote-proxy image-gen + audio (STT/TTS).

Measured result: backend resident RAM dropped from ~1.4 GB to **~302 MB** (slim venv, no torch), the dependency set shrank by ~17 packages (torch, transformers, sentence-transformers, chromadb + 4 other vector-DB clients, playwright, OCR/`unstructured`/`nltk`, `langchain-classic`, `accelerate`, `faster-whisper`), and a no-vector-store **null backend** replaces chromadb.

Two project-local env flags control router registration; both default to `False`:

- `SAKRYLLE_ENABLE_RETRIEVAL_ROUTER` — enables `/api/v1/retrieval/*` **and** `/api/v1/knowledge/*` and loads the sentence-transformers / chromadb / playwright stack. Setting this `True` against the slim `backend/requirements.txt` fails at import (`ModuleNotFoundError`); use a full-requirements image instead.
- `SAKRYLLE_ENABLE_OLLAMA_ROUTER` — enables the `/ollama/*` passthrough. **Independent** from the upstream `ENABLE_OLLAMA_API` flag (which only affects admin UI).

The frontend reads four booleans from `/api/config` `features` to hide UI entry points: `enable_retrieval`, `enable_web_search`, `enable_code_interpreter`, and `enable_ollama_api` (plus the existing `enable_memories`). All gated entry-point components remain in the tree — flipping the flags on (with the right deps installed) re-shows them; no frontend rebuild is needed for the slim ↔ full toggle.

Other slim defaults flipped (overridable via env): `ENABLE_OLLAMA_API=False`, `ENABLE_CODE_EXECUTION=False`, `ENABLE_CODE_INTERPRETER=False`, `BYPASS_EMBEDDING_AND_RETRIEVAL=True`, `RAG_EMBEDDING_ENGINE=openai`, `VECTOR_DB=''` (→ null backend), `ENABLE_MEMORIES=False`, `ENABLE_VERSION_UPDATE_CHECK=False`. The production `npm run build` no longer runs `pyodide:fetch` (code interpreter is off). The built-in `knowledge` chat tools are gated on `SAKRYLLE_ENABLE_RETRIEVAL_ROUTER` so models aren't offered RAG tools that can't work in slim mode.

**Audio (STT/TTS) requires a remote engine.** Local Whisper (`faster-whisper`) is removed from the slim image, but `AUDIO_STT_ENGINE` still defaults to `''` (local). For speech-to-text to work, an admin must set `AUDIO_STT_ENGINE` to a remote engine (e.g. `openai`) with the matching endpoint/key in Admin → Settings → Audio; otherwise transcription returns a 500. TTS is unaffected (already remote/browser).

To run the **full** profile (RAG, web search, code interpreter, Ollama, Memories): use the full `requirements.txt`, set `SAKRYLLE_ENABLE_RETRIEVAL_ROUTER=True` / `SAKRYLLE_ENABLE_OLLAMA_ROUTER=True`, and re-enable the corresponding `ENABLE_*` flags. None of this touches OIDC/Authlib, branding, or schema.

## Remaining blockers

- Production IdP client registration and secret installation are external deployment actions and require separate approval.
- Automated tests do not prove real OIDC login/logout; staging smoke testing is required.
- Slim-profile end-to-end smoke (OIDC login → chat against the OpenAI-compatible upstream → remote image/audio round-trips) requires a configured upstream + IdP and must be run in staging; route-level and RAM verification passed locally on 2026-06-11.
