export function getPage<T>(elts: T[] | null | undefined, page: number, limit: number): T[] {
  if (!limit) limit = 100;
  if (!elts) return [];
  return elts.slice((page - 1) * limit, limit * page);
}

export function getNumPages(elts: unknown[] | null | undefined, limit: number): number {
  if (!limit) limit = 100;
  if (!elts) return 0;
  return Math.trunc(elts.length / limit) + 1;
}

export interface PageLabel {
  page: number;
  icon?: string;
  current?: boolean;
  'space-left'?: boolean;
  'space-right'?: boolean;
}

export function getPageLabels(page: number, nPages: number): PageLabel[] {
  const pageLabels: PageLabel[] = [];
  const maxItems = 10;
  if (nPages === 1) return pageLabels;
  if (page !== 1 && nPages >= maxItems) {
    pageLabels.push({ icon: 'first_page', page: 1 });
    pageLabels.push({ icon: 'chevron_left', page: page - 1 });
  }
  const start = Math.round(
    Math.max(1, Math.min(page - maxItems / 2, nPages - maxItems + 1))
  );
  for (let i = start; i < Math.min(nPages + 1, start + maxItems); i++) {
    pageLabels.push({
      page: i,
      current: i === page,
      'space-left': page === 1 && nPages > maxItems,
      'space-right': page === nPages && nPages > maxItems,
    });
  }
  if (page !== nPages && nPages >= maxItems) {
    pageLabels.push({ icon: 'chevron_right', page: page + 1 });
    pageLabels.push({ icon: 'last_page', page: nPages });
  }
  return pageLabels;
}
