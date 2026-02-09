import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import type { RegistryConfig } from '../models';

const LOCAL_STORAGE_KEY = 'registryServer';
const THEME_STORAGE_KEY = 'registryUiTheme';

@Injectable({ providedIn: 'root' })
export class RegistryStateService {
  private configSubject = new BehaviorSubject<Partial<RegistryConfig>>({});
  config$ = this.configSubject.asObservable();

  private filterSubject = new BehaviorSubject<string>('');
  filter$ = this.filterSubject.asObservable();

  private themeSubject = new BehaviorSubject<'light' | 'dark'>('light');
  theme$ = this.themeSubject.asObservable();

  getRegistryServers(): string[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.map((u: string) => u.trim().replace(/\/+$/, '')) : [];
    } catch {
      return [];
    }
  }

  setRegistryServers(registries: string[]): void {
    const normalized = registries.map((u) => u.trim().replace(/\/+$/, ''));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
  }

  addRegistryServer(url: string): string {
    const trimmed = url.trim().replace(/\/+$/, '');
    const list = this.getRegistryServers().filter((u) => u !== trimmed);
    this.setRegistryServers([trimmed, ...list]);
    return trimmed;
  }

  removeRegistryServer(url: string): void {
    this.setRegistryServers(this.getRegistryServers().filter((u) => u !== url));
  }

  setConfig(config: Partial<RegistryConfig>): void {
    this.configSubject.next({ ...this.configSubject.value, ...config });
  }

  getConfig(): Partial<RegistryConfig> {
    return this.configSubject.value;
  }

  setFilter(value: string): void {
    this.filterSubject.next(value);
  }

  getFilter(): string {
    return this.filterSubject.getValue();
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.themeSubject.next(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  getStoredTheme(): 'light' | 'dark' | null {
    return localStorage.getItem(THEME_STORAGE_KEY) as 'light' | 'dark' | null;
  }
}
