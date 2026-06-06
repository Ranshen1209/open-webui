---
title: Sakrylle Web Local Integration
status: local
scope: product-local
canonical_source: ../../sub2api/sakrylle-docs/10-platform-identity/rp-integration-guide.md
last_verified: 2026-06-06
---

# Sakrylle Web Local Integration

This page summarizes only the repository-local OIDC/Sakrylle integration concerns for **Sakrylle Web**.

For protocol details, use the canonical [RP integration guide](../../sub2api/sakrylle-docs/10-platform-identity/rp-integration-guide.md). For current Sakrylle API/OIDC Provider capability, use [current-state.md](../../sub2api/sakrylle-docs/10-platform-identity/current-state.md).

## Local focus areas

- `OPENID_PROVIDER_URL`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `OAUTH_SCOPES`
- open-webui Authlib provider registration and OAuth callback route
- `WEBUI_NAME`, `APP_NAME`, app title, PWA manifest and static branding
- `DATA_DIR` / deployment data isolation
- Sakrylle callback URL and server-side encrypted OAuth session storage
- Historical note: OIDC Provider is no longer blocked on Sakrylle API; current work is client config and validation.

## Preserved historical notes

Detailed original research and development planning were preserved under:

- [historical/research.md](./historical/research.md)
- [historical/development-plan.md](./historical/development-plan.md)

Those files are historical/product-local references. They do not override center platform facts.
