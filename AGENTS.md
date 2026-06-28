# AGENTS.md

Guidance for Codex and other code agents working in this repository.

## Repository Snapshot

Sakrylle Web is a branded Open WebUI fork on branch `theme/sakrylle`.

- Frontend: SvelteKit SPA under `src/`, built to `build/`.
- Backend: FastAPI app under `backend/open_webui/`, serving the frontend and REST/WebSocket APIs.
- Runtime integrations: Ollama, OpenAI-compatible APIs, vector stores, auth/OIDC providers, Socket.IO collaboration, Pyodide/WASM tooling.
- Default product name: `Sakrylle Web` via `WEBUI_NAME` in `backend/open_webui/env.py`.

## Agent Operating Rules

- Prefer local iteration on this machine. Do not wait on CI for normal development feedback.
- Keep changes scoped to the requested behavior and nearby patterns.
- Avoid stale file/line assumptions. Re-check current code with `rg` before editing.
- Use existing project APIs and conventions before adding new abstractions.
- If auth, OIDC, branding, static assets, manifests, deployment, or config defaults change, update the relevant docs listed below.
- Never duplicate shared Sakrylle identity/OIDC platform material into local docs; link to the canonical center docs instead.

## Common Commands

### Frontend

Node.js requirement: `>=18.13.0`, `<=22.x`.

```bash
npm run dev            # Vite dev server at localhost:5173, includes pyodide:fetch
npm run dev:5050       # Vite dev server at localhost:5050
npm run build          # Production frontend build
npm run check          # svelte-check type checking
npm run lint           # ESLint + svelte-check + backend pylint
npm run lint:frontend  # ESLint frontend, with autofix
npm run format         # Prettier frontend files
npm run test:frontend  # Vitest frontend tests
npm run i18n:parse     # Extract/update i18n keys
```

### Backend

Python requirement: `>=3.11`, `<3.13`. Local development normally uses Python 3.12 in `.venv`.

```bash
uv venv --python 3.12
uv pip install -r backend/requirements.txt

cd backend
../.venv/bin/uvicorn open_webui.main:app --host 127.0.0.1 --port 8080 --reload
```

Other backend commands:

```bash
open-webui serve --host 0.0.0.0 --port 8080
pytest test/ -k "test_name"
npm run lint:backend
npm run format:backend
ruff check .
```

### Docker

```bash
docker compose up -d
docker compose up -d --build
make install
```

Local Docker runs on Colima. This Mac is arm64; the deploy image is built as amd64 by CI from `.github/workflows/build-sakrylle-web.yml` and pushed to `ghcr.io/ranshen1209/sakrylle-web`.

## Development Workflow Notes

- Frontend/theme work: start with `npm run dev`. Most branding and UI work can be verified without the backend; API-dependent pages may show the backend-required state.
- Backend native run: start uvicorn from `backend/` with the `.venv` command above.
- Backend serving production frontend: run `npm run build` first so `FRONTEND_BUILD_DIR` points at a fresh `build/`.
- Local Docker build network can fail during in-container npm/pip downloads. Pre-pull base images or build the frontend on the host when needed.
- Do not treat local arm64 Docker builds as release artifacts unless the target server architecture has been confirmed.

## Static And Branding Assets

Static asset paths differ by runtime:

- Vite dev: `/static/...` resolves through the repo `static/` directory, so tracked dev copies may live under `static/static/`.
- Backend: `/static/...` is served from `backend/open_webui/static`.
- Canonical brand source: `static/brand/`.

When changing icons or favicons, update all applicable copies:

- `static/brand/`
- `static/static/`
- `backend/open_webui/static/`

Browsers prefer `favicon.svg` over PNG favicon files, so keep SVG and PNG variants aligned.

## Backend Map

