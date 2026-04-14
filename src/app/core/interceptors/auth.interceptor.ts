import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Attaches a Bearer token to every outgoing API request when the user is
 * authenticated. In the current mock setup no real token exists; this
 * interceptor is wired up so it is trivial to swap in a real JWT when the
 * backend is ready.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  // Only add headers for same-origin API calls (skip CDN/font requests)
  if (!req.url.startsWith('/api') && !req.url.startsWith('http://localhost')) {
    return next(req);
  }

  const user = auth.user();
  if (!user) return next(req);

  // TODO: replace with real JWT token from AuthService once backend exists
  const token = btoa(`${user.id}:mock`);

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    })
  );
};
