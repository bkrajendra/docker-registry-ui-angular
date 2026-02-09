# Docker Registry UI – Angular

Modern UI for Docker Registry built with **Angular 21** and **ng-zorro-antd** (Ant Design).  
This is an Angular migration of the [Riot-based Docker Registry UI](https://github.com/Joxit/docker-registry-ui).

## Features

- Browse repositories (catalog) with optional namespace branching
- View image tags with sorting and pagination
- Tag history (image layers/config) with multi-arch support
- Search/filter in catalog and tag list
- Theme support (light/dark)
- Multi-registry URL support (add/change/remove) when not in single-registry mode

## Prerequisites

- Node.js 20+
- Angular CLI 21 (`npm i -g @angular/cli@21`)

## Installation

```bash
npm install
```

## Development

```bash
ng serve
```

Open http://localhost:4200. Configure your registry (e.g. via “Change URL” in the header) or run the UI behind a proxy that forwards `/v2` to your registry.

## Build

```bash
ng build --configuration production
```

Output: `dist/docker-registry-ui-angular/browser/`

## Docker

### Build and run

```bash
docker build -t docker-registry-ui-angular .
docker run -p 80:80 docker-registry-ui-angular
```

### Docker Compose (UI + Registry)

Runs the UI and a Docker Registry on the same stack. The UI proxies `/v2` to the registry so there are no CORS issues.

```bash
docker compose up -d
```

- **UI**: http://localhost  
- **Registry**: proxied at same origin (no separate port needed for the UI to talk to the registry)

All configuration is via environment variables in `docker-compose.yml`. Key flags:

| Variable | Default | Description |
|----------|---------|-------------|
| `NGINX_PROXY_PASS_URL` | — | Registry URL to proxy (e.g. `http://registry-server:5000`). When set, `/v2` is proxied and the UI uses the same origin. |
| `SINGLE_REGISTRY` | `true` | Hide the add/change/remove registry menu. |
| `DELETE_IMAGES` | `false` | Allow deleting images from the UI. |
| `SHOW_CONTENT_DIGEST` | `false` | Show content digest in the tag list. |
| `SHOW_TAG_HISTORY` | `true` | Show the “History” link per tag. |
| `SHOW_CATALOG_NB_TAGS` | `false` | Show number of tags per repo in the catalog (extra API calls). |
| `CATALOG_ELEMENTS_LIMIT` | `1000` | Max repositories to fetch. |
| `CATALOG_MIN_BRANCHES` / `CATALOG_MAX_BRANCHES` | `1` | Namespace branching depth. |
| `TAGLIST_PAGE_SIZE` | `100` | Tags per page. |
| `TAGLIST_ORDER` | `alpha-asc;num-desc` | Tag sort order. |
| `REGISTRY_SECURED` | `false` | Set `true` if the registry uses Basic Auth. |
| `DOCKER_REGISTRY_UI_TITLE` | `Docker Registry UI` | Title in the header. |
| `THEME` | `auto` | `light`, `dark`, or `auto`. |

For production, run the UI on the same origin as your registry or use `NGINX_PROXY_PASS_URL` so the UI and registry share the same host.

## Configuration

When running in Docker, the entrypoint generates `config.js` from environment variables; the app reads `window.__REGISTRY_CONFIG__` on load.

For local development, the app uses defaults (current origin, single registry off, etc.). Optional `public/config.js` can set `window.__REGISTRY_CONFIG__` if needed.

## Project structure

- `src/app/core` – models, services (registry API, cache, state, error handling)
- `src/app/features` – catalog, tag-list, tag-history
- `src/app/layout` – header, footer
- `src/app/shared` – utils (format, pagination, tag order, repositories branching)

## License

AGPL-3.0 (same as the original Docker Registry UI).
