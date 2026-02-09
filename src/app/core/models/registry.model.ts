export interface RegistryConfig {
  registryUrl: string;
  name: string;
  pullUrl: string;
  singleRegistry: boolean;
  deleteImages: boolean;
  showContentDigest: boolean;
  showTagHistory: boolean;
  catalogElementsLimit: number;
  showCatalogNbTags: boolean;
  catalogDefaultExpanded: boolean;
  catalogMinBranches: number;
  catalogMaxBranches: number;
  tagsPerPage: number;
  useControlCacheHeader: boolean;
  isRegistrySecured: boolean;
  taglistOrder: string;
  theme: 'light' | 'dark' | 'auto';
  defaultRegistries: string[];
  readOnlyRegistries: boolean;
  historyCustomLabels: string[];
  dockerRegistryUiTitle: string;
  enableVersionNotification: boolean;
}
