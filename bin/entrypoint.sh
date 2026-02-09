#!/bin/sh
# Generate runtime config for Angular app from environment variables.
# Config is written to /usr/share/nginx/html/config.js and loaded by index.html.

set -e

HTML_DIR="${HTML_DIR:-/usr/share/nginx/html}"
CONFIG_JS="${HTML_DIR}/config.js"

# Default base URL (current origin when served)
BASE_URL="${REGISTRY_URL:-}"
if [ -z "$BASE_URL" ]; then
  # When using NGINX_PROXY_PASS_URL, UI and registry are same origin
  BASE_URL="/"
fi

# Build config.js from env (escape for JSON string)
escape() { echo "$1" | sed "s/'/\\\\'/g" | sed 's/"/\\\\"/g'; }
val() {
  if [ -n "$1" ]; then echo "\"$(escape "$1")\""; else echo "null"; fi
}
bool() {
  if [ "$1" = "true" ]; then echo "true"; else echo "false"; fi
}
num() {
  if [ -n "$1" ]; then echo "$1"; else echo "0"; fi
}

# When using proxy, registry is same origin so leave REGISTRY_URL empty for app to use window.location
if [ -n "${NGINX_PROXY_PASS_URL}" ]; then
  REGISTRY_URL="${REGISTRY_URL:-}"
  PULL_URL="${PULL_URL:-}"
else
  REGISTRY_URL="${REGISTRY_URL:-$BASE_URL}"
fi
REGISTRY_TITLE="${REGISTRY_TITLE:-}"
PULL_URL="${PULL_URL:-$REGISTRY_URL}"
DOCKER_REGISTRY_UI_TITLE="${DOCKER_REGISTRY_UI_TITLE:-Docker Registry UI}"
SINGLE_REGISTRY="${SINGLE_REGISTRY:-true}"
DELETE_IMAGES="${DELETE_IMAGES:-false}"
SHOW_CONTENT_DIGEST="${SHOW_CONTENT_DIGEST:-false}"
SHOW_TAG_HISTORY="${SHOW_TAG_HISTORY:-true}"
CATALOG_ELEMENTS_LIMIT="${CATALOG_ELEMENTS_LIMIT:-1000}"
SHOW_CATALOG_NB_TAGS="${SHOW_CATALOG_NB_TAGS:-false}"
CATALOG_DEFAULT_EXPANDED="${CATALOG_DEFAULT_EXPANDED:-false}"
CATALOG_MIN_BRANCHES="${CATALOG_MIN_BRANCHES:-1}"
CATALOG_MAX_BRANCHES="${CATALOG_MAX_BRANCHES:-1}"
TAGLIST_PAGE_SIZE="${TAGLIST_PAGE_SIZE:-100}"
TAGLIST_ORDER="${TAGLIST_ORDER:-alpha-asc;num-desc}"
USE_CONTROL_CACHE_HEADER="${USE_CONTROL_CACHE_HEADER:-false}"
REGISTRY_SECURED="${REGISTRY_SECURED:-false}"
DEFAULT_REGISTRIES="${DEFAULT_REGISTRIES:-}"
READ_ONLY_REGISTRIES="${READ_ONLY_REGISTRIES:-false}"
HISTORY_CUSTOM_LABELS="${HISTORY_CUSTOM_LABELS:-}"
THEME="${THEME:-auto}"
ENABLE_VERSION_NOTIFICATION="${ENABLE_VERSION_NOTIFICATION:-true}"

# Build config.js: use quoted heredoc so ( ) { } etc. are not parsed by shell, then inject values
_V_REGISTRY_URL=$(val "$REGISTRY_URL")
_V_REGISTRY_TITLE=$(val "$REGISTRY_TITLE")
_V_PULL_URL=$(val "$PULL_URL")
_V_TITLE=$(val "$DOCKER_REGISTRY_UI_TITLE")
_V_TAGLIST=$(val "$TAGLIST_ORDER")
_V_THEME=$(val "$THEME")
_V_DEFAULT_REGISTRIES=$(val "$DEFAULT_REGISTRIES")
_V_HISTORY_LABELS=$(val "$HISTORY_CUSTOM_LABELS")

