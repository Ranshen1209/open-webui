# Docker Compose Overlays

This directory contains optional Docker Compose overlays for local and specialized deployments.

The default compose entry point remains the repository root `docker-compose.yaml`. Use overlays with explicit `-f` arguments, for example:

```bash
docker compose -f docker-compose.yaml -f deploy/compose/docker-compose.gpu.yaml up -d
```

The interactive launcher at `scripts/docker/docker-compose-launcher.sh` resolves these paths automatically.

Keep production Sakrylle Web deployment files in `deploy/`, not in this overlay directory.
