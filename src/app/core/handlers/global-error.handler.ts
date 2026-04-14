import { ErrorHandler, Injectable, inject, NgZone } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private ngZone = inject(NgZone);

  handleError(error: unknown): void {
    const err = error instanceof Error ? error : new Error(String(error));

    if (!environment.production) {
      // In dev mode surface the full error to the console
      console.error('[Summit Valley Bank Error]', err);
    } else {
      // In production: suppress stack traces, log a sanitised summary
      console.error('[Summit Valley Bank] An unexpected error occurred:', err.message);
      // TODO: send to real monitoring service (Sentry, Datadog, etc.)
      // errorMonitor.captureException(err);
    }
  }
}
