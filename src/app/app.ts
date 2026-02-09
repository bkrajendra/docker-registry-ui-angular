import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterOutlet, NavigationEnd, RouterLink } from '@angular/router';
import { filter, map, merge, of } from 'rxjs';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { RegistryStateService } from './core/services/registry-state.service';
import { stripHttps } from './shared/utils/format.util';
import type { WindowRegistryConfig } from './core/models/window-config.model';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { FormsModule } from '@angular/forms';

export interface BreadcrumbItem {
  label: string;
  link?: string;
  icon?: string;
}

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    HeaderComponent,
    FooterComponent,
    NzBreadCrumbModule,
    NzIconModule,
    NzModalModule,
    NzInputModule,
    NzButtonModule,
    FormsModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected state = inject(RegistryStateService);
  private router = inject(Router);
  protected theme = toSignal(this.state.theme$, { initialValue: 'light' as 'light' | 'dark' });

  /** Filter from state so search is preserved when navigating (breadcrumb, back). */
  protected filter = toSignal(this.state.filter$, { initialValue: '' });
  protected config = computed(() => this.state.getConfig());

  // Multi-registry dialogs state
  protected addRegistryModalVisible = signal(false);
  protected changeRegistryModalVisible = signal(false);
  protected removeRegistryModalVisible = signal(false);

  protected addRegistryUrl = '';
  protected changeRegistrySelectedUrl = '';

  protected breadcrumbItems = toSignal(
    merge(
      of(undefined),
      this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
    ).pipe(map(() => this.getBreadcrumbItems())),
    { initialValue: this.getBreadcrumbItems() }
  );

  ngOnInit(): void {
    const winCfg = typeof window !== 'undefined' ? window.__REGISTRY_CONFIG__ : undefined;
    if (winCfg) {
      this.state.setConfig(this.normalizeWindowConfig(winCfg));
    }
    const cfg = this.state.getConfig();
    if (!cfg.registryUrl) {
      const base =
        typeof window !== 'undefined'
          ? window.location.origin + window.location.pathname.replace(/\/+$/, '')
          : '';
      this.state.setConfig({
        registryUrl: base.replace(/\/$/, '').replace(/index(\.html?)?$/i, ''),
        name: stripHttps(base),
        pullUrl: stripHttps(base),
        singleRegistry: false,
        deleteImages: false,
        showContentDigest: false,
        showTagHistory: true,
        catalogElementsLimit: 1000,
        showCatalogNbTags: false,
        catalogDefaultExpanded: false,
        catalogMinBranches: 1,
        catalogMaxBranches: 1,
        tagsPerPage: 100,
        useControlCacheHeader: false,
        isRegistrySecured: false,
        taglistOrder: 'alpha-asc;num-desc',
        theme: 'auto',
        defaultRegistries: [],
        readOnlyRegistries: false,
        historyCustomLabels: [],
        dockerRegistryUiTitle: 'Docker Registry UI',
        enableVersionNotification: true,
      });
    }

    // Initialize local multi-registry list from defaultRegistries when needed
    const cfgAfter = this.state.getConfig();
    const existingServers = this.state.getRegistryServers();
    if (cfgAfter.defaultRegistries.length > 0 && existingServers.length === 0) {
      this.state.setRegistryServers(cfgAfter.defaultRegistries);
    }
  }

  private normalizeWindowConfig(w: WindowRegistryConfig): Partial<import('./core/models/registry.model').RegistryConfig> {
    const toBool = (v: boolean | string | undefined): boolean =>
      v === true || v === 'true';
    const toNum = (v: number | string | undefined, def: number): number =>
      v === undefined || v === null ? def : typeof v === 'number' ? v : parseInt(String(v), 10) || def;
    const toStr = (v: string | null | undefined): string =>
      v != null ? String(v) : '';
    const toArr = (v: string | string[] | null | undefined): string[] =>
      v == null ? [] : Array.isArray(v) ? v : String(v).split(',').map((s) => s.trim()).filter(Boolean);
    const base =
      typeof window !== 'undefined'
        ? window.location.origin + window.location.pathname.replace(/\/+$/, '').replace(/index(\.html?)?$/i, '')
        : '';
    const registryUrl = toStr(w.registryUrl) || base;
    return {
      registryUrl,
      name: toStr(w.name) || stripHttps(registryUrl),
      pullUrl: toStr(w.pullUrl) || stripHttps(registryUrl),
      dockerRegistryUiTitle: toStr(w.dockerRegistryUiTitle) || 'Docker Registry UI',
      singleRegistry: toBool(w.singleRegistry),
      deleteImages: toBool(w.deleteImages),
      showContentDigest: toBool(w.showContentDigest),
      showTagHistory: toBool(w.showTagHistory),
      catalogElementsLimit: toNum(w.catalogElementsLimit, 1000),
      showCatalogNbTags: toBool(w.showCatalogNbTags),
      catalogDefaultExpanded: toBool(w.catalogDefaultExpanded),
      catalogMinBranches: toNum(w.catalogMinBranches, 1),
      catalogMaxBranches: toNum(w.catalogMaxBranches, 1),
      tagsPerPage: toNum(w.tagsPerPage, 100),
      taglistOrder: toStr(w.taglistOrder) || 'alpha-asc;num-desc',
      useControlCacheHeader: toBool(w.useControlCacheHeader),
      isRegistrySecured: toBool(w.isRegistrySecured),
      defaultRegistries: toArr(w.defaultRegistries),
      readOnlyRegistries: toBool(w.readOnlyRegistries),
      historyCustomLabels: toArr(w.historyCustomLabels),
      theme: (toStr(w.theme) as 'light' | 'dark' | 'auto') || 'auto',
      enableVersionNotification: toBool(w.enableVersionNotification),
    };
  }

  protected onSearch(value: string): void {
    console.log('Search:', value);
    this.state.setFilter(value);
  }

  private getBreadcrumbItems(): BreadcrumbItem[] {
    const url = this.router.url.split('?')[0];
    if (url === '/' || url === '') {
      return [{ label: 'Repositories', icon: 'database' }];
    }
    const parts = url.split('/').filter(Boolean);
    if (parts[0] === 'taglist' && parts[1]) {
      const image = decodeURIComponent(parts[1]);
      return [
        { label: 'Repositories', link: '/', icon: 'database' },
        { label: image, icon: 'container' },
      ];
    }
    if (parts[0] === 'taghistory' && parts[1] && parts[2]) {
      const image = decodeURIComponent(parts[1]);
      const tag = decodeURIComponent(parts[2]);
      return [
        { label: 'Repositories', link: '/', icon: 'database' },
        { label: image, link: `/taglist/${parts[1]}`, icon: 'container' },
        { label: tag },
      ];
    }
    return [{ label: 'Repositories', link: '/', icon: 'database' }];
  }

  protected onThemeChange(dark: boolean): void {
    this.state.setTheme(dark ? 'dark' : 'light');
  }

  protected onMenuAddUrl(): void {
    this.addRegistryUrl = '';
    this.addRegistryModalVisible.set(true);
  }

  protected onMenuChangeUrl(): void {
    const servers = this.state.getRegistryServers();
    this.changeRegistrySelectedUrl = servers[0] ?? '';
    this.changeRegistryModalVisible.set(true);
  }

  protected onMenuRemoveUrl(): void {
    this.removeRegistryModalVisible.set(true);
  }

  protected closeAddRegistryModal(): void {
    this.addRegistryModalVisible.set(false);
    this.addRegistryUrl = '';
  }

  protected closeChangeRegistryModal(): void {
    this.changeRegistryModalVisible.set(false);
  }

  protected closeRemoveRegistryModal(): void {
    this.removeRegistryModalVisible.set(false);
  }

  protected registryServers(): string[] {
    return this.state.getRegistryServers();
  }

  protected isValidRegistryUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    const value = String(url).trim();
    return /^https?:\/\//.test(value) && !/\/v2\/?$/.test(value);
  }

  protected confirmAddRegistry(): void {
    if (!this.isValidRegistryUrl(this.addRegistryUrl)) return;
    const newUrl = this.state.addRegistryServer(this.addRegistryUrl);
    this.state.setConfig({
      registryUrl: newUrl,
      name: stripHttps(newUrl),
      pullUrl: stripHttps(newUrl),
    });
    this.router.navigateByUrl('/');
    this.closeAddRegistryModal();
  }

  protected confirmChangeRegistry(): void {
    if (!this.isValidRegistryUrl(this.changeRegistrySelectedUrl)) return;
    const newUrl = this.state.addRegistryServer(this.changeRegistrySelectedUrl);
    this.state.setConfig({
      registryUrl: newUrl,
      name: stripHttps(newUrl),
      pullUrl: stripHttps(newUrl),
    });
    this.router.navigateByUrl('/');
    this.closeChangeRegistryModal();
  }

  protected onRemoveRegistry(url: string): void {
    this.state.removeRegistryServer(url);
    const remaining = this.state.getRegistryServers();
    const cfg = this.state.getConfig();
    if (url === cfg.registryUrl) {
      let nextUrl: string;
      if (remaining.length > 0) {
        nextUrl = remaining[0];
      } else {
        const base =
          typeof window !== 'undefined'
            ? window.location.origin + window.location.pathname.replace(/\/+$/, '')
            : '';
        const normalizedBase = base.replace(/\/$/, '').replace(/index(\.html?)?$/i, '');
        nextUrl = normalizedBase;
      }
      this.state.setConfig({
        registryUrl: nextUrl,
        name: stripHttps(nextUrl),
        pullUrl: stripHttps(nextUrl),
      });
      this.router.navigateByUrl('/');
    }
  }
}