- `backend/open_webui/__init__.py`: Typer CLI entrypoint for `serve` and `dev`.
- `backend/open_webui/main.py`: FastAPI app, lifespan setup, middleware, route registration, provider proxy endpoints, frontend/static mounting.
- `backend/open_webui/env.py`: environment bootstrap and path constants such as `DATA_DIR`, `STATIC_DIR`, and `FRONTEND_BUILD_DIR`.
- `backend/open_webui/config.py`: `ConfigVar` declarations and environment-backed defaults.
- `backend/open_webui/internal/config.py`: persisted config row plus in-memory `ConfigState`.
- `backend/open_webui/internal/db.py`: SQLAlchemy async engine, SQLite/PostgreSQL/SQLCipher handling, SQLite tuning.
- `backend/open_webui/models/`: Peewee domain models used by request handlers.
- `backend/open_webui/routers/`: FastAPI domain routers.
- `backend/open_webui/socket/main.py`: Socket.IO real-time events and Redis coordination.
- `backend/open_webui/utils/`: shared auth, ASGI middleware, retrieval, tools, MCP, telemetry, and related helpers.
- `backend/open_webui/migrations/`: Alembic migrations.

Important backend patterns:

- Config values are declared in `config.py` as `ConfigVar` descriptors, persisted in the config DB row, and exposed through `app.state.config`; environment variables take precedence.
- The codebase uses both Peewee and SQLAlchemy against the same database. Match the surrounding module's ORM style.
- Middleware is pure ASGI where possible; avoid introducing `BaseHTTPMiddleware` unless there is a clear reason.
- `/ollama` and `/openai` proxy upstream providers; `/api/chat/completions` routes by model metadata.

## Frontend Map

- `src/routes/`: SvelteKit routes.
  - `(app)/`: authenticated app shell: home, chat, workspace, admin, notes, calendar, channels, playground, automations.
  - `auth/`: login/signup/SSO pages.
  - `s/`: shared public chat pages.
  - `watch/`: WebRTC watch page.
- `src/lib/stores/index.ts`: central writable stores such as `user`, `config`, `socket`, `theme`, `chatId`, `mobile`, and `WEBUI_NAME`.
- `src/lib/apis/`: typed REST/SSE/WebSocket client helpers.
- `src/lib/components/`: domain components for chat, layout, common primitives, admin, workspace, automations, calendar, notes, and channels.
- `src/lib/i18n/` and `src/lib/i18n/locales/`: i18next setup and translations.

Frontend rules:

- Use SvelteKit and existing component conventions.
- Add/update translation keys with `npm run i18n:parse` when user-facing strings change.
- Keep branding routed through stores/config where possible instead of hardcoding product names.

## Sakrylle OIDC Documentation Governance

`oidc-docs/` is the tracked product-local documentation area for Sakrylle Web.

Allowed local docs:

- `oidc-docs/README.md`
- `oidc-docs/local-integration.md`
- `oidc-docs/implementation-status.md`
- `oidc-docs/troubleshooting.md`
- `oidc-docs/historical/`

Canonical shared platform docs live in `../sub2api/sakrylle-docs/`, especially:

- `10-platform-identity/current-state.md`
- `10-platform-identity/rp-integration-guide.md`
- `10-platform-identity/commercial-boundaries.md`
- `10-platform-identity/configuration-isolation.md`

Do not duplicate OIDC Provider protocol, claims policy, roadmap, risk register, or design-system content in this repo. Link to the center docs.

Update local `oidc-docs/` when changing:

- Web OIDC/Authlib configuration
- `OPENID_PROVIDER_URL`
- OAuth client settings
- Callback or logout behavior
- `DATA_DIR`
- Sakrylle branding, manifests, or static assets
- Web rollout status

Also update the center docs when the shared platform contract changes.

## Release And Deployment Notes

- CI builds the deploy image on push to `theme/sakrylle`.
- The server compose file `deploy/docker-compose.sakrylle-web.yml` pulls `ghcr.io/ranshen1209/sakrylle-web`.
- Local builds are for development unless explicitly promoted through the release path.
