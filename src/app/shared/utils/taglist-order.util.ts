const TAGLIST_ORDER_REGEX =
  /(alpha-(asc|desc);num-(asc|desc))|(num-(asc|desc);alpha-(asc|desc))/;

function isDigit(char: string): boolean {
  return char >= '0' && char <= '9';
}

export function taglistOrderVariants(taglistOrder: string): string {
  switch (taglistOrder) {
    case 'desc':
      return 'alpha-desc;num-desc';
    case 'asc':
      return 'num-asc;alpha-asc';
    case 'alpha-desc':
    case 'alpha-asc':
    case 'num-desc':
    case 'num-asc':
      return `${taglistOrder};${taglistOrder.startsWith('num') ? 'alpha' : 'num'}-asc`;
    default:
      if (!taglistOrder) return 'alpha-asc;num-desc';
      if (TAGLIST_ORDER_REGEX.test(taglistOrder)) return taglistOrder;
      throw new Error(`The taglist order \`${taglistOrder}\` is not recognized.`);
  }
}

export interface TaglistOrder {
  numFirst: boolean;
  numAsc: boolean;
  alphaAsc: boolean;
}

export function taglistOrderParser(taglistOrder: string): TaglistOrder {
  const orders = taglistOrderVariants(taglistOrder)
    .split(';')
    .filter((e) => e)
    .map((e) => e.split('-').filter((x) => x))
    .reduce<Record<string, boolean>>((acc, e, idx) => {
      if (e.length > 1) {
        acc[e[0] + 'Asc'] = e[1] === 'asc';
      }
      if (idx === 0) {
        acc['numFirst'] = e[0] === 'num';
      }
      return acc;
    }, {});

  return {
    numFirst: orders['numFirst'] ?? false,
    numAsc: orders['numAsc'] ?? true,
    alphaAsc: orders['alphaAsc'] ?? true,
  } as TaglistOrder;
}

function tagReduce(acc: string[], e: string): string[] {
  if (
    acc.length > 0 &&
    isDigit(acc[acc.length - 1].charAt(0)) === isDigit(e)
  ) {
    acc[acc.length - 1] += e;
  } else {
    acc.push(e);
  }
  return acc;
}

function splitTagToArray(tag: string): (string | number)[] {
  return tag
    .split('')
    .reduce(tagReduce, [])
    .map((e) => (isDigit(e.charAt(0)) ? parseInt(e, 10) : e));
}

function applyOrder(
  order: TaglistOrder,
  e1: string | number,
  e2: string | number
): number {
  if (e1 === e2) return 0;
  const numFirst = order.numFirst ? 1 : -1;
  if (typeof e1 === 'number') {
    const factor = order.numAsc ? 1 : -1;
    return typeof e2 === 'number' ? (e1 - e2) * factor : -1 * numFirst;
  }
  if (typeof e2 === 'number') return 1 * numFirst;
  const factor = order.alphaAsc ? 1 : -1;
  return String(e1).localeCompare(String(e2)) * factor;
}

export interface TagItem {
  tag: string;
}

export function getTagComparator(order: TaglistOrder): (a: TagItem, b: TagItem) => number {
  return (e1, e2) => {
    const tag1 = splitTagToArray(e1.tag);
    const tag2 = splitTagToArray(e2.tag);
    for (let i = 0; i < tag1.length && i < tag2.length; i++) {
      const compare = applyOrder(order, tag1[i], tag2[i]);
      if (compare !== 0) return compare;
    }
    return e1.tag.length - e2.tag.length;
  };
}
