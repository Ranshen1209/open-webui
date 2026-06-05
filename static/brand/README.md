# Sakrylle Web - Brand Assets

This directory contains brand image assets for the Sakrylle Web application.

## Volume Mount

These files are intended to be volume-mounted into the open-webui container:

```
./static/brand:/app/backend/open_webui/static/static:ro
```

## Required Files

The following files are needed for full branding coverage:

| File | Description |
|------|-------------|
| `favicon.ico` | Browser favicon (ICO format) |
| `favicon.png` | Favicon PNG fallback |
| `favicon.svg` | Scalable favicon (SVG) |
| `favicon-96x96.png` | 96x96 favicon for modern browsers |
| `splash.png` | Light-mode splash screen |
| `splash-dark.png` | Dark-mode splash screen |
| `logo.png` | Application logo |
| `web-app-manifest-192x192.png` | PWA icon 192px |
| `web-app-manifest-512x512.png` | PWA icon 512px |
| `site.webmanifest` | PWA manifest file |

## Current Status

- **SVG placeholders** (`favicon.svg`, `logo.svg`): Created as purple circles with the letter "S".
- **PNG files**: Still needed. Use image tools to generate from the SVGs, or replace with final assets.
- **`site.webmanifest`**: Complete.

## Cherry Blossom Logo Specification

The final logo should be a line-drawing cherry blossom:

- 5 petals with white center
- Gradient stroke from coral `#ffab91` to hot-pink `#f06292`
- Style: minimal line art, suitable for favicon and app icon use

Reference artwork: `/Users/ariel/Documents/Design/Material/cherry-blossom_15273565.png`
