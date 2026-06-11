# Slim Sakrylle Web for 2 vCPU / 2 GB RAM deploy

**Date:** 2026-06-11
**Branch:** `theme/sakrylle`
**Status:** Approved design — pending implementation plan

## 1. Purpose

The Sakrylle Web fork of Open WebUI is intended for deployment on a 2 vCPU / 2 GB RAM server, serving a small team that needs:

- Web-based chat against an OpenAI-compatible upstream
- User accounts, admin panel, OIDC login (Sakrylle SSO)
- Image generation and audio (STT/TTS) **proxied to remote APIs**
- Memories, Notes, Calendar, Channels, Automations, Tools / MCP / function-calling

The stock distribution drags in `torch`, `transformers`, `sentence-transformers`, `chromadb`, `playwright`, OCR/PDF stacks, and clients for five different vector DBs — all of which load at backend import time, putting the resident-set size at ~1.4 GB on cold start and leaving no headroom on a 2 GB host. Document RAG, in-app web search, Ollama upstream, and code interpreter are out of scope for this deployment.

Goal: shrink resident RAM to **< 700 MB** and image size to **< 2.5 GB**, without losing the in-scope features and without forking from upstream Open WebUI any harder than necessary.

## 2. Scope

### In scope (preserved)
- Chat UI, chat history, model selector against OpenAI-compatible upstreams
- Admin panel (users, model config, system settings)
- OIDC / Authlib auth flow (Sakrylle SSO) — **untouched** per CLAUDE.md governance
- Memories feature
- Notes / Calendar / Channels / Automations pages
- Tools / MCP / function-calling routes
- Image generation — **proxy mode only** (remote API)
- Audio STT/TTS — **proxy mode only** (OpenAI Whisper / TTS or equivalent)
- Socket.IO real-time chat streaming
- Sakrylle branding, theme, favicons, manifests

### Out of scope (cut on the server)
- Document upload / knowledge bases / RAG retrieval
- In-process embedding (`sentence-transformers`, MiniLM auto-fetch)
- In-process reranking (`colbert`, cross-encoder)
- Vector DBs running inside the backend process (Chroma + the four other client libs)
- Web search inside chat (Playwright + browser binaries)
- Code interpreter (Pyodide frontend bundle + Jupyter executor)
- Ollama upstream route (`/ollama/*`)
- OCR / `unstructured` / `nltk` document parsing stack
- OpenTelemetry exporters
- Version-update probe at startup

### Explicitly untouched
- Sakrylle OIDC / Authlib configuration
- Brand assets (`static/`, `static/brand/`, `backend/open_webui/static/`)
- `oidc-docs/` content
- Database schema and Alembic migrations
- Socket.IO core wiring

## 3. Approach

We chose **Approach B — build-time prune + route gating** over two alternatives:

| Approach | Verdict | Reason |
|---|---|---|
| A: env-var only | Rejected | Heavy libs are imported at module load via `routers/retrieval.py` regardless of the runtime flag — RAM does not drop. |
| **B: prune + gate (chosen)** | **Adopted** | Real RAM and image reduction; reversible by flipping defaults and restoring `requirements.txt`; minimal divergence from upstream. |
| C: hard delete | Rejected | Permanent fork pain on every `git pull`; flag-gated path captures ~99 % of the benefit with none of the merge cost. |

## 4. Design

### 4.1 Backend env defaults (`backend/open_webui/env.py` and `config.py`)

Change defaults so an un-configured deployment lands in the slim profile.

| Symbol | File | Current default | New default | Effect when default |
|---|---|---|---|---|
| `ENABLE_OLLAMA_API` | `config.py` | `True` | `False` | Admin UI doesn't try to enumerate Ollama models |
| `ENABLE_CODE_EXECUTION` | `config.py` | `True` | `False` | No Jupyter exec call path |
| `ENABLE_CODE_INTERPRETER` | `config.py` | `True` | `False` | UI toggle off |
| `RAG_EMBEDDING_ENGINE` | `config.py` | `''` (local) | `'openai'` | Safety: even if retrieval gets re-enabled, no MiniLM download |
| `BYPASS_EMBEDDING_AND_RETRIEVAL` | `config.py` | `False` | `True` | Skip embedding/retrieval inside the chat completion pipeline |
| `ENABLE_VERSION_UPDATE_CHECK` | `env.py` | `True` | `False` | No outbound probe on startup |

Add two new project-local flags (read once at process start, no DB persistence):

```python
# backend/open_webui/env.py
SAKRYLLE_ENABLE_RETRIEVAL_ROUTER = (
    os.getenv("SAKRYLLE_ENABLE_RETRIEVAL_ROUTER", "False").lower() == "true"
)
SAKRYLLE_ENABLE_OLLAMA_ROUTER = (
    os.getenv("SAKRYLLE_ENABLE_OLLAMA_ROUTER", "False").lower() == "true"
)
```

**Naming rationale:** `SAKRYLLE_*` prefix keeps these orthogonal to upstream `ENABLE_OLLAMA_API` (which controls UI/admin behavior, not router registration), reducing rebase conflicts.

