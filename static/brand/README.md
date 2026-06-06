# Sakrylle Web - Brand Assets

This directory contains the tracked brand image assets for the Sakrylle Web application.

## Volume Mount

These files are intended to be volume-mounted into the open-webui container:

```
./static/brand:/app/backend/open_webui/static/static:ro
```

For the production deployment described in `deploy/docker-compose.sakrylle-web.yml`, keep `/opt/stack/sakrylle-web/static` synchronized with this directory.

## Required Files

The following files are needed for full branding coverage:

| File | Description |
|------|-------------|
| `favicon.ico` | Browser favicon (ICO format) |
| `favicon.png` | Favicon PNG fallback |
| `favicon.svg` | Scalable favicon (SVG) |
| `favicon-96x96.png` | 96x96 favicon for modern browsers |
| `apple-touch-icon.png` | Apple touch icon |
| `splash.png` | Light-mode splash screen |
| `splash-dark.png` | Dark-mode splash screen |
| `logo.png` | Application logo |
| `logo.svg` | Scalable application logo source |
| `web-app-manifest-192x192.png` | PWA icon 192px |
| `web-app-manifest-512x512.png` | PWA icon 512px |
| `site.webmanifest` | PWA manifest file |

## Current Status

- **SVG source assets**: Sakrylle cherry-blossom mark with dark background and coral-to-pink stroke.
- **PNG/ICO assets**: Generated from `/Users/ariel/Documents/Design/Material/cherry-blossom_15273565.png` for tracked static paths.
- **`site.webmanifest`**: Branded as Sakrylle Web with Sakrylle colors.

## Cherry Blossom Logo Specification

The logo is a line-drawing cherry blossom:

- 5 petals with white center
- Gradient stroke from coral `#ffab91` to hot-pink `#f06292`
- Dark Sakrylle background `#1a1a2e`
- Accent/theme color `#9181bd`
- Style: minimal line art, suitable for favicon and app icon use

Reference artwork: `/Users/ariel/Documents/Design/Material/cherry-blossom_15273565.png`
