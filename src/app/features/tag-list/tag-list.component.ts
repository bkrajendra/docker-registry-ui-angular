import {
  Component,
  OnInit,
  input,
  signal,
  computed,
  inject,
} from '@angular/core';
import { RegistryStateService } from '../../core/services/registry-state.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { RegistryApiService } from '../../core/services/registry-api.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import {
  getPage,
  getNumPages,
  getPageLabels,
  type PageLabel,
} from '../../shared/utils/pagination.util';
import { getTagComparator, taglistOrderParser } from '../../shared/utils/taglist-order.util';
import type { ImageTagInfo } from '../../core/models';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { bytesToSize, matchSearch } from '../../shared/utils/format.util';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { TagHistoryComponent } from '../tag-history/tag-history.component';

@Component({
  selector: 'app-tag-list',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    DatePipe,
    NzCardModule,
    NzTableModule,
    NzSpinModule,
    NzButtonModule,
    NzIconModule,
    NzPaginationModule,
    NzCheckboxModule,
    NzModalModule,
    NzDrawerModule,
    NzTooltipModule,
    TagHistoryComponent,
  ],
  templateUrl: './tag-list.component.html',
  styleUrl: './tag-list.component.scss',
})
export class TagListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(RegistryApiService);
  private errorHandler = inject(ErrorHandlerService);
  private modal = inject(NzModalService);

  image = input.required<string>();

  private state = inject(RegistryStateService);
  private config = computed(() => this.state.getConfig());
  private filterSignal = toSignal(this.state.filter$, { initialValue: '' });
  registryUrl = computed(() => this.config().registryUrl ?? '');
  registryName = computed(() => this.config().name ?? '');
  pullUrl = computed(() => this.config().pullUrl ?? this.config().registryUrl ?? '');
  showContentDigest = computed(() => this.config().showContentDigest ?? false);
  showTagHistory = computed(() => this.config().showTagHistory ?? true);
  isImageRemoveActivated = computed(() => this.config().deleteImages ?? false);
  tagsPerPage = computed(() => this.config().tagsPerPage ?? 100);
  useControlCacheHeader = computed(() => this.config().useControlCacheHeader ?? false);
  isRegistrySecured = computed(() => this.config().isRegistrySecured ?? false);
  taglistOrder = computed(() => this.config().taglistOrder ?? 'alpha-asc;num-desc');

  loadend = signal(false);
  tags = signal<ImageTagInfo[]>([]);
  page = signal(1);
  asc = signal(true);
  tagComparator: (a: ImageTagInfo, b: ImageTagInfo) => number = () => 0;

  /** Delete UI state */
  toDelete = signal<Set<ImageTagInfo>>(new Set());
  multiDelete = signal(false);
  showConfirmModal = signal(false);
  deleteInProgress = signal(false);
  historyDrawerVisible = signal(false);
  historyTag = signal<string | null>(null);

  get numPages(): number {
    return getNumPages(this.tags(), this.tagsPerPage());
  }

  get pageLabels(): PageLabel[] {
    return getPageLabels(this.page(), this.numPages);
  }

  /** Current page of tags. No catalog filter here so all tags are visible. */
  get paginatedTags(): ImageTagInfo[] {
    const list = getPage(this.tags(), this.page(), this.tagsPerPage());
    const f = (this.filterSignal() ?? '').toLowerCase();
    if (!f) return list;
    return list.filter((t) => matchSearch(f, t.tag.toLowerCase()));
  }

  ngOnInit(): void {
    try {
      const order = taglistOrderParser(this.taglistOrder());
      this.tagComparator = getTagComparator(order);
    } catch (e) {
      this.errorHandler.showError(String(e));
    }
    this.load();
  }

  load(): void {
    const url = this.registryUrl();
    const name = this.image();
    const secured = this.isRegistrySecured();
    const tagsPerPage = this.tagsPerPage();
    this.api.getTagsList(url, name, secured).subscribe({
      next: (res) => {
        const list = (res.tags ?? []).map((tag) => ({
          name,
          tag,
        })) as ImageTagInfo[];
        list.sort(this.tagComparator);
        const maxPage = getNumPages(list, tagsPerPage);
        const currentPage = Math.min(this.page(), maxPage || 1);
        this.tags.set(list);
        this.page.set(currentPage);
        // Enrich tags with size, digest and architecture details.
        this.enrichTagsMetadata();
      },
      error: (err) => this.errorHandler.handleHttpError(err),
      complete: () => this.loadend.set(true),
    });
  }

  onPageChange(p: number): void {
    this.page.set(p);
    this.toDelete.set(new Set());
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: p === 1 ? null : p },
      queryParamsHandling: 'merge',
    });
  }

  onReverseOrder(): void {
    this.tags.update((t) => [...t].reverse());
    this.asc.update((a) => !a);
  }

  isSelected(row: ImageTagInfo): boolean {
    return this.toDelete().has(row);
  }

  onToggleSelect(row: ImageTagInfo, checked: boolean): void {
    const set = new Set(this.toDelete());
    if (checked) set.add(row);
    else set.delete(row);
    this.toDelete.set(set);
  }

  onMultiDeleteModeChange(checked: boolean): void {
    this.multiDelete.set(checked);
    if (!checked) this.toDelete.set(new Set());
  }

  onSelectAllOnPage(checked: boolean): void {
    if (checked) {
      const set = new Set(this.toDelete());
      this.paginatedTags.forEach((row) => set.add(row));
      this.toDelete.set(set);
      this.multiDelete.set(true);
    } else {
      this.toDelete.set(new Set());
      this.multiDelete.set(false);
    }
  }

  onDeleteSingle(row: ImageTagInfo): void {
    this.toDelete.set(new Set([row]));
    this.showConfirmModal.set(true);
  }

  openBulkDeleteConfirm(): void {
    if (this.toDelete().size > 0) this.showConfirmModal.set(true);
  }

  closeConfirmModal(): void {
    this.showConfirmModal.set(false);
  }

  get imagesToDelete(): ImageTagInfo[] {
    return Array.from(this.toDelete());
  }

  confirmDelete(): void {
    const list = this.imagesToDelete;
    if (list.length === 0) {
      this.closeConfirmModal();
      return;
    }
    const url = this.registryUrl();
    const secured = this.isRegistrySecured();
    this.deleteInProgress.set(true);
    forkJoin(
      list.map((img) =>
        this.api.getManifestDigest(url, img.name, img.tag, secured).pipe(
          switchMap((digest) => {
            if (!digest) {
              this.errorHandler.showError(`Could not get digest for ${img.name}:${img.tag}`);
              return of(undefined);
            }
            return this.api
              .deleteManifest(url, img.name, digest, secured, digest)
              .pipe(
                catchError((err) => {
                  this.errorHandler.handleHttpError(err);
                  return of(undefined);
                })
              );
          })
        )
      )
    ).subscribe({
      complete: () => {
        this.deleteInProgress.set(false);
        this.closeConfirmModal();
        this.toDelete.set(new Set());
        this.multiDelete.set(false);
        this.load();
      },
    });
  }

  /** Human readable size for template. */
  formatSize(size?: number): string {
    return bytesToSize(size);
  }

  /** Relative time like \"1 minute ago\" for Pushed column. */
  formatRelative(date?: Date): string {
    if (!date) return '-';
    const now = Date.now();
    const diffMs = now - date.getTime();
    if (diffMs < 0) return 'just now';
    const sec = Math.floor(diffMs / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    const month = Math.floor(day / 30);
    const year = Math.floor(day / 365);
    const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'} ago`;
    if (sec < 60) return plural(sec || 1, 'second');
    if (min < 60) return plural(min, 'minute');
    if (hr < 24) return plural(hr, 'hour');
    if (day < 30) return plural(day, 'day');
    if (month < 12) return plural(month, 'month');
    return plural(year, 'year');
  }

  /**
   * Enrich current tags with manifest- and blob-based metadata:
   * - size (sum of layer sizes)
   * - manifest digest (contentDigest)
   * - simple architecture summary string.
   *
   * Results are cached at HTTP level via CacheRequestService (sessionStorage),
   * so history page reuses the same responses.
   */
  private enrichTagsMetadata(): void {
    const url = this.registryUrl();
    const name = this.image();
    const secured = this.isRegistrySecured();
    const cacheHeader = this.useControlCacheHeader();
    const current = this.tags();
    if (!current.length) return;

    forkJoin(
      current.map((img) =>
        this.api
          .getManifest(url, name, img.tag, secured, true, cacheHeader)
          .pipe(
            switchMap((manifest: any) => {
              // size from layers if available
              const layers = (manifest?.layers as Array<{ size?: number }> | undefined) ?? [];
              if (Array.isArray(layers) && layers.length > 0) {
                img.size = layers.reduce((acc, l) => acc + (l.size ?? 0), 0);
              }

              // architecture from manifest list (multi-arch) or config blob
              if (Array.isArray(manifest?.manifests) && manifest.manifests.length > 0) {
                const archs = manifest.manifests
                  .map((m: any) => {
                    const os = m.platform?.os;
                    const arch = m.platform?.architecture;
                    return arch ? (os ? `${os}/${arch}` : arch) : null;
                  })
                  .filter((v: string | null): v is string => !!v);
                if (archs.length) img.arch = archs.join(', ');
                return of(img);
              }

              const cfgDigest = manifest?.config?.digest as string | undefined;
              if (!cfgDigest) {
                return of(img);
              }

              return this.api.getBlob(url, name, cfgDigest, secured).pipe(
                map((blob) => {
                  const cfg = (blob as any)?.config ?? blob;
                  const os = (cfg as any)?.os;
                  const arch = (cfg as any)?.architecture;
                  if (arch) img.arch = os ? `${os}/${arch}` : arch;
                  const created = (cfg as any)?.created ?? (blob as any)?.created;
                  if (created) img.creationDate = new Date(String(created));
                  return img;
                }),
                catchError(() => of(img))
              );
            }),
            switchMap((imgWithMeta) =>
              this.api.getManifestDigest(url, name, imgWithMeta.tag, secured).pipe(
                map((digest) => {
                  imgWithMeta.contentDigest = digest;
                  return imgWithMeta;
                }),
                catchError(() => of(imgWithMeta))
              )
            ),
            catchError((err) => {
              this.errorHandler.handleHttpError(err);
              return of(img);
            })
          )
      )
    ).subscribe((enriched) => {
      this.tags.set(enriched);
    });
  }

  openHistoryDrawer(row: ImageTagInfo): void {
    console.log('Opening history drawer for tag:', row);
    this.historyTag.set(row.tag);
    this.historyDrawerVisible.set(true);
  }

  closeHistoryDrawer(): void {
    this.historyDrawerVisible.set(false);
  }

  getPageLabels = getPageLabels;
  getNumPages = getNumPages;
}
