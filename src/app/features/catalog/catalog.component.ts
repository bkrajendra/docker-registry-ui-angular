import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { CatalogElementComponent } from './catalog-element.component';
import { RegistryApiService } from '../../core/services/registry-api.service';
import { RegistryStateService } from '../../core/services/registry-state.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import { getBranching } from '../../shared/utils/repositories.util';
import type { RepositoryNode, CatalogBranch } from '../../core/models';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [NzCardModule, NzSpinModule, NzIconModule, CatalogElementComponent],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.scss',
})
export class CatalogComponent implements OnInit {
  private api = inject(RegistryApiService);
  private state = inject(RegistryStateService);
  private errorHandler = inject(ErrorHandlerService);

  private config = computed(() => this.state.getConfig());
  registryUrl = computed(() => this.config().registryUrl ?? '');
  registryName = computed(() => this.config().name ?? '');
  catalogElementsLimit = computed(() => this.config().catalogElementsLimit ?? 1000);
  filterResults = toSignal(this.state.filter$, { initialValue: '' });
  showCatalogNbTags = computed(() => this.config().showCatalogNbTags ?? false);
  catalogDefaultExpanded = computed(() => this.config().catalogDefaultExpanded ?? false);
  catalogMinBranches = computed(() => this.config().catalogMinBranches ?? 1);
  catalogMaxBranches = computed(() => this.config().catalogMaxBranches ?? 1);
  isRegistrySecured = computed(() => this.config().isRegistrySecured ?? false);

  loadend = signal(false);
  repositories = signal<RepositoryNode[]>([]);
  nRepositories = signal(0);
  nImages = signal(0);

  private filter = computed(() => (this.filterResults() ?? '').toLowerCase());

  /** Filtered list so template reactively updates when filter or repositories change. */
  protected filteredRepositories = computed(() => {
    const repos = this.repositories();
    const f = this.filter();
    console.log('Filtering repositories with filter:', f);
    if (!f) return repos;
    return repos.filter((node) => this.nodeMatchesFilter(node, f));
  });

  ngOnInit(): void {
    this.load();
  }

  private nodeMatchesFilter(node: RepositoryNode, f: string): boolean {
    if (typeof node === 'string') return node.toLowerCase().includes(f);
    const branch = node as CatalogBranch;
    return branch.images.some((child) => this.nodeMatchesFilter(child, f));
  }

  load(): void {
    const url = this.registryUrl();
    const limit = this.catalogElementsLimit();
    const secured = this.isRegistrySecured();
    let branching: ((repos: string[]) => RepositoryNode[]) | null = null;
    try {
      branching = getBranching(this.catalogMinBranches(), this.catalogMaxBranches());
    } catch (e) {
      this.errorHandler.showError(String(e));
    }

    this.api.getCatalog(url, limit, secured).subscribe({
      next: (res) => {
        let repos: RepositoryNode[] = res.repositories ?? [];
        repos = [...repos].sort();
        const nImages = repos.length;
        if (branching) repos = branching(repos as string[]);
        this.repositories.set(repos);
        this.nRepositories.set(repos.length);
        this.nImages.set(nImages);
      },
      error: (err) => {
        this.errorHandler.handleHttpError(err);
      },
      complete: () => this.loadend.set(true),
    });
  }

  isBranch(node: RepositoryNode): node is CatalogBranch {
    return typeof node !== 'string' && node != null && 'repo' in node && Array.isArray((node as CatalogBranch).images);
  }

  getImageCount(node: RepositoryNode): number {
    if (typeof node === 'string') return 1;
    return (node as CatalogBranch).images.length;
  }
}
