export const environment = {
  production: true,
  apiUrl: typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}`.replace(/\/+$/, '') : '/api',
  registryUrl: typeof window !== 'undefined' ? window.location.origin : '',
};
