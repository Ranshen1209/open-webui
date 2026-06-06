---
title: Sakrylle Web Implementation Status
status: local
scope: product-local
canonical_source: ../../sub2api/sakrylle-docs/10-platform-identity/current-state.md
last_verified: 2026-06-06
---

# Sakrylle Web Implementation Status

Current documentation status: **local implementation has been completed and pushed on `theme/sakrylle` at `be4448136`; automated local verification passed before commit; Sakrylle SSO still requires IdP client registration, deployment secrets, and staging smoke tests.**

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
- [x] Sakrylle Web manifest/static brand assets are present in tracked static paths and documented in `static/brand/README.md`.
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

## Remaining blockers

- Production IdP client registration and secret installation are external deployment actions and require separate approval.
- Automated tests do not prove real OIDC login/logout; staging smoke testing is required.
