import { Component, OnInit, input, signal, computed, inject, effect } from '@angular/core';
import { RegistryStateService } from '../../core/services/registry-state.service';
import { JsonPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { RegistryApiService } from '../../core/services/registry-api.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { bytesToSize } from '../../shared/utils/format.util';

@Component({
  selector: 'app-tag-history',
  standalone: true,
  imports: [
    RouterLink,
    JsonPipe,
    NzCardModule,
    NzTabsModule,
    NzSpinModule,
    NzButtonModule,
    NzIconModule,
    NzTimelineModule,
    NzDescriptionsModule,
  ],
  templateUrl: './tag-history.component.html',
  styleUrl: './tag-history.component.scss',
})
export class TagHistoryComponent implements OnInit {
  private api = inject(RegistryApiService);
  private errorHandler = inject(ErrorHandlerService);

  image = input.required<string>();
  tag = input.required<string>();
  /** When true, used inside drawer on tag list page; hide back link and compact header. */
  embeddedInDrawer = input<boolean>(false);

  private state = inject(RegistryStateService);
  private config = computed(() => this.state.getConfig());
  registryUrl = computed(() => this.config().registryUrl ?? '');
  registryName = computed(() => this.config().name ?? '');
  pullUrl = computed(() => this.config().pullUrl ?? '');
  isRegistrySecured = computed(() => this.config().isRegistrySecured ?? false);
  useControlCacheHeader = computed(() => this.config().useControlCacheHeader ?? false);
  historyCustomLabels = computed(() => this.config().historyCustomLabels ?? []);

  loadend = signal(false);
  elements = signal<Array<Array<{ key: string; value: unknown }>>>([]);
  archs = signal<Array<{ title: string; digest: string }>>([]);
  selectedArchIndex = signal(0);

  // Derived views for template: first group is basic details, rest is history.
  basicDetails = computed(() => this.elements()[0] ?? []);
  historyEntries = computed(() => (this.elements().length > 1 ? this.elements().slice(1) : []));

  constructor() {
    effect(() => {
      const name = this.image();
      const ref = this.tag();
      if (name && ref) this.load();
    });
  }

  ngOnInit(): void {}

  load(): void {
    const url = this.registryUrl();
    const name = this.image();
    const ref = this.tag();
    const secured = this.isRegistrySecured();
    const cacheHeader = this.useControlCacheHeader();

    this.api
      .getManifest(url, name, ref, secured, true, cacheHeader)
      .pipe()
      .subscribe({
        next: (manifest: unknown) => {
          const m = manifest as {
            manifests?: Array<{ digest: string; platform?: { os: string; architecture: string; variant?: string } }>;
            mediaType?: string;
          };
          if (m.manifests && m.manifests.length > 0) {
            const archs = m.manifests.map((a) => ({
              title: `${a.platform?.os ?? 'unknown'}/${a.platform?.architecture ?? 'unknown'}${a.platform?.variant ?? ''}`,
              digest: a.digest,
            }));
            this.archs.set(archs);
            this.loadBlob(url, name, archs[0].digest, secured);
          } else {
            this.loadBlobFromManifest(url, name, ref, secured, manifest);
          }
        },
        error: (err) => {
          this.errorHandler.handleHttpError(err);
          this.loadend.set(true);
        },
      });
  }

  private loadBlobFromManifest(
    registryUrl: string,
    name: string,
    ref: string,
    secured: boolean,
    manifest: unknown
  ): void {
    const m = manifest as { config?: { digest?: string }; layers?: Array<{ digest: string; size: number }> };
    const configDigest = m.config?.digest;
    if (!configDigest) {
      this.loadend.set(true);
      return;
    }
    this.api.getBlob(registryUrl, name, configDigest, secured).subscribe({
      next: (blob) => this.processBlob(blob as Record<string, unknown>, m.layers ?? []),
      error: (err) => this.errorHandler.handleHttpError(err),
      complete: () => this.loadend.set(true),
    });
  }

  private loadBlob(
    registryUrl: string,
    name: string,
    digest: string,
    secured: boolean
  ): void {
    this.api.getBlob(registryUrl, name, digest, secured).subscribe({
      next: (blob) => this.processBlob(blob as Record<string, unknown>, []),
      error: (err) => this.errorHandler.handleHttpError(err),
      complete: () => this.loadend.set(true),
    });
  }

  isArray(v: unknown): v is unknown[] {
    return Array.isArray(v);
  }

  isObject(v: unknown): v is Record<string, unknown> {
    return !!v && typeof v === 'object' && !Array.isArray(v);
  }

  onTabChange(index: unknown): void {
    const idx = typeof index === 'number' ? index : Number(index);
    this.selectedArchIndex.set(idx);
    const a = this.archs()[idx];
    if (a) {
      this.loadBlob(this.registryUrl(), this.image(), a.digest, this.isRegistrySecured());
    }
  }

  private processBlob(
    blobs: Record<string, unknown>,
    layers: Array<{ digest: string; size: number }>
  ): void {
    const history = (blobs['history'] as Array<Record<string, unknown>>) ?? [];
    const created = blobs['created'] ?? (blobs['config'] as Record<string, unknown>)?.['created'];
    const res: Array<Array<{ key: string; value: unknown }>> = [];
    const configEntries = this.entriesFromConfig(blobs);
    res.push(configEntries);
    for (let i = history.length - 1; i >= 0; i--) {
      res.push(this.entriesFromHistory(history[i], layers[i]));
    }
    this.elements.set(res);
  }

  private entriesFromConfig(blobs: Record<string, unknown>): Array<{ key: string; value: unknown }> {
    const config = (blobs['config'] as Record<string, unknown>) ?? blobs;
    const keys = [
      'architecture',
      'User',
      'created',
      'docker_version',
      'os',
      'Cmd',
      'Entrypoint',
      'Env',
      'Labels',
      'Volumes',
      'WorkingDir',
      'author',
      'id',
      'ExposedPorts',
    ];
    const result: Array<{ key: string; value: unknown }> = [];
    for (const k of keys) {
      const v = config[k] ?? blobs[k];
      if (v !== undefined && v !== null) {
        if (k === 'created') result.push({ key: k, value: new Date(String(v)).toLocaleString() });
        else if (k === 'size') result.push({ key: k, value: bytesToSize(Number(v)) });
        else result.push({ key: k, value: v });
      }
    }
    return result;
  }

  private entriesFromHistory(
    elt: Record<string, unknown>,
    layer?: { size: number }
  ): Array<{ key: string; value: unknown }> {
    const result: Array<{ key: string; value: unknown }> = [];
    for (const key of Object.keys(elt)) {
      if (key === 'empty_layer') continue;
      const value = elt[key];
      if (key === 'created') result.push({ key, value: new Date(String(value)).toLocaleString() });
      else if (key === 'size' && layer) result.push({ key, value: bytesToSize(layer.size) });
      else result.push({ key, value });
    }
    return result;
  }
}
