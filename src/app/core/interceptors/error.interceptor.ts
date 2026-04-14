import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Global HTTP error interceptor.
 * - 401: force logout + redirect to login
 * - 403: redirect to home
 * - 5xx: surface a user-friendly error
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth   = inject(AuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      let message = 'An unexpected error occurred. Please try again.';

      if (err.status === 401) {
        auth.logout();
        router.navigate(['/auth/login'], { queryParams: { reason: 'session_expired' } });
        message = 'Your session has expired. Please log in again.';
      } else if (err.status === 403) {
        router.navigate([auth.homeRoute()]);
        message = 'You do not have permission to perform this action.';
      } else if (err.status >= 500) {
        message = 'A server error occurred. Please try again later.';
      } else if (err.status === 0) {
        message = 'Unable to connect. Please check your internet connection.';
      }

      return throwError(() => new Error(message));
    })
  );
};
