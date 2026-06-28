# Scripts

Repository scripts are grouped by purpose:

- `docker/` contains local Docker helper scripts and the interactive compose launcher.
- `maintenance/` contains one-off repository maintenance utilities.
- `prepare-pyodide.js` remains at this level because it is called directly by `package.json`.
- `generate-sbom.sh` remains at this level because existing release and security workflows may call it directly.

Prefer adding new scripts under a purpose-specific subdirectory instead of adding more executable files at the repository root.