### 4.2 Conditional router registration (`backend/open_webui/main.py`)

Today both routers are unconditionally registered. They are also imported unconditionally at the top of `main.py`, which is what actually pulls `sentence_transformers` / `chromadb` / `playwright` into the process.

**Pattern:** move the imports inside the `if` block.

```python
# At top of main.py — REMOVE these unconditional lines:
# from open_webui.routers import retrieval, ollama

# In the route-registration section:
if SAKRYLLE_ENABLE_RETRIEVAL_ROUTER:
    from open_webui.routers import retrieval  # local import: only here is the heavy chain loaded
    app.include_router(
        retrieval.router, prefix="/api/v1/retrieval", tags=["retrieval"]
    )

if SAKRYLLE_ENABLE_OLLAMA_ROUTER:
    from open_webui.routers import ollama
    app.include_router(ollama.router, prefix="/ollama", tags=["ollama"])
```

In `lifespan()`, gate any startup hook that touches `app.state.EMBEDDING_FUNCTION`, `RERANKING_FUNCTION`, or the vector DB clients behind the same flag.

The `/api/config` endpoint (defined in `main.py`, returns the public client-bootstrap config — grep for the existing `features` dict to find the exact spot) must surface three new booleans for the frontend to read:

```json
"features": {
  "enable_retrieval": false,
  "enable_web_search": false,
  "enable_code_interpreter": false
}
```

