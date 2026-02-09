import { Injectable } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';

@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  constructor(private message: NzMessageService) {}

  showError(message: string, isError = true): void {
    if (isError) {
      this.message.error(message);
    } else {
      this.message.info(message);
    }
  }

  handleHttpError(err: unknown): void {
    const msg =
      err && typeof err === 'object' && 'error' in err && err.error && typeof (err as { error: unknown }).error === 'object' && 'message' in (err as { error: { message?: string } }).error
        ? (err as { error: { message: string } }).error.message
        : err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'An error occurred';
    this.message.error(msg);
  }
}
