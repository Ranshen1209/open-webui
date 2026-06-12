# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Open WebUI is a self-hosted AI platform with a **SvelteKit frontend** (`src/`) and a **FastAPI Python backend** (`backend/open_webui/`). The frontend is built as a static SPA and served by the backend. The backend provides a REST API, WebSocket-based real-time communication, and integrates with LLM runners (Ollama, OpenAI-compatible APIs), vector databases, and auth providers.

## Essential Commands

### Frontend (Node.js >= 18.13.0, <= 22.x)
```bash
npm run dev           # Start Vite dev server with Pyodide fetch (localhost:5173)
npm run dev:5050      # Same but on port 5050
npm run build         # Production build (runs pyodide:fetch first)
npm run check         # Type-check with svelte-check
npm run lint          # Full lint: ESLint (frontend) + svelte-check (types) + pylint (backend)
npm run lint:frontend # ESLint only (auto-fix)
npm run lint:backend  # pylint backend/
npm run format        # Prettier format all frontend files
npm run format:backend # Ruff format backend Python
npm run test:frontend # Vitest (frontend unit tests)
npm run i18n:parse    # Re-parse i18n translation keys
```

### Backend (Python >= 3.11, < 3.13)
```bash
# Run the backend (installed via pip or from source):
open-webui serve --host 0.0.0.0 --port 8080

# Or directly with uvicorn for development:
uvicorn open_webui.main:app --host 0.0.0.0 --port 8080 --reload

# Run a single test (pytest):
pytest test/ -k "test_name"

# Lint backend:
pylint backend/
# Or with ruff (format + lint):
ruff format . --exclude .venv
ruff check .
```

### Docker
```bash
docker compose up -d              # Start all services
docker compose up -d --build      # Start with rebuild
make install                      # Same as above (uses docker compose)
```

## Architecture

### Backend (`backend/open_webui/`)

**Entry point:** `open_webui/__init__.py` — Typer CLI with `serve` and `dev` commands. Both launch `open_webui.main:app` via uvicorn.

**`main.py`** (3029 lines) — The core FastAPI application. Contains:
- `lifespan()` — async context manager for startup/shutdown: pre-fetches models, initializes tool/terminal servers, starts Redis listener, configures thread pool, pre-warms model cache
- Route registrations at the bottom (lines 1413–1456): all API routes are mounted under `/api/v1/` prefixes, plus `/ollama` and `/openai` passthrough routes
- Custom middleware stack (lines 1394–1398): `RedirectMiddleware`, `SecurityHeadersMiddleware`, `CommitSessionMiddleware`, `AuthTokenMiddleware`, `WebsocketUpgradeGuardMiddleware`
- Inline chat/completions endpoints that proxy to upstream LLM providers

**`config.py`** — Every configurable setting is declared as a `ConfigVar` with env-var defaults, persisted in the `config` DB table via `internal/config.py`. The `Config` class (imported from `internal/config`) is the single-row DB table. Env vars always take precedence.

**`env.py`** — Environment bootstrap (dotenv loading, DATA_DIR, DATABASE_URL assembly, Redis config, WebSocket config, OAuth, logging). Import from here when you need path constants like `DATA_DIR`, `FRONTEND_BUILD_DIR`.

**`internal/db.py`** — SQLAlchemy async engine setup. Supports SQLite (default, `webui.db`), PostgreSQL, and SQLCipher. Manages connection pools and PRAGMA tuning for SQLite WAL mode.

**`internal/config.py`** — `ConfigState` in-memory mirror of the config DB row. Uses dotted-path reads/writes. `ConfigVar` descriptors allow module-level config declarations that sync with the DB.

**`models/`** — Peewee ORM models (each model file mirrors a router file: `chats.py`, `users.py`, `files.py`, etc.). Used for DB queries in routers.

