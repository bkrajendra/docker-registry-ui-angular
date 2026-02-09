/**
 * Repository / image name (string) or namespace node with children.
 */
export type RepositoryNode = string | CatalogBranch;

export interface CatalogBranch {
  repo: string;
  images: RepositoryNode[];
}

export interface CatalogResponse {
  repositories: string[];
}

export interface TagsListResponse {
  tags: string[];
}
