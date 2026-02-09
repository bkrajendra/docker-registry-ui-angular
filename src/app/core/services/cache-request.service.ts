import { Injectable } from '@angular/core';

const SHA_REGEX = /(blobs|manifests)\/sha256:[a-f0-9]+$/;

@Injectable({ providedIn: 'root' })
export class CacheRequestService {
  private getKey(url: string): string | null {
    const m = url.match(SHA_REGEX);
    return m ? m[0] : null;
  }

  get(url: string): { body: unknown; dockerContentDigest?: string } | null {
    const key = this.getKey(url);
    if (!key) return null;
    try {
      const raw = sessionStorage.getItem(`${key}/responseText`);
      const digest = sessionStorage.getItem(`${key}/dockerContentdigest`);
      if (raw == null) return null;
      return {
        body: JSON.parse(raw) as unknown,
        ...(digest ? { dockerContentDigest: digest } : {}),
      };
    } catch {
      return null;
    }
  }

  getText(url: string): { body: string; dockerContentDigest?: string } | null {
    const key = this.getKey(url);
    if (!key) return null;
    try {
      const raw = sessionStorage.getItem(`${key}/responseText`);
      const digest = sessionStorage.getItem(`${key}/dockerContentdigest`);
      if (raw == null) return null;
      return {
        body: raw,
        ...(digest ? { dockerContentDigest: digest } : {}),
      };
    } catch {
      return null;
    }
  }

  set(url: string, data: { body: unknown; dockerContentDigest?: string | null }): void {
    const key = this.getKey(url);
    if (!key) return;
    try {
      const text = typeof data.body === 'string' ? data.body : JSON.stringify(data.body);
      sessionStorage.setItem(`${key}/responseText`, text);
      if (data.dockerContentDigest) {
        sessionStorage.setItem(`${key}/dockerContentdigest`, data.dockerContentDigest);
      }
    } catch {
      // ignore
    }
  }
}
