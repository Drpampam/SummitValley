import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { TitleCasePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { AccountService } from '../../core/services/account.service';
import { TransactionService } from '../../core/services/transaction.service';
import { LocaleService } from '../../core/services/locale.service';
import { Account } from '../../core/models/account.model';
import { Transaction } from '../../core/models/transaction.model';

interface SpendingCategory {
  category: string;
  amount: number;
  percentage: number;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatTooltipModule,
    MatRippleModule,
    TitleCasePipe,
    TranslateModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  auth           = inject(AuthService);
  accountService = inject(AccountService);
  txnService     = inject(TransactionService);
  localeService  = inject(LocaleService);

  accounts           = signal<Account[]>([]);
  animatedBalance    = signal(0);
  copiedAccountId    = signal<string | null>(null);

  /** Reactive — updates automatically when new transactions arrive. */
  readonly recentTransactions = computed(() => this.txnService.getRecentTransactions(5));

  readonly quickActions = [
    { icon: 'compare_arrows', label: 'Transfer',  route: '/transfers',  bg: '#dcfce7', color: '#16a34a' },
    { icon: 'payments',       label: 'Bill Pay',  route: '/bill-pay',   bg: '#f0fdf4', color: '#15803d' },
    { icon: 'description',    label: 'Statements', route: '/statements', bg: '#fefce8', color: '#a16207' },
  ];

  // ── Computed ─────────────────────────────────────────────────────────────────
  monthlyStats = computed(() => {
    const now  = new Date();
    const txns = this.txnService.transactions().filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const income   = txns.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const expenses = txns.filter((t) => t.type === 'debit' ).reduce((s, t) => s + t.amount, 0);
    return { income, expenses, net: income - expenses };
  });

  spendingByCategory = computed((): SpendingCategory[] => {
    const debits = this.txnService.transactions().filter((t) => t.type === 'debit');
    const total  = debits.reduce((s, t) => s + t.amount, 0);
    if (!total) return [];
    const byCategory: Record<string, number> = {};
    debits.forEach((t) => { byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount; });
    return Object.entries(byCategory)
      .map(([category, amount]) => ({
        category, amount,
        percentage: Math.round((amount / total) * 100),
        icon:  this.categoryIcon(category),
        color: this.categoryColor(category),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.accountService.getAccounts().subscribe((accounts) => {
      this.accounts.set(accounts);
      this.animateBalance(this.accountService.getTotalBalance());
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  private animateBalance(target: number): void {
    const duration = 1400;
    const steps    = 80;
    const stepVal  = target / steps;
    let current    = 0;
    let step       = 0;
    const ease = (t: number) => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
    const timer = setInterval(() => {
      step++;
      current = ease(step / steps) * target;
      this.animatedBalance.set(Math.min(current, target));
      if (step >= steps) { this.animatedBalance.set(target); clearInterval(timer); }
    }, duration / steps);
  }

  get totalBalance(): number { return this.accountService.getTotalBalance(); }
  get firstName():    string  { return this.auth.user()?.firstName ?? ''; }

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  fmt(amount: number): string       { return this.localeService.formatCurrency(amount); }
  fmtDate(date: string): string     { return this.localeService.formatDate(date); }

  relativeDate(date: string): string {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7)  return `${diff} days ago`;
    return this.localeService.formatDateShort(date);
  }

  accountLabel(type: string): string {
    if (this.localeService.isUK()) return type === 'checking' ? 'Current Account' : 'Savings Account';
    return type === 'checking' ? 'Checking Account' : 'Savings Account';
  }

  accountGradient(idx: number): string {
    return idx === 0
      ? 'linear-gradient(135deg, #052e16 0%, #14532d 50%, #166534 100%)'
      : 'linear-gradient(135deg, #16a34a 0%, #4ade80 80%, #a3e635 100%)';
  }

  copyAccountNumber(number: string, id: string): void {
    navigator.clipboard?.writeText(number).catch(() => {});
    this.copiedAccountId.set(id);
    setTimeout(() => this.copiedAccountId.set(null), 2000);
  }

  categoryIcon(cat: string): string {
    const m: Record<string, string> = {
      salary: 'work', groceries: 'shopping_cart', utilities: 'bolt',
      dining: 'restaurant', shopping: 'local_mall', transfer: 'swap_horiz',
      deposit: 'add_circle', withdrawal: 'remove_circle', payment: 'payment', other: 'more_horiz',
    };
    return m[cat] ?? 'more_horiz';
  }

  categoryColor(cat: string): string {
    const m: Record<string, string> = {
      salary: '#8b5cf6', groceries: '#16a34a', utilities: '#0891b2',
      dining: '#f59e0b', shopping: '#ec4899', transfer: '#4ade80',
      deposit: '#10b981', withdrawal: '#ef4444', payment: '#64748b', other: '#94a3b8',
    };
    return m[cat] ?? '#94a3b8';
  }
}
