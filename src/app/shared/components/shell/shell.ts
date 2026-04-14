import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { LocaleService } from '../../../core/services/locale.service';
import { AlertService } from '../../../core/services/alert.service';
import { SessionService } from '../../../core/services/session.service';
import { AccountAlert } from '../../../core/models/alert.model';
import { AppLocale } from '../../../core/models/user.model';
import { environment } from '../../../../environments/environment';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':     'Dashboard',
  '/transactions':  'Transactions',
  '/transfers':     'Transfers',
  '/bill-pay':      'Bill Pay',
  '/cards':         'Cards',
  '/statements':    'Statements',
  '/goals':         'Savings Goals',
  '/insights':      'Spending Insights',
  '/beneficiaries': 'Beneficiaries',
  '/disputes':      'Disputes',
  '/alerts':        'Alerts',
  '/profile':       'Profile',
  '/admin':         'Admin Console',
  '/manager':       'My Clients',
};

interface NavItem { path: string; icon: string; label: string; }

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatIconModule, MatButtonModule,
    MatMenuModule, MatBadgeModule, MatTooltipModule, MatDividerModule,
    MatDialogModule,
    TranslateModule,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class ShellComponent implements OnInit, OnDestroy {
  private router    = inject(Router);
  auth              = inject(AuthService);
  localeService     = inject(LocaleService);
  private alertSvc  = inject(AlertService);
  sessionSvc        = inject(SessionService);
  private dialog    = inject(MatDialog);

  readonly sessionTimeoutMinutes = environment.sessionTimeoutMinutes;

  ngOnInit(): void {
    this.sessionSvc.start(() => this.auth.logout());
  }

  ngOnDestroy(): void {
    this.sessionSvc.stop();
  }

  readonly locales: { value: AppLocale; flag: string; label: string }[] = [
    { value: 'en-US', flag: '🇺🇸', label: 'USD' },
    { value: 'en-GB', flag: '🇬🇧', label: 'GBP' },
    { value: 'en-IE', flag: '🇪🇺', label: 'EUR' },
  ];

  readonly enabledAlerts = computed(() => this.alertSvc.myAlerts().filter(a => a.enabled));
  readonly notificationCount = computed(() => this.enabledAlerts().length);
  isMobileOpen = signal(false);

  toggleSidebar(): void { this.isMobileOpen.update(v => !v); }
  closeSidebar():  void { this.isMobileOpen.set(false); }

  /** Nav items are computed based on the logged-in user's role. */
  readonly navItems = computed<NavItem[]>(() => {
    const role = this.auth.user()?.role;
    if (role === 'admin') return [
      { path: '/admin',   icon: 'admin_panel_settings', label: 'Admin Console' },
      { path: '/profile', icon: 'manage_accounts',      label: 'Profile' },
    ];
    if (role === 'account_manager') return [
      { path: '/manager', icon: 'group',                label: 'My Clients' },
      { path: '/profile', icon: 'manage_accounts',      label: 'Profile' },
    ];
    return [
      { path: '/dashboard',     icon: 'grid_view',             label: 'Dashboard' },
      { path: '/transactions',  icon: 'receipt_long',          label: 'Transactions' },
      { path: '/transfers',     icon: 'compare_arrows',        label: 'Transfers' },
      { path: '/bill-pay',      icon: 'payments',              label: 'Bill Pay' },
      { path: '/cards',         icon: 'credit_card',           label: 'Cards' },
      { path: '/statements',    icon: 'description',           label: 'Statements' },
      { path: '/goals',         icon: 'savings',               label: 'Goals' },
      { path: '/insights',      icon: 'insights',              label: 'Insights' },
      { path: '/beneficiaries', icon: 'people',                label: 'Beneficiaries' },
      { path: '/disputes',      icon: 'gavel',                 label: 'Disputes' },
      { path: '/alerts',        icon: 'notifications_active',  label: 'Alerts' },
      { path: '/profile',       icon: 'manage_accounts',       label: 'Profile' },
    ];
  });

  readonly pageTitle = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => PAGE_TITLES[(e as NavigationEnd).urlAfterRedirects.split('?')[0]] ?? 'Summit Valley Bank'),
      startWith(PAGE_TITLES[this.router.url.split('?')[0]] ?? 'Summit Valley Bank')
    ),
    { initialValue: 'Dashboard' }
  );

  readonly currentLocale = computed(() =>
    this.locales.find(l => l.value === this.localeService.locale()) ?? this.locales[0]
  );

  get userName(): string {
    const u = this.auth.user();
    return u ? `${u.firstName} ${u.lastName}` : '';
  }

  get userInitials(): string {
    const u = this.auth.user();
    if (!u) return 'U';
    return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
  }

  get userEmail(): string { return this.auth.user()?.email ?? ''; }

  get roleLabel(): string {
    const role = this.auth.user()?.role;
    if (role === 'admin') return 'Super Admin';
    if (role === 'account_manager') return 'Account Manager';
    return 'Customer';
  }

  get roleIcon(): string {
    const role = this.auth.user()?.role;
    if (role === 'admin') return 'verified_user';
    if (role === 'account_manager') return 'badge';
    return 'person';
  }

  alertIcon(trigger: string): string {
    const m: Record<string, string> = {
      large_transaction: 'payments',          low_balance:    'account_balance_wallet',
      card_used:         'credit_card',        login:          'login',
      payment_due:       'schedule',           transfer_sent:  'compare_arrows',
      direct_deposit:    'savings',
    };
    return m[trigger] ?? 'notifications';
  }

  alertIconClass(trigger: string): string {
    if (trigger === 'login')                         return 'security';
    if (trigger === 'direct_deposit' || trigger === 'low_balance') return 'credit';
    return 'warning';
  }

  alertChannels(alert: AccountAlert): string {
    return alert.channels
      .map(c => c === 'email' ? 'Email' : c === 'sms' ? 'SMS' : 'Push')
      .join(' · ') || 'No channels';
  }

  onLocaleChange(locale: AppLocale): void { this.localeService.setLocale(locale); }
  logout(): void { this.auth.logout(); }
}
