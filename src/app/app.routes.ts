import { Routes } from '@angular/router';
import { authGuard, guestGuard, adminGuard, managerGuard, customerServiceGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // ── Auth (guest only) ──────────────────────────────────────────────────────
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      { path: 'login',           loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent) },
      { path: 'register',        loadComponent: () => import('./features/auth/register/register').then(m => m.RegisterComponent) },
      { path: 'forgot-password', loadComponent: () => import('./features/auth/forgot-password/forgot-password').then(m => m.ForgotPasswordComponent) },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  // ── Shell (authenticated) ──────────────────────────────────────────────────
  {
    path: '',
    loadComponent: () => import('./shared/components/shell/shell').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      // Customer pages
      { path: 'dashboard',    loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent) },
      { path: 'transactions', loadComponent: () => import('./features/transactions/transactions').then(m => m.TransactionsComponent) },
      { path: 'transfers',    loadComponent: () => import('./features/transfers/transfers').then(m => m.TransfersComponent) },
      { path: 'profile',      loadComponent: () => import('./features/profile/profile').then(m => m.ProfileComponent) },

      // Additional customer pages
      { path: 'bill-pay',      loadComponent: () => import('./features/bill-pay/bill-pay').then(m => m.BillPayComponent) },
      { path: 'cards',         loadComponent: () => import('./features/cards/cards').then(m => m.CardsComponent) },
      { path: 'statements',    loadComponent: () => import('./features/statements/statements').then(m => m.StatementsComponent) },
      { path: 'goals',         loadComponent: () => import('./features/goals/goals').then(m => m.GoalsComponent) },
      { path: 'insights',      loadComponent: () => import('./features/insights/insights').then(m => m.InsightsComponent) },
      { path: 'beneficiaries', loadComponent: () => import('./features/beneficiaries/beneficiaries').then(m => m.BeneficiariesComponent) },
      { path: 'disputes',      loadComponent: () => import('./features/disputes/disputes').then(m => m.DisputesComponent) },
      { path: 'alerts',        loadComponent: () => import('./features/alerts/alerts').then(m => m.AlertsComponent) },

      // Admin console
      { path: 'admin',           canActivate: [adminGuard],   loadComponent: () => import('./features/admin/admin').then(m => m.AdminComponent) },

      // Manager panel
      { path: 'manager',         canActivate: [managerGuard],         loadComponent: () => import('./features/manager/manager').then(m => m.ManagerComponent) },

      // Customer Service console
      { path: 'support',         canActivate: [customerServiceGuard], loadComponent: () => import('./features/support/support').then(m => m.SupportComponent) },

      // Change password (forced after first login with temp password)
      { path: 'change-password', loadComponent: () => import('./features/auth/change-password/change-password').then(m => m.ChangePasswordComponent) },
    ],
  },

  { path: '**', loadComponent: () => import('./features/not-found/not-found').then(m => m.NotFoundComponent) },
];
