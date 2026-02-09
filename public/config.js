// Optional runtime config. In Docker, the entrypoint overwrites this file with env-based config.
// Leave empty in development so the app uses defaults.
if (typeof window !== 'undefined') {
  window.__REGISTRY_CONFIG__ = window.__REGISTRY_CONFIG__ || null;
}
