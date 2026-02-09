import {
  Component,
  input,
  signal,
  computed,
  inject,
  effect,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { RegistryApiService } from '../../core/services/registry-api.service';
import { ErrorHandlerService } from '../../core/services/error-handler.service';
import type { RepositoryNode, CatalogBranch } from '../../core/models';
import { matchSearch } from '../../shared/utils/format.util';

@Component({
  selector: 'app-catalog-element',
  standalone: true,
  imports: [RouterLink, NzCardModule, NzIconModule],
  templateUrl: './catalog-element.component.html',
  styleUrl: './catalog-element.component.scss',
})
export class CatalogElementComponent {
  private api = inject(RegistryApiService);
  private errorHandler = inject(ErrorHandlerService);
  private router = inject(Router);

  item = input.required<RepositoryNode>();
  filterResults = input<string>('');
  registryUrl = input.required<string>();
  showCatalogNbTags = input<boolean>(false);
  catalogDefaultExpanded = input<boolean>(false);
  isRegistrySecured = input<boolean>(false);
  catalogMinBranches = input<number>(1);
  catalogMaxBranches = input<number>(1);

  expanded = signal(false);
  nbTags = signal<number | null>(null);
  imageName = signal<string | null>(null);
  branch = signal<CatalogBranch | null>(null);
  nImages = signal(0);

  constructor() {
    effect(() => {
      const i = this.item();
      if (typeof i === 'string') {
        this.imageName.set(i);
        this.branch.set(null);
        this.nImages.set(1);
      } else if (i && typeof i === 'object' && 'repo' in i && Array.isArray((i as CatalogBranch).images)) {
        this.branch.set(i as CatalogBranch);
        this.imageName.set(null);
        this.nImages.set((i as CatalogBranch).images.length);
        this.expanded.set(this.catalogDefaultExpanded());
      }
    });
    effect(() => {
      if (this.showCatalogNbTags() && this.imageName()) {
        this.fetchNbTags();
      }
    });
  }

  private fetchNbTags(): void {
    const name = this.imageName();
    if (!name) return;
    const url = this.registryUrl().replace(/\/$/, '') + '/v2/' + name + '/tags/list';
    this.api.get<TagsListResponse>(url, { withCredentials: this.isRegistrySecured() }).subscribe({
      next: (res) => this.nbTags.set((res as TagsListResponse).tags?.length ?? 0),
      error: () => this.errorHandler.showError('Failed to load tag count'),
    });
  }

  toggleExpand(): void {
    const b = this.branch();
    if (b) this.expanded.set(!this.expanded());
  }

  onCardClick(): void {
    if (this.branch()) {
      this.toggleExpand();
    } else if (this.imageName()) {
      this.router.navigate(['/taglist', this.imageName()]);
    }
  }

  isBranch(node: RepositoryNode): node is CatalogBranch {
    return typeof node !== 'string' && node != null && 'repo' in node && Array.isArray((node as CatalogBranch).images);
  }

  filterMatch(value: string): boolean {
    return matchSearch(this.filterResults(), value);
  }
}

interface TagsListResponse {
  tags?: string[];
}
