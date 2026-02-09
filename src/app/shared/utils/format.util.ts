export function bytesToSize(bytes: number | undefined): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === undefined || isNaN(bytes)) return '?';
  if (bytes === 0) return '0 Byte';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const number = bytes / Math.pow(1024, i);
  if (number < 10) {
    const decimal =
      (bytes - Math.floor(number) * Math.pow(1024, i)) / Math.pow(1024, i);
    return `${Math.floor(number)}.${Math.floor(decimal * 10)} ${sizes[i]}`;
  }
  return Math.ceil(number) + ' ' + sizes[i];
}

export function stripHttps(url: string | null | undefined): string {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '');
}

export function matchSearch(search: string | null | undefined, value: string): boolean {
  return !search || (value?.toLowerCase().indexOf(search) ?? -1) >= 0;
}