(Web search and code interpreter aren't tied to the retrieval router, but we expose them through the same config-features struct for consistent UI gating.)

### 4.3 Dependency pruning (`backend/requirements.txt`)

Remove (16 packages, ~3 GB of layers across torch + CUDA-less wheels + onnxruntime + transformers cache):

```
torch
transformers
sentence-transformers
chromadb
weaviate-client
opensearch-py
qdrant-client
pgvector
pymilvus
elasticsearch
playwright
opencv-python-headless
rapidocr-onnxruntime
unstructured
nltk
langchain-classic
```

**Keep:** `langchain`, `langchain-community`, `langchain-text-splitters` — used outside `retrieval/` (e.g. message-content utilities, structured-output helpers).

**Verification sweep before committing:** `grep -rn "import {pkg}" backend/open_webui/ --include='*.py' | grep -v retrieval/` for each removed package. Any hit outside `retrieval/` must be either (a) inside an already-gated code path, or (b) shimmed to a clear error message instructing the operator to set the flag.

### 4.4 Frontend build (`package.json`)

```diff
- "build": "npm run pyodide:fetch && vite build"
+ "build": "vite build"
```

Keep the `pyodide:fetch` script definition itself — useful for local dev if a developer wants to test code interpreter. Only the production build chain drops it.

### 4.5 Frontend UI gating

Hide entry points behind `$config.features.*` flags. **Do not delete components** — gating preserves a one-line rollback path and keeps upstream merges sane.

| Entry point | File | Gate |
|---|---|---|
| Chat input "upload file" button | `src/lib/components/chat/MessageInput.svelte` | `$config?.features?.enable_retrieval` |
| Chat input "web search" toggle | `src/lib/components/chat/MessageInput.svelte` (or its `Controls.svelte`) | `$config?.features?.enable_web_search` |
| Chat input "code interpreter" toggle | same | `$config?.features?.enable_code_interpreter` |
| Sidebar → Workspace → Knowledge link | `src/lib/components/layout/Sidebar.svelte` or `src/routes/(app)/workspace/+layout.svelte` | `$config?.features?.enable_retrieval` |
| Admin → Settings → Documents tab | `src/lib/components/admin/Settings/Documents.svelte` (and the tab list in `Settings.svelte`) | `$config?.features?.enable_retrieval` |
| Admin → Settings → Web Search tab | `src/lib/components/admin/Settings/WebSearch.svelte` + tab list | `$config?.features?.enable_web_search` |
| Admin → Settings → Code Execution tab | `src/lib/components/admin/Settings/CodeExecution.svelte` + tab list | `$config?.features?.enable_code_interpreter` |
| Admin → Connections → Ollama block | `src/lib/components/admin/Settings/Connections.svelte` | `$config?.features?.enable_ollama_api` (existing flag) |

The exact filenames above are the documented Open WebUI layout per `CLAUDE.md`; if the implementer finds a renamed file during execution, the rule is "gate the entry point that drives this user flow," not "edit this exact path."

## 5. Data Flow Impact

No schema changes. No migration. The disabled routes simply 404. Existing chat/users/memories/notes/etc. rows are untouched.

Old chat records that referenced uploaded files keep their references in `chat.history`; the file blobs (if any are still in `backend/data/uploads/`) remain on disk untouched. The chat will render with the file-attachment chip but clicking it will 404 — acceptable per the deployment scope (no users have actually uploaded files on the new server).

## 6. Error Handling

- **Frontend calls a disabled route**: UI gating prevents this in normal flows. If a stale client hits `/api/v1/retrieval/...`, FastAPI returns 404 — acceptable, no special handler needed.
- **Operator flips `SAKRYLLE_ENABLE_RETRIEVAL_ROUTER=True` on a slim image**: backend startup will fail with `ModuleNotFoundError: sentence_transformers`. This is the desired hard signal that the slim build cannot host retrieval. Document in `oidc-docs/implementation-status.md` the requirement to use the full requirements file in that case.
- **Operator forgets `WEBUI_SECRET_KEY`**: existing upstream guard already errors out clearly. Local dev should persist a key in `backend/.webui_secret_key`; server deploy should mount it as a Docker secret or env var.

## 7. Testing

### 7.1 Manual smoke (local)

**Preconditions:** an OpenAI-compatible chat endpoint configured in admin → Connections; remote image-gen endpoint and remote STT/TTS endpoint configured if those features will be smoked. If a feature lacks a configured endpoint, mark its step "skipped" rather than treating it as a failure.

1. `pip install -r backend/requirements.txt` in a fresh venv → confirm no torch / sentence-transformers / chromadb / playwright in the install plan.
2. `WEBUI_SECRET_KEY=... uvicorn open_webui.main:app --host 127.0.0.1 --port 8080`.
3. `curl -fsS http://127.0.0.1:8080/health` → `200`.
4. `ps -o rss= -p $(pgrep -f 'open_webui.main:app' | head -1)` → confirm < 700 MB.
5. Browser: log in via OIDC → send a chat to OpenAI-compatible upstream → confirm streamed response.
6. Confirm admin panel loads, Memories / Notes / Calendar / Channels / Automations render.
7. Confirm the upload-file / web-search / code-interpreter buttons are absent from chat input.
8. Image generation round-trips one image (if remote endpoint configured).
9. Audio: STT one short clip, TTS one short response (if remote endpoints configured).

### 7.2 Docker build verification
1. Build the amd64 deploy image with the slim `requirements.txt`.
2. `docker image inspect` → size < 2.5 GB.
3. Run on a 2 GB-limited container (`--memory 2g`) → confirm no OOM during smoke 1-9.

### 7.3 Rollback drill
1. Set `SAKRYLLE_ENABLE_RETRIEVAL_ROUTER=True` on the slim image → expect `ModuleNotFoundError` at import.
2. Switch to a full-requirements image, same flag → expect retrieval router to register and serve normally.

## 8. Rollback

The change is reversible at three levels:

1. **Operational**: revert defaults (`SAKRYLLE_ENABLE_RETRIEVAL_ROUTER=True` etc. via env) **and** redeploy with full `requirements.txt`. Frontend will re-show the gated entry points because the backend's `/api/config` features struct will report them enabled.
2. **Code-level**: `git revert` the implementation commit(s). Restores all defaults, re-adds dependencies, removes UI gating.
3. **Partial revert**: any single feature can be re-enabled independently by flipping its flag — image gen, audio, and the rest of chat are not coupled to the retrieval router.

## 9. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| A removed package is imported outside `retrieval/` and breaks startup | Medium | §4.3 verification sweep before committing; pre-commit `python -c 'import open_webui.main'` smoke. |
| Frontend gating misses an entry point and a user hits a 404 | Low | UI gates listed in §4.5 by file; QA pass per §7.1 step 7. |
| Image gen / audio "remote-only" paths still touch a removed dep | Low | These routers (`routers/images.py`, `routers/audio.py`) are independent of `retrieval/`; verify via grep during §4.3 sweep. |
| Operator confuses upstream `ENABLE_OLLAMA_API` with new `SAKRYLLE_ENABLE_OLLAMA_ROUTER` | Medium | Document both in `oidc-docs/implementation-status.md` with a short table. |
| Future upstream merge re-adds the unconditional `from open_webui.routers import retrieval` import | High | Add a regression note in `oidc-docs/` referencing this spec; the conditional-import pattern is a small, easily-resolved conflict. |

## 10. Out of Scope (deliberately not addressed)

- Migrating the vector store to external pgvector / Qdrant. Not needed because RAG is fully disabled.
- Multi-worker uvicorn or gunicorn workers. Single worker is correct for 2 vCPU; Socket.IO sharing would need Redis and is unnecessary at this scale.
- Replacing Chroma with a lighter in-process DB. Same reason — no in-process vector store at all.
- Removing langchain entirely. Used outside RAG; pruning is high-risk for marginal gain.
- Replacing Peewee with SQLAlchemy. Upstream dual-ORM stack stays.

## 11. Expected Outcome

| Metric | Before | After |
|---|---|---|
| Backend resident RAM (idle, one worker) | ~1.4 GB | ~500-600 MB |
| Production Docker image (amd64) | ~6 GB | ~2-2.5 GB |
| Cold-start wall time | ~120 s (HF model fetch dominates) | ~10 s |
| Headroom for upstream connection pool + concurrent chat requests on 2 GB host | ~300 MB | ~1.2 GB |
| Concurrent light-chat users sustainable | 1-2 (OOM-prone) | 10-20 |

## 12. References

- CLAUDE.md — local-dev section and "Sakrylle OIDC Documentation Governance"
- `backend/open_webui/main.py` — current router registration block
- `backend/open_webui/config.py` lines 482-1357 — feature flag inventory
- `backend/requirements.txt` — current dependency list
