import { Component, OnInit, inject, computed } from '@angular/core';
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

export interface BreadcrumbItem {
  label: string;
  link?: string;
  icon?: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, HeaderComponent, FooterComponent, NzBreadCrumbModule, NzIconModule],
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
    // TODO: open add URL modal
  }

  protected onMenuChangeUrl(): void {
    // TODO: open change URL modal
  }

  protected onMenuRemoveUrl(): void {
    // TODO: open remove URL modal
  }
}
