---
title: Sakrylle Web Troubleshooting
status: local
scope: product-local
canonical_source: ../../sub2api/sakrylle-docs/10-platform-identity/rp-integration-guide.md
last_verified: 2026-06-06
---

# Sakrylle Web Troubleshooting

Use this page for product-local failure modes only. For endpoint semantics, scopes, claims, and token boundaries, use the canonical center docs.

## First checks

- Confirm the product is using the intended Sakrylle issuer and API base.
- Confirm the product-specific client id, redirect URI, and scopes match the center registration matrix.
- Confirm local storage paths / bundle ids / data directories do not collide with upstream software.
- Confirm logs do not expose OAuth codes, access tokens, refresh tokens, id tokens, or full token responses.

## OIDC setup failures

### OIDC button is missing on `/auth`

Check deployment config and `/api/config`:

- `OAUTH_CLIENT_ID` is set.
- `OPENID_PROVIDER_URL` is set.
- For the approved Sakrylle Web confidential client path, `OAUTH_CLIENT_SECRET` is set.
- `OAUTH_PROVIDER_NAME` is set to the intended button label, for example `Sakrylle SSO`.
- If SSO-only auto-redirect is expected, `ENABLE_LOGIN_FORM=False`, `ENABLE_LDAP=False`, and `OAUTH_AUTO_REDIRECT=True` are all effective.

### Login redirects to the wrong host

Check:

- `WEBUI_URL` is the public Web origin, for example `https://chat.sakrylle.com`.
- `OPENID_REDIRECT_URI` exactly matches the IdP client registration.
- The registered callback path is `/oauth/oidc/login/callback` for the built-in `oidc` provider slug.
- Reverse proxy headers preserve the public scheme/host.

### Token exchange fails with `invalid_client`

For the confidential client deployment:

- `OAUTH_CLIENT_SECRET` must match the secret whose hash is stored in the Sakrylle API IdP.
- `OAUTH_TOKEN_ENDPOINT_AUTH_METHOD` must match the IdP registration; current deployment guidance uses `client_secret_post`.
- Keep `OAUTH_CODE_CHALLENGE_METHOD=S256` when the client registration also requires PKCE.
- Do not commit secrets to this repository; install them only in the deployment `.env` or secret manager.

### Callback succeeds at the IdP but Web remains logged out

Check:

- Browser cookies are not blocked.
- HTTPS deployments set `WEBUI_SESSION_COOKIE_SECURE=True` and `WEBUI_AUTH_COOKIE_SECURE=True`.
- `WEBUI_SECRET_KEY` is stable across restarts.
- If `OAUTH_SESSION_TOKEN_ENCRYPTION_KEY` is set, it is stable across restarts; changing it makes stored OAuth sessions unreadable.
- The callback response reaches `/auth`, where the frontend reads the `token` cookie and calls the session user endpoint.

### Profile fields are missing or wrong

Check local claim mapping:

- `OAUTH_EMAIL_CLAIM=email`
- `OAUTH_USERNAME_CLAIM=name`
- `OAUTH_SCOPES` includes at least `openid email profile`.

For scope/claim semantics, use the canonical RP integration guide instead of duplicating claims policy here.

## Sakrylle API call failures after login

Sakrylle Web should call the Sakrylle API as the logged-in user when the OpenAI-compatible connection is configured with system OAuth:

```bash
OPENAI_API_BASE_URLS=https://api.sakrylle.com/v1
OPENAI_API_KEYS=
OPENAI_API_CONFIGS={"0":{"auth_type":"system_oauth"}}
```

If model/chat calls are unauthorized:

- Confirm the user has an `oauth_session_id` cookie after OIDC login.
- Confirm `OAUTH_SCOPES` includes the `/v1` scopes needed by the selected endpoints.
- Confirm the IdP returned an access token and, when long sessions are expected, a refresh token.
- Confirm the OpenAI connection config did not fall back to bearer auth with an empty or stale API key.

## Logout failures

The Web signout route clears local auth state first, deletes the stored OAuth session row, and then attempts IdP logout.

If upstream logout does not happen:

- Confirm discovery contains `end_session_endpoint`, or set `OPENID_END_SESSION_ENDPOINT=https://sub.sakrylle.com/oauth/logout` explicitly.
- Confirm `WEBUI_AUTH_SIGNOUT_REDIRECT_URL` is allowlisted by the IdP when required.
- Confirm the browser is navigating to the `redirect_url` returned by `/api/v1/auths/signout`.

If discovery is temporarily unavailable, local logout should still complete and fall back to `WEBUI_AUTH_SIGNOUT_REDIRECT_URL` or `/auth`.

## File upload missing from the chat "+" menu

If the chat input "+" menu only shows Capture/screenshot and no "Upload Files" / attach options:

