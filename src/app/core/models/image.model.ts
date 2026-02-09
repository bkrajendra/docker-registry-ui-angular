/**
 * Image tag metadata (from manifest + config blob).
 */
export interface ImageTagInfo {
  name: string;
  tag: string;
  size?: number;
  creationDate?: Date;
  sha256?: string;
  contentDigest?: string;
  /** Simple architecture summary like "linux/amd64" or "amd64, arm64". */
  arch?: string;
  layers?: { digest: string; size: number }[];
  manifests?: ManifestInfo[];
  /** Multi-arch: per-platform variant */
  variants?: ImageTagInfo[];
}

export interface ManifestInfo {
  digest: string;
  platform?: {
    architecture: string;
    os: string;
    variant?: string;
  };
}

export interface BlobConfig {
  created?: string;
  history?: Array<Record<string, unknown>>;
  config?: Record<string, unknown>;
  id?: string;
  [key: string]: unknown;
}

export interface RegistryError {
  code?: string;
  message?: string;
  status?: number;
  url?: string;
  errors?: Array<{ code?: string; message?: string; detail?: unknown }>;
}
