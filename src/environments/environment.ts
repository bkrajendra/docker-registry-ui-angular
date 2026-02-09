export const environment = {
  production: false,
  apiUrl: typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}`.replace(/\/+$/, '') : '',
  registryUrl: typeof window !== 'undefined' ? window.location.origin + window.location.pathname.replace(/\/+$/, '') : '',
};