- Confirm `SAKRYLLE_ENABLE_RETRIEVAL_ROUTER=True` is present in the server `.env`. All upload items gate on `features.enable_retrieval`, which maps to this flag; Capture is the only ungated item, so it is all that survives when the flag is off.
- The server compose (`/opt/stack/docker-compose.yml`) loads `sakrylle-web` via `env_file` only (no `environment:` block), so the flag MUST live in `.env` to reach the container. The repo `deploy/docker-compose.sakrylle-web.yml` sets it in `environment:`, but that file is not what the server runs.
- Verify it reached the container: `docker exec sakrylle-web env | grep SAKRYLLE_ENABLE_RETRIEVAL_ROUTER`, and that `/api/v1/retrieval/` returns a non-404 status (the router only registers when the flag is true).
- `features.enable_retrieval` in `/api/config` is only returned to authenticated requests, so an unauthenticated `curl` shows it absent even when the flag is on — verify via the env var and route instead.
- Even with the flag on, a user also needs `chat.file_upload` permission and a model that supports file upload for the items to render.
- Defaults stay lightweight: `BYPASS_EMBEDDING_AND_RETRIEVAL=True` and `VECTOR_DB=''` (NoOp) mean full-context injection with no embeddings — no chromadb/torch load on the slim image. Restart the container and have users re-login after enabling.

## Web search missing or returning no results

If the chat "+" / message-input web-search toggle is absent, or searches return nothing:

- Web search rides on the retrieval router, so `SAKRYLLE_ENABLE_RETRIEVAL_ROUTER=True` must be set first — the whole `/api/v1/retrieval/process/web/search` endpoint only registers when it is. Then `ENABLE_WEB_SEARCH=True` and `WEB_SEARCH_ENGINE=duckduckgo` (no API key needed) turn the feature on.
- Set `BYPASS_WEB_SEARCH_EMBEDDING_AND_RETRIEVAL=True` so fetched page content is injected straight into context with no embedding/vector DB — this keeps it safe on the slim image (no chromadb/torch). The full chain (DuckDuckGo search + web-loader page fetch) was verified end-to-end on the slim image 2026-06-13.
- All three keys MUST live in the server `.env` (compose uses `env_file` only). Verify they reached the container: `docker exec sakrylle-web env | grep -E 'ENABLE_WEB_SEARCH|WEB_SEARCH_ENGINE|BYPASS_WEB_SEARCH'`.
- `features.enable_web_search` in `/api/config` is only returned to authenticated requests (like `enable_retrieval`), so an unauthenticated `curl` shows it absent even when on — check the env var instead.
- Restart the container after enabling. Because the flag is read from `/api/config`, an open session only needs a page refresh for the toggle to appear — no re-login (the JWT is unaffected). Re-login is only required when `OAUTH_SCOPES` changes, since that alters token contents.
- No results from a working setup usually means egress/rate-limit: DuckDuckGo (`ddgs`) honors `HTTPS_PROXY`/`HTTP_PROXY` from the environment; a `RatelimitException` is caught and returns an empty list (logged at error level).

## Non-admin users see no models (admin sees them)

If the model selector shows "未找到结果" / "No results found" for a regular user but the admin account sees the full list and the group dropdown:

- This is **not** a gateway or OAuth-scope problem. Models are fetched live per-user from the gateway (`auth_type=system_oauth` forwards each user's own OAuth token; `ENABLE_BASE_MODELS_CACHE` defaults `False`, so `/api/models` refetches per request), so the gateway already returns exactly the groups/models that user may use.
- The culprit is Open WebUI's own access-control layer: `get_filtered_models()` in `backend/open_webui/utils/models.py` hides any model that has **no DB `info` entry** from non-admins (the `elif user.role == 'admin'` branch — only admins see "unconfigured" models). Admins bypass filtering entirely because `BYPASS_ADMIN_ACCESS_CONTROL` defaults `True`. Live gateway models never have a DB entry, so non-admins get an empty list while admins get everything.
- Fix: set `BYPASS_MODEL_ACCESS_CONTROL=True` in the server `.env` and recreate the container. Each user then sees exactly their own gateway-returned models; the gateway remains the sole authority for access + billing (enforced by the `<group_id>:` model-id prefix at chat time). Deployed 2026-06-13.
- Verify: `docker exec sakrylle-web env | grep BYPASS_MODEL_ACCESS_CONTROL`. Users only need a page refresh, no re-login (the JWT is unaffected).
- Caveat: this flag also makes any DB-backed workspace model skip Open WebUI's access control. Fine for the all-models-from-gateway setup; revisit if you ever rely on Open WebUI's own per-group model grants.

## Branding drift

If favicon, splash, PWA icon, or manifest still show Open WebUI:

- Check the served `/manifest.json`; the backend route generates this at runtime from `WEBUI_NAME` and Sakrylle colors.
- Check the mounted static directory in production: `/opt/stack/sakrylle-web/static` should be synchronized with tracked `static/brand/`.
- Check container mount target: `/app/backend/open_webui/static/static:ro`.
- Check `/static/favicon.svg`, `/static/favicon.png`, `/static/splash.png`, `/static/splash-dark.png`, `/static/logo.png`, and PWA icons.
- Clear browser/PWA cache or uninstall and reinstall the PWA after icon changes.

## Canonical references

- [OIDC current state](../../sub2api/sakrylle-docs/10-platform-identity/current-state.md)
- [RP integration guide](../../sub2api/sakrylle-docs/10-platform-identity/rp-integration-guide.md)
- [Commercial boundaries](../../sub2api/sakrylle-docs/10-platform-identity/commercial-boundaries.md)
- [Configuration isolation](../../sub2api/sakrylle-docs/10-platform-identity/configuration-isolation.md)