cat > "$CONFIG_JS" << 'ENDOFJS'
(function() {
  var base = window.location.origin + window.location.pathname.replace(/\/+$/, '').replace(/index(.html?)?$/i, '');
  window.__REGISTRY_CONFIG__ = {
    registryUrl: __V_REGISTRY_URL__ || base,
    name: __V_REGISTRY_TITLE__ || base.replace(/^https?:\/\//, ''),
    pullUrl: __V_PULL_URL__ || base.replace(/^https?:\/\//, ''),
    dockerRegistryUiTitle: __V_TITLE__,
    singleRegistry: __V_SINGLE_REGISTRY__,
    deleteImages: __V_DELETE_IMAGES__,
    showContentDigest: __V_SHOW_CONTENT_DIGEST__,
    showTagHistory: __V_SHOW_TAG_HISTORY__,
    catalogElementsLimit: __V_CATALOG_ELEMENTS_LIMIT__,
    showCatalogNbTags: __V_SHOW_CATALOG_NB_TAGS__,
    catalogDefaultExpanded: __V_CATALOG_DEFAULT_EXPANDED__,
    catalogMinBranches: __V_CATALOG_MIN_BRANCHES__,
    catalogMaxBranches: __V_CATALOG_MAX_BRANCHES__,
    tagsPerPage: __V_TAGLIST_PAGE_SIZE__,
    taglistOrder: __V_TAGLIST_ORDER__,
    useControlCacheHeader: __V_USE_CONTROL_CACHE_HEADER__,
    isRegistrySecured: __V_REGISTRY_SECURED__,
    defaultRegistries: __V_DEFAULT_REGISTRIES__,
    readOnlyRegistries: __V_READ_ONLY_REGISTRIES__,
    historyCustomLabels: __V_HISTORY_LABELS__,
    theme: __V_THEME__ || 'auto',
    enableVersionNotification: __V_ENABLE_VERSION_NOTIFICATION__
  };
})();
ENDOFJS

# Replace placeholders with actual values
sed -i "s|__V_REGISTRY_URL__|$_V_REGISTRY_URL|g" "$CONFIG_JS"
sed -i "s|__V_REGISTRY_TITLE__|$_V_REGISTRY_TITLE|g" "$CONFIG_JS"
sed -i "s|__V_PULL_URL__|$_V_PULL_URL|g" "$CONFIG_JS"
sed -i "s|__V_TITLE__|$_V_TITLE|g" "$CONFIG_JS"
sed -i "s|__V_TAGLIST_ORDER__|$_V_TAGLIST|g" "$CONFIG_JS"
sed -i "s|__V_THEME__|$_V_THEME|g" "$CONFIG_JS"
sed -i "s|__V_DEFAULT_REGISTRIES__|$_V_DEFAULT_REGISTRIES|g" "$CONFIG_JS"
sed -i "s|__V_HISTORY_LABELS__|$_V_HISTORY_LABELS|g" "$CONFIG_JS"
sed -i "s|__V_SINGLE_REGISTRY__|$(bool "$SINGLE_REGISTRY")|g" "$CONFIG_JS"
sed -i "s|__V_DELETE_IMAGES__|$(bool "$DELETE_IMAGES")|g" "$CONFIG_JS"
sed -i "s|__V_SHOW_CONTENT_DIGEST__|$(bool "$SHOW_CONTENT_DIGEST")|g" "$CONFIG_JS"
sed -i "s|__V_SHOW_TAG_HISTORY__|$(bool "$SHOW_TAG_HISTORY")|g" "$CONFIG_JS"
sed -i "s|__V_CATALOG_ELEMENTS_LIMIT__|$(num "$CATALOG_ELEMENTS_LIMIT")|g" "$CONFIG_JS"
sed -i "s|__V_SHOW_CATALOG_NB_TAGS__|$(bool "$SHOW_CATALOG_NB_TAGS")|g" "$CONFIG_JS"
sed -i "s|__V_CATALOG_DEFAULT_EXPANDED__|$(bool "$CATALOG_DEFAULT_EXPANDED")|g" "$CONFIG_JS"
sed -i "s|__V_CATALOG_MIN_BRANCHES__|$(num "$CATALOG_MIN_BRANCHES")|g" "$CONFIG_JS"
sed -i "s|__V_CATALOG_MAX_BRANCHES__|$(num "$CATALOG_MAX_BRANCHES")|g" "$CONFIG_JS"
sed -i "s|__V_TAGLIST_PAGE_SIZE__|$(num "$TAGLIST_PAGE_SIZE")|g" "$CONFIG_JS"
sed -i "s|__V_USE_CONTROL_CACHE_HEADER__|$(bool "$USE_CONTROL_CACHE_HEADER")|g" "$CONFIG_JS"
sed -i "s|__V_REGISTRY_SECURED__|$(bool "$REGISTRY_SECURED")|g" "$CONFIG_JS"
sed -i "s|__V_READ_ONLY_REGISTRIES__|$(bool "$READ_ONLY_REGISTRIES")|g" "$CONFIG_JS"
sed -i "s|__V_ENABLE_VERSION_NOTIFICATION__|$(bool "$ENABLE_VERSION_NOTIFICATION")|g" "$CONFIG_JS"

# Optional: patch nginx config when using proxy to registry
if [ -n "${NGINX_PROXY_PASS_URL}" ]; then
  CONF="/etc/nginx/conf.d/default.conf"
  if [ -f "$CONF" ]; then
    sed -i "s|#! | |g" "$CONF"
    sed -i "s|\${NGINX_PROXY_PASS_URL}|${NGINX_PROXY_PASS_URL}|g" "$CONF"
    sed -i "s|\${NGINX_PROXY_HEADERS}||g" "$CONF"
    sed -i "s|\${NGINX_PROXY_PASS_HEADERS}||g" "$CONF"
    # Resolver: only uncomment #r (resolver + set/proxy_pass) when NGINX_RESOLVER is set.
    # Otherwise uncomment #!r (direct proxy_pass) so we don't get "resolver ;" with no argument.
    if [ -n "${NGINX_RESOLVER}" ]; then
      sed -i "s|#r| |g" "$CONF"
      sed -i "s|\${NGINX_RESOLVER}|${NGINX_RESOLVER}|g" "$CONF"
    else
      sed -i "s|#!r| |g" "$CONF"
    fi
  fi
fi

if [ "$(whoami)" != "root" ] && [ "${NGINX_LISTEN_PORT:-80}" = "80" ]; then
  export NGINX_LISTEN_PORT=8080
fi
if [ -n "${NGINX_LISTEN_PORT}" ] && [ "${NGINX_LISTEN_PORT}" != "80" ]; then
  sed -i "s/listen[[:space:]]*80;/listen ${NGINX_LISTEN_PORT};/" /etc/nginx/conf.d/default.conf 2>/dev/null || true
fi
