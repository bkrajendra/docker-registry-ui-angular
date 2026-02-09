import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { routes } from './app.routes';
import { en_US, provideNzI18n } from 'ng-zorro-antd/i18n';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import {
  BulbOutline,
  ArrowLeftOutline,
  HistoryOutline,
  SendOutline,
  EllipsisOutline,
  DatabaseOutline,
  CloudOutline,
  ContainerOutline,
} from '@ant-design/icons-angular/icons';
import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';

registerLocaleData(en);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
    provideNzI18n(en_US),
    provideNzIcons([
      BulbOutline,
      ArrowLeftOutline,
      HistoryOutline,
      SendOutline,
      EllipsisOutline,
      DatabaseOutline,
      CloudOutline,
      ContainerOutline,
    ]),
  ],
};
