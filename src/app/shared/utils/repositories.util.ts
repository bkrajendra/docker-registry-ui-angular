import type { CatalogBranch, RepositoryNode } from '../../core/models';

function getRepositoryName(split: string[], max: number): string {
  let repositoryName = '';
  for (let i = 0; i < Math.min(max, split.length - 1); i++) {
    repositoryName += `${split[i]}/`;
  }
  return repositoryName;
}

function getLatestRepository(
  repo: CatalogBranch,
  repoName: string
): CatalogBranch | undefined {
  if (repo.repo === repoName) return repo;
  if (!repo.images) return undefined;
  for (let i = 0; i < repo.images.length; i++) {
    const item = repo.images[i];
    const res =
      typeof item !== 'string' && 'repo' in item
        ? getLatestRepository(item, repoName)
        : undefined;
    if (res) return res;
  }
  if (repoName.startsWith(repo.repo)) {
    const newRepo: CatalogBranch = { repo: repoName, images: [] };
    repo.images.push(newRepo);
    return newRepo;
  }
  return undefined;
}

function cleanInt(n: string | number): number {
  return n === '' ? 1 : parseInt(String(n), 10);
}

/**
 * Build a branching function for catalog repositories.
 * min/max control how many path segments are grouped (e.g. "org/proj" with max=1 groups under "org/").
 */
export function getBranching(
  min: number | string = 1,
  max: number | string = 1
): (repositories: string[]) => RepositoryNode[] {
  const minN = cleanInt(min);
  const maxN = cleanInt(max);
  if (isNaN(minN) || isNaN(maxN)) {
    throw new Error(`min and max must be integers: (min: ${min} and max: ${max})`);
  }
  if (minN > maxN) {
    throw new Error(`min must be <= max (min: ${min}, max: ${max})`);
  }
  if (maxN < 0 || minN < 0) {
    throw new Error(`min and max must be >= 0`);
  }
  let effectiveMin = minN;
  if (maxN === 1) effectiveMin = 1;

  return (repositories: string[]) =>
    [...repositories]
      .sort()
      .reduce<RepositoryNode[]>((acc, image) => {
        const split = image.split('/');
        if (split.length > effectiveMin && effectiveMin > 0) {
          const repoName = getRepositoryName(split, maxN);
          const last = acc[acc.length - 1];
          let repo: CatalogBranch | undefined;
          if (
            last &&
            typeof last !== 'string' &&
            'repo' in last &&
            last.images
          ) {
            repo = getLatestRepository(last as CatalogBranch, repoName);
          }
          if (!repo) {
            repo = { repo: repoName, images: [] };
            acc.push(repo);
          }
          repo.images.push(image);
          return acc;
        }
        acc.push(image);
        return acc;
      }, []);
}