**`routers/`** — FastAPI routers, one per domain entity. Each router file handles CRUD for its domain (e.g., `chats.py` for chat operations, `models.py` for model listing, `folders.py` for folder management).

**`socket/main.py`** — Socket.IO server for real-time events (chat streaming, user presence, collaboration). Uses Redis pub/sub in multi-worker deployments.

**`utils/`** — Shared utilities including `auth.py` (JWT handling), `asgi_middleware.py` (pure-ASGI middleware — avoids `BaseHTTPMiddleware` which caused task-group cancellation issues), `retrieval/` (RAG), `tools.py` (tool server management), `mcp/` (MCP protocol support), `telemetry/` (OpenTelemetry).

**`migrations/`** — Alembic migrations (async-capable, env.py configured for both SQLite and PostgreSQL).

### Frontend (`src/`)

**Framework:** SvelteKit with `@sveltejs/adapter-static` (builds to `build/`, served by FastAPI as a SPA).

**Routing:** File-based via SvelteKit under `src/routes/`:
- `(app)/` — main authenticated layout. Sub-routes: `home/`, `workspace/`, `admin/`, `c/` (chat), `notes/`, `calendar/`, `channels/`, `playground/`, `automations/`
- `auth/` — login/signup/SSO pages
- `s/` — shared chat public pages
- `watch/` — WebRTC watch page

**`src/lib/stores/index.ts`** — Central Svelte writable stores: `user`, `config`, `socket`, `theme`, `chatId`, `mobile`, `WEBUI_NAME`, etc. These drive the reactive UI.

**`src/lib/apis/`** — API client layer. Each subdirectory exports typed functions that call the backend REST endpoints (e.g., `chats/`, `models/`, `users/`). The `streaming/` subdirectory handles SSE and WebSocket chat streaming.

**`src/lib/components/`** — Svelte components organized by domain:
- `chat/` — Chat UI: `Chat.svelte`, `Messages/`, `MessageInput/`, `ModelSelector/`, `Settings/`, `ContentRenderer/`
- `layout/` — App shell: `Sidebar/`, `Navbar/`, modals
- `common/` — Reusable primitives: `Modal.svelte`, `Dropdown.svelte`, `RichTextInput/`, `CodeEditor.svelte`, `ToolCallDisplay.svelte`
- `admin/`, `workspace/`, `automations/`, `calendar/`, `notes/`, `channel/` — domain-specific component trees

**`src/lib/i18n/`** — Internationalization via i18next. Translation JSON files live in `locales/`. Run `npm run i18n:parse` to extract new keys.

### Key Architectural Patterns

1. **Config system:** Config values are declared as `ConfigVar` descriptors in `config.py`, read from env vars at startup, and persisted in the `config` DB table. Components read config via `app.state.config`. The `get_config()` helper returns a snapshot.

2. **Dual ORM stack:** Peewee (`models/`) for sync DB access in request handlers, SQLAlchemy (`internal/db.py`) for async operations and migrations. Both point to the same database.

3. **WebSocket collaboration:** The Socket.IO server at `/ws` handles real-time chat streaming, user presence, and collaborative editing (Y.js/pycrdt for CRDT-based sync). In multi-worker deployments, Redis pub/sub coordinates messages across workers.

4. **Auth middleware chain:** `AuthTokenMiddleware` validates JWT/bearer tokens, `CommitSessionMiddleware` persists session data, `WebsocketUpgradeGuardMiddleware` blocks unauthenticated WS upgrades.

5. **LLM provider abstraction:** `/ollama` and `/openai` routes proxy to upstream providers. The `/api/chat/completions` endpoint routes requests to the appropriate provider based on model metadata. Tool calling, RAG, and streaming work across providers.

6. **Frontend build integration:** `hatch_build.py` hooks into Hatchling to build the frontend (`npm run build`) during `pip install`. The built static files land in `backend/open_webui/frontend/` for distribution.

