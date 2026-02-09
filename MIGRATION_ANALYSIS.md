# Docker Registry UI – Riot to Angular Migration Analysis

## 1. Project structure (current Riot app)

```
src/
├── components/
│   ├── docker-registry-ui.riot    # Root app: header, router, footer, snackbar, auth
│   ├── catalog/
│   │   ├── catalog.riot            # Repositories list from /v2/_catalog
│   │   └── catalog-element.riot   # Single repo/namespace (expandable, tag count)
│   ├── tag-list/
│   │   ├── tag-list.riot          # Tags for one image from /v2/<name>/tags/list
│   │   ├── tag-table.riot         # Table: date, size, digest, tag, arch, history, delete
│   │   ├── pagination.riot
│   │   ├── image-date.riot, image-size.riot, image-tag.riot, image-content-digest.riot
│   │   ├── copy-to-clipboard.riot, remove-image.riot, tag-history-button.riot
│   │   ├── architectures.riot
│   │   └── ...
│   ├── tag-history/
│   │   ├── tag-history.riot       # Image history (blobs), multi-arch tabs
│   │   ├── tag-history-element.riot
│   │   └── ...
│   ├── dialogs/
│   │   ├── dialogs-menu.riot      # Add/Change/Remove registry URL
│   │   ├── add-registry-url.riot, change-registry-url.riot, remove-registry-url.riot
│   │   ├── confirm-delete-image.riot
│   │   └── dockerfile.riot
│   ├── search-bar.riot
│   ├── error-page.riot
│   └── version-notification.riot
├── scripts/
│   ├── http.js          # XHR wrapper, 401 + Bearer/Basic auth, cache
│   ├── cache-request.js # sessionStorage for blobs/manifests by sha256
│   ├── repositories.js  # getBranching (catalog namespace tree)
│   ├── docker-image.js  # DockerImage class: manifests, blobs, size, date, digest
│   ├── router.js        # Hash routes + query (url, page)
│   ├── utils.js         # bytesToSize, dateFormat, getPage, getNumPages, registry LS, theme helpers
│   ├── error.js         # DockerRegistryUIError
│   ├── taglist-order.js # taglistOrderParser, getTagComparator
│   └── theme.js         # loadTheme, LIGHT_THEME, DARK_THEME
├── style.scss
├── index.html
└── index.js
```

---

## 2. Riot components and functionality

| Component | Purpose |
|-----------|---------|
| **docker-registry-ui** | Root: navbar (title, search, dialogs menu), router outlet, error page, auth popup, snackbar, footer (theme switch when THEME=auto). State: registryUrl, name, pullUrl, filter, pageError, snackbarMessage, themeSwitch, auth dialog. |
| **catalog** | Fetches `/v2/_catalog?n=limit`, applies branching, shows count. Renders list of catalog-element. |
| **catalog-element** | Single repo or namespace node. Expandable; optional tag count via `/v2/<name>/tags/list`. Links to taglist. Filter by search. |
| **tag-list** | Fetches `/v2/<image>/tags/list`, wraps each tag in DockerImage, sorts, paginates. Header with back, pagination, tag-table. |
| **tag-table** | Table: creation date, size, content digest, tag (copy), arch, history button, delete (single/multi). Confirm-delete modal. Sort by date/size, reverse tag order. |
| **tag-history** | Loads DockerImage for image:tag; multi-arch tabs; shows blobs/history; Dockerfile modal. |
| **dialogs-menu** | Dropdown: Add URL, Change URL, Remove URL. Opens add/change/remove registry dialogs. |
| **add/change/remove-registry-url** | Modals to add, set current, or remove registry URL (localStorage). |
| **confirm-delete-image** | Modal: list tags to delete, Delete/Cancel. Uses content digest, DELETE manifest. |
| **dockerfile** | Modal showing Dockerfile/history content. |
| **search-bar** | Input; filters catalog and tag list. CTRL+F / F3 focus. |
| **error-page** | Renders errors: CATALOG_NOT_FOUND, MIXED_CONTENT, INCORRECT_URL, PAGINATION_NUMBER_INVALID, CATALOG_BRANCHING_CONFIGURATION. |
| **version-notification** | Checks version.json / latest, notifies if update available. |
| **pagination** | Page numbers/arrows, calls onPageUpdate. |
| **image-date, image-size, image-tag, image-content-digest** | Display + lazy load via DockerImage events. |
| **copy-to-clipboard** | Copy digest or `docker pull` command. |
| **remove-image** | Delete button or checkbox for multi-delete. |
| **tag-history-button** | Link to tag history route. |
| **architectures** | Shows arch from DockerImage (multi-manifest). |

---

## 3. Routes and navigation

- **Router**: Hash-based (`@riotjs/route`). Base pattern: `([^#]*?)/(\?[^#]*?)?(#!)?(/?)`
- **Routes**:
  - **Home (catalog)**: `baseRoute` → catalog.
  - **Tag list**: `baseRoute + 'taglist/(.*)'` → tag-list, image = `router.getTagListImage()`.
  - **Tag history**: `baseRoute + 'taghistory/(.*)'` → tag-history, image = `router.getTagHistoryImage()`, tag = `router.getTagHistoryTag()`.
