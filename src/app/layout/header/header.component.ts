import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLink,
    NzInputModule,
    NzIconModule,
    NzDropDownModule,
    NzMenuModule,
    NzButtonModule,
    FormsModule,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  title = input<string>('Docker Registry UI');
  searchValue = input<string>('');
  showRegistryMenu = input<boolean>(true);
  readOnlyRegistries = input<boolean>(false);
  themeAuto = input<boolean>(true);
  darkTheme = input<boolean>(false);

  searchChange = output<string>();
  themeChange = output<boolean>();
  menuAddUrl = output<void>();
  menuChangeUrl = output<void>();
  menuRemoveUrl = output<void>();

  onSearch(value: string): void {
    this.searchChange.emit(value);
  }

  onThemeChange(checked: boolean): void {
    this.themeChange.emit(checked);
  }
}
