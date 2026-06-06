---
title: Sakrylle Web Implementation Status
status: local
scope: product-local
canonical_source: ../../sub2api/sakrylle-docs/10-platform-identity/current-state.md
last_verified: 2026-06-06
---

# Sakrylle Web Implementation Status

Current documentation status: **partial: open-webui Authlib/OIDC substrate exists; Sakrylle SSO enablement must be verified by deployment config and smoke tests.**

Canonical platform status lives in [Sakrylle OIDC current state](../../sub2api/sakrylle-docs/10-platform-identity/current-state.md). This file only tracks product-local readiness and gaps.

## Product-local readiness checklist

- [ ] Local configuration points are documented in [local-integration.md](./local-integration.md).
- [ ] Product-specific OAuth/OIDC callback or scheme is documented.
- [ ] Token storage behavior is documented.
- [ ] Login, refresh, revoke/logout, and profile mapping smoke tests are documented.
- [ ] Known security gaps are linked to product implementation tasks.

## Suggested verification

- Check `/api/config` exposes the intended OAuth/OIDC provider state.
- Start login via `/oauth/oidc/login` and verify redirect to Sakrylle issuer.
- Complete callback in a staging/local environment and confirm encrypted OAuth session storage.
- Verify `/userinfo` / profile mapping and logout behavior.

