import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { AccountService } from '../../core/services/account.service';
import { TransactionService } from '../../core/services/transaction.service';
import { DisputeService } from '../../core/services/dispute.service';
import { LocaleService } from '../../core/services/locale.service';
import { ToastService } from '../../core/services/toast.service';
import { Dispute, DisputeStatus } from '../../core/models/dispute.model';
import { Transaction } from '../../core/models/transaction.model';
import { Account } from '../../core/models/account.model';
import { User } from '../../core/models/user.model';

type SupportTab = 'customers' | 'disputes' | 'transactions';

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './support.html',
  styleUrl: './support.scss',
})
export class SupportComponent {
  private auth       = inject(AuthService);
  private accountSvc = inject(AccountService);
  private txnSvc     = inject(TransactionService);
  private disputeSvc = inject(DisputeService);
  localeService      = inject(LocaleService);
  private toast      = inject(ToastService);

  activeTab       = signal<SupportTab>('customers');
  customerSearch  = signal('');
  disputeFilter   = signal<DisputeStatus | 'all'>('all');
  txnSearch       = signal('');
  expandedRow     = signal<string | null>(null);
  resettingPwd    = signal<string | null>(null);

  readonly agent = computed(() => this.auth.user());

  // ── Stats ─────────────────────────────────────────────────────────────────

  readonly stats = computed(() => {
    const disputes = this.disputeSvc.allDisputes();
    const open     = disputes.filter(d => d.status === 'submitted' || d.status === 'under_review').length;
    const today    = new Date().toISOString().slice(0, 10);
    const resolved = disputes.filter(d => d.resolvedAt?.startsWith(today)).length;
    return {
      customers:   this.customers().length,
      openDisputes: open,
      resolvedToday: resolved,
      totalDisputes: disputes.length,
    };
  });

  // ── Customers ─────────────────────────────────────────────────────────────

  readonly customers = computed<User[]>(() =>
    this.auth.allUsersReactive().filter(u => u.role === 'user')
  );

  readonly filteredCustomers = computed<User[]>(() => {
    const q = this.customerSearch().toLowerCase().trim();
    if (!q) return this.customers();
    return this.customers().filter(u =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.city?.toLowerCase().includes(q) ||
      u.country?.toLowerCase().includes(q)
    );
  });

  accountsFor(userId: string): Account[] {
    return this.accountSvc.getAccountsByUserId(userId);
  }

  totalBalance(userId: string): number {
    return this.accountsFor(userId).reduce((s, a) => s + a.balance, 0);
  }

  primaryCurrency(userId: string): string {
    return this.accountsFor(userId)[0]?.currency ?? 'USD';
  }

  initials(u: User): string {
    return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
  }

  toggleRow(id: string): void {
    this.expandedRow.set(this.expandedRow() === id ? null : id);
  }

  resetPassword(user: User): void {
    this.resettingPwd.set(user.id);
    try {
      this.auth.adminResetPassword(user.id);
      this.toast.success(`Password reset email sent to ${user.email}`);
    } catch {
      this.toast.error('Failed to reset password. Please try again.');
    } finally {
      this.resettingPwd.set(null);
    }
  }

  // ── Disputes ──────────────────────────────────────────────────────────────

  readonly allDisputes = computed<Dispute[]>(() => this.disputeSvc.allDisputes());

  readonly filteredDisputes = computed<Dispute[]>(() => {
    const filter = this.disputeFilter();
    const all    = this.allDisputes();
    return filter === 'all' ? all : all.filter(d => d.status === filter);
  });

  readonly disputeCounts = computed(() => {
    const all = this.allDisputes();
    return {
      all:          all.length,
      submitted:    all.filter(d => d.status === 'submitted').length,
      under_review: all.filter(d => d.status === 'under_review').length,
      resolved:     all.filter(d => d.status === 'resolved').length,
      rejected:     all.filter(d => d.status === 'rejected').length,
    };
  });

  updateStatus(d: Dispute, status: DisputeStatus): void {
    this.disputeSvc.updateDisputeStatus(d.id, status);
    this.toast.success(`${d.caseNumber} updated to "${this.statusLabel(status)}".`);
  }

  getDisputeTransaction(transactionId: string): Transaction | undefined {
    return this.txnSvc.allTransactions.find(t => t.id === transactionId);
  }

  // ── Transactions ──────────────────────────────────────────────────────────

  readonly filteredTransactions = computed<Transaction[]>(() => {
    const q    = this.txnSearch().toLowerCase().trim();
    const txns = this.txnSvc.transactions();   // reactive — returns all for CS role
    const sorted = [...txns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (!q) return sorted;
    return sorted.filter(t =>
      t.description.toLowerCase().includes(q) ||
      (t.reference ?? '').toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.accountId.toLowerCase().includes(q)
    );
  });

  // ── Shared helpers ────────────────────────────────────────────────────────

  getUserById(id: string): User | undefined {
    return this.auth.allUsersReactive().find(u => u.id === id);
  }

  getUserName(userId: string): string {
    const u = this.getUserById(userId);
    return u ? `${u.firstName} ${u.lastName}` : userId;
  }

  getAccountOwner(accountId: string): string {
    const acc = this.accountsFor('').length > 0 ? undefined : undefined;
    void acc;
    const all = this.auth.allUsersReactive();
    for (const user of all) {
      if (this.accountSvc.getAccountsByUserId(user.id).some(a => a.id === accountId)) {
        return `${user.firstName} ${user.lastName}`;
      }
    }
    return accountId;
  }

  fmt(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-US', {
      style: 'currency', currency,
    }).format(amount);
  }

  fmtDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      submitted: 'Submitted', under_review: 'Under Review',
      resolved: 'Resolved', rejected: 'Rejected',
      completed: 'Completed', pending: 'Pending', failed: 'Failed',
    };
    return map[status] ?? status;
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      submitted: 'badge-blue', under_review: 'badge-amber',
      resolved: 'badge-green', rejected: 'badge-red',
      completed: 'badge-green', pending: 'badge-purple', failed: 'badge-red',
    };
    return map[status] ?? '';
  }

  reasonLabel(reason: string): string {
    const map: Record<string, string> = {
      unauthorized: 'Unauthorized', duplicate: 'Duplicate',
      incorrect_amount: 'Wrong Amount', merchant_error: 'Merchant Error',
      not_received: 'Not Received', other: 'Other',
    };
    return map[reason] ?? reason;
  }

  flagEmoji(country: string): string {
    return country === 'GB' ? '🇬🇧' : country === 'IE' ? '🇪🇺' : '🇺🇸';
  }
}