7. **Pyodide/WASM:** The frontend fetches Pyodide at dev time (`npm run pyodide:fetch`) for in-browser Python execution (code interpreter, function tools).

### Branch & Theme Notes

The current branch `theme/sakrylle` rebrands the app as "Sakrylle Web" (`WEBUI_NAME` defaults to this in `env.py` line 771). The main branch is `main`.


## Sakrylle OIDC Documentation Governance

- `oidc-docs/` is a tracked product-local documentation directory for Sakrylle Web.
- Canonical platform docs live in `../sub2api/sakrylle-docs/`, especially:
  - `10-platform-identity/current-state.md`
  - `10-platform-identity/rp-integration-guide.md`
  - `10-platform-identity/commercial-boundaries.md`
  - `10-platform-identity/configuration-isolation.md`
- Local docs are limited to:
  - `oidc-docs/README.md`
  - `oidc-docs/local-integration.md`
  - `oidc-docs/implementation-status.md`
  - `oidc-docs/troubleshooting.md`
  - `oidc-docs/historical/` for preserved old Web research/plans.
- Do **not** duplicate OIDC Provider protocol, claims policy, roadmap, risk register, or design-system content here. Link to the center docs instead.
- When changing Web OIDC/Authlib configuration, `OPENID_PROVIDER_URL`, OAuth client settings, callback/logout behavior, `DATA_DIR`, Sakrylle branding, manifests/static assets, or Web rollout status, update local `oidc-docs/` and update center docs if the shared platform contract changes.


## Local Development & Builds

During development, build and run locally on this machine (ample: 64GB RAM / 10 cores) — don't wait on CI or the server for dev iteration.

- **Frontend iteration (most work):** `npm run dev` (Vite HMR at `localhost:5173`) — near-instant; covers ~all theme/branding/UI work. No backend needed to eyeball most pages (API-dependent pages render the "backend required" screen). The favicon/theme/branding changes are all frontend and show immediately here.
- **Backend (native), managed via `uv`:** Python 3.12 venv at `.venv` (`uv venv --python 3.12`); install deps with `uv pip install -r backend/requirements.txt` (heavy: torch/chromadb/onnxruntime/opencv, several GB — a **one-time** cost, reused after). Run from `backend/`: `../.venv/bin/uvicorn open_webui.main:app --host 127.0.0.1 --port 8080` (add `--reload` for auto-restart on save). The backend serves `FRONTEND_BUILD_DIR` (default repo `build/`); run `npm run build` to refresh it when the backend must serve the production frontend.
- **Local Docker image build (when needed):** runtime is Colima (`colima start --cpu 6 --memory 12 --disk 80`); buildx is linked at `~/.docker/cli-plugins/docker-buildx`. The in-build container network on this host is flaky (npm/pip `ECONNRESET`) — pre-pull base images (`docker pull node:22-alpine3.20 python:3.11-slim-bookworm docker/dockerfile:1`) and retry, or build the frontend on the host and `COPY` it in to drop the in-container `npm ci` step.
- **Deploy/release image is still CI, not local:** `.github/workflows/build-sakrylle-web.yml` builds the **amd64** image on push to `theme/sakrylle` and pushes to `ghcr.io/ranshen1209/sakrylle-web`; the server (`deploy/docker-compose.sakrylle-web.yml`) only `pull`s it. This Mac is **arm64** — local Docker builds are arm64 (fine for local testing), not the amd64 deploy artifact; producing amd64 locally needs QEMU emulation (slow). Confirm server arch before any local release build.
- **Favicon/static `/static/` mapping (gotcha):** in `npm run dev`, `/static/...` resolves to `static/static/` (SvelteKit serves project `static/` at `/`); in the backend it resolves to `STATIC_DIR = backend/open_webui/static`. `static/brand/` is the tracked canonical brand source. Browsers prefer `favicon.svg` over the PNGs. Update all three (`static/static/`, `backend/open_webui/static/`, `static/brand/`) when changing icons.