- **Query params**: `url` (registry URL), `page` (tag list page). Read/written in router.js; `updateQueryString`, `updateUrlQueryParam`, `updatePageQueryParam`.
- **Links**: `router.home()`, `router.taglist(image)`, `router.history(image, tag)`.

---

## 4. State management

- **Component state**: Each Riot tag has `state`; `this.update({ ... })` triggers re-render.
- **Global/shared**:
  - **Registry URL / list**: From root props (env), or `router.getUrlQueryParam()`, or `getRegistryServers()[0]`, or `window.location.origin + path`. Stored in query `url` and/or localStorage `registryServer` (array).
  - **Theme**: `loadTheme(props, element.style)` sets CSS vars; preference in localStorage `registryUiTheme`.
  - **Filter**: Root state `filter` passed down to catalog and tag-list.
- **No NgRx-style store**; state is component tree + router + localStorage.

---

## 5. API endpoints and data models

### Registry API (Docker Registry V2)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/v2/` | Registry check (not used in UI for catalog) |
| GET | `/v2/_catalog?n=<limit>` | List repository names (array). 400 with errors array if pagination invalid. |
| GET | `/v2/<name>/tags/list` | List tags for repository (array of strings). |
| GET | `/v2/<name>/manifests/<reference>` | Manifest (v2, OCI index/list). Accept: manifest list + OCI index. |
| GET | `/v2/<name>/blobs/<digest>` | Blob (config for created date, history). |
| DELETE | `/v2/<name>/manifests/<digest>` | Delete manifest (all tags sharing that digest). Needs Docker-Content-Digest. |

### Auth

- **Basic**: Browser credentials; `withCredentials: true` when `REGISTRY_SECURED=true`.
- **Bearer**: On 401, parse `WWW-Authenticate` (realm, service, scope), GET realm?service&scope with credentials, then use `token` or `access_token` in `Authorization: Bearer`.

### Data concepts

- **Repository**: string (name).
- **Catalog**: `{ repositories: string[] }`.
- **Tags list**: `{ tags: string[] }`.
- **Manifest**: Docker v2 or OCI; can be list/index with `manifests[]` (platform, digest).
- **DockerImage** (script): name, tag, size, creationDate, sha256, contentDigest, layers, blobs, variants (multi-arch). Events: size, sha256, creation-date, content-digest, blobs, list.

### Caching

- **cache-request.js**: GETs to URLs ending `blobs/sha256:...` or `manifests/sha256:...` cached in sessionStorage by digest; response text and Docker-Content-Digest.

---

## 6. Third-party dependencies

| Package | Purpose |
|---------|---------|
| riot | Component runtime |
| @riotjs/route | Hash routing |
| @riotjs/observable | Events on DockerImage |
| riot-mui (joxit/riot-5-mui) | Material-like components: navbar, footer, card, spinner, button, checkbox, tabs, snackbar, dropdown, popup, input, switch |
| rollup + rollup-plugin-riot, scss, babel, etc. | Build |

---

## 7. Styling

- **SCSS**: `src/style.scss`; imports riot-mui component SCSS, roboto, material-symbols.
- **Theming**: CSS variables (e.g. `--primary-text`, `--header-background`) set in theme.js from LIGHT_THEME / DARK_THEME and optional `THEME_*` props.
- **Responsive**: e.g. search-bar hidden on small width; tag-list content digest chars depend on innerWidth.

---

## 8. Build and runtime config

- **Build**: Rollup; entry `src/index.js`; output IIFE + CSS; dev server port 8000.
- **Config injection**: Production build uses placeholders in `index.html` (e.g. `${REGISTRY_URL}`). At container start, `90-docker-registry-ui.sh` runs `sed` to replace from env (REGISTRY_URL, SINGLE_REGISTRY, THEME_*, etc.). So “config” is HTML attributes on `<docker-registry-ui>`.
- **Nginx**: Serves static files; optional proxy to registry when `NGINX_PROXY_PASS_URL` is set (env-substituted in default.conf).

---

## 9. Angular migration mapping (summary)

- **List/catalog** → `nz-table` or custom list with `nz-card`; catalog branching = nested expandable list.
- **Tag list/table** → `nz-table` with sorting, pagination, row actions (copy, delete, history).
- **Forms (registry URL)** → `nz-form` + `nz-input`.
- **Modals** → `nz-modal` (confirm delete, add/change/remove registry, dockerfile).
- **Navigation** → Angular Router (hash or path); `nz-breadcrumb` for tag list / history.
- **Header** → Layout header with search and `nz-dropdown` for registry menu.
- **Theme** → Keep CSS vars; optional nz-theme or override ng-zorro vars.
- **HTTP** → HttpClient; optional interceptor for auth and cache (blobs/manifests).
- **State** → Services with BehaviorSubject for registry URL, filter, theme; optional NgRx if needed later.

---

## 10. Environment / config (for Angular)

Current config is injected at container startup into HTML. For Angular, options:

- **Build-time**: `environment.ts` / `environment.prod.ts` for defaults; replace at Docker build with env-specific file or script.
- **Runtime**: Serve `config.json` or embed in `index.html` and read from script; app reads on bootstrap.

Preserve same env names (REGISTRY_URL, SINGLE_REGISTRY, DELETE_IMAGES, THEME, etc.) so the same Docker entrypoint or a small adapter can substitute them into a single config asset or index.
