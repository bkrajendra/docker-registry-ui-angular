/**
 * Runtime config injected by Docker entrypoint (config.js).
 * All values can be string | number | boolean; app normalizes when applying.
 */
export interface WindowRegistryConfig {
  registryUrl?: string | null;
  name?: string | null;
  pullUrl?: string | null;
  dockerRegistryUiTitle?: string | null;
  singleRegistry?: boolean | string;
  deleteImages?: boolean | string;
  showContentDigest?: boolean | string;
  showTagHistory?: boolean | string;
  catalogElementsLimit?: number | string;
  showCatalogNbTags?: boolean | string;
  catalogDefaultExpanded?: boolean | string;
  catalogMinBranches?: number | string;
  catalogMaxBranches?: number | string;
  tagsPerPage?: number | string;
  taglistOrder?: string | null;
  useControlCacheHeader?: boolean | string;
  isRegistrySecured?: boolean | string;
  defaultRegistries?: string | string[] | null;
  readOnlyRegistries?: boolean | string;
  historyCustomLabels?: string | string[] | null;
  theme?: string | null;
  enableVersionNotification?: boolean | string;
}

declare global {
  interface Window {
    __REGISTRY_CONFIG__?: WindowRegistryConfig;
  }
}
