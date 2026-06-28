# Docker Scripts

Docker helper scripts live here to keep the repository root focused on package and framework entry points.

Common commands:

```bash
scripts/docker/docker-compose-launcher.sh --help
scripts/docker/docker-run.sh
scripts/docker/docker-cleanup.sh
```

The root `docker-compose.yaml` is still the default compose file. Optional overlays live in `deploy/compose/`.
