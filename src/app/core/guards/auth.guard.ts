import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/auth/login']);
  // Force password change before accessing any other page
  if (auth.user()?.mustChangePassword && state.url !== '/change-password') {
    return router.createUrlTree(['/change-password']);
  }
  return true;
};

export const guestGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return true;
  return router.createUrlTree([auth.homeRoute()]);
};

export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/auth/login']);
  if (auth.isAdmin()) return true;
  return router.createUrlTree([auth.homeRoute()]);
};

export const managerGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return router.createUrlTree(['/auth/login']);
  if (auth.isManager()) return true;
  return router.createUrlTree([auth.homeRoute()]);
};
