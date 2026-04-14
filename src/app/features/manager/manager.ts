import { Component, inject, computed, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { TransactionService } from '../../core/services/transaction.service';
import { LocaleService } from '../../core/services/locale.service';
import { PolicyService } from '../../core/services/policy.service';
import { ToastService } from '../../core/services/toast.service';
import { User } from '../../core/models/user.model';
import { Account } from '../../core/models/account.model';
import { Transaction } from '../../core/models/transaction.model';
import { MOCK_USERS, MOCK_ACCOUNTS, getAccountsByUserId } from '../../core/data/mock-data';

interface ClientSummary {
  user: User;
  accounts: Account[];
  recentTxns: Transaction[];
  totalBalance: number;
  currency: 'USD' | 'GBP';
  creditThisMonth: number;
  debitThisMonth: number;
}

@Component({
  selector: 'app-manager',
  standalone: true,
  imports: [
    MatIconModule, MatButtonModule, MatTooltipModule, MatDividerModule,
    MatSlideToggleModule, MatFormFieldModule, MatInputModule, FormsModule, DatePipe,
  ],
  templateUrl: './manager.html',
  styleUrl: './manager.scss',
})
export class ManagerComponent {
  auth       = inject(AuthService);
  txnSvc     = inject(TransactionService);
  locSvc     = inject(LocaleService);
  policySvc  = inject(PolicyService);
  private toast = inject(ToastService);

  readonly clients = computed<ClientSummary[]>(() => {
    const manager = this.auth.user();
    if (!manager || manager.role !== 'account_manager') return [];

    return (manager.managedUserIds ?? []).map(userId => {
      const user     = MOCK_USERS.find(u => u.id === userId)!;
      const accounts = getAccountsByUserId(userId);
      const currency = accounts[0]?.currency ?? 'USD';
      const allTxns  = accounts.flatMap(a => this.txnSvc.getTransactionsByAccountId(a.id));

      const now = new Date();
      const thisMonthTxns = allTxns.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });

      return {
        user,
        accounts,
        recentTxns: [...allTxns]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 4),
        totalBalance:    accounts.reduce((s, a) => s + a.balance, 0),
        currency,
        creditThisMonth: thisMonthTxns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0),
        debitThisMonth:  thisMonthTxns.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0),
      };
    }).filter(c => c.user);
  });

  readonly totalAssetsManaged = computed<string>(() => {
    const clients = this.clients();
    if (!clients.length) return '—';
    const usd = clients.filter(c => c.currency === 'USD').reduce((s, c) => s + c.totalBalance, 0);
    const gbp = clients.filter(c => c.currency === 'GBP').reduce((s, c) => s + c.totalBalance, 0);
    const parts: string[] = [];
    if (usd) parts.push(this.fmt(usd, 'USD'));
    if (gbp) parts.push(this.fmt(gbp, 'GBP'));
    return parts.join(' + ') || '—';
  });

  // ── Per-client deposit forms (keyed by userId) ────────────────────────────
  private _depositForms = signal<Record<string, { open: boolean; accountId: string; amount: string; note: string }>>({});

  isDepositOpen(userId: string): boolean {
    return this._depositForms()[userId]?.open ?? false;
  }

  getDepositForm(userId: string, firstAccountId: string) {
    return this._depositForms()[userId] ?? { open: false, accountId: firstAccountId, amount: '', note: '' };
  }

  toggleDepositForm(userId: string, firstAccountId: string): void {
    const current = this._depositForms()[userId];
    if (current?.open) {
      this._depositForms.update(f => ({ ...f, [userId]: { ...current, open: false } }));
    } else {
      this._depositForms.update(f => ({
        ...f,
        [userId]: { open: true, accountId: current?.accountId || firstAccountId, amount: '', note: '' },
      }));
    }
  }

  setDepositField(userId: string, field: 'accountId' | 'amount' | 'note', value: string): void {
    this._depositForms.update(f => ({
      ...f,
      [userId]: { ...this.getDepositForm(userId, ''), [field]: value },
    }));
  }

  submitDeposit(userId: string, currency: 'USD' | 'GBP', userName: string): void {
    const form = this._depositForms()[userId];
    if (!form) return;
    const amount = parseFloat(form.amount);
    if (!form.accountId || isNaN(amount) || amount <= 0) {
      this.toast.error('Please select an account and enter a valid amount.');
      return;
    }
    this.txnSvc.depositToAccount(form.accountId, amount, form.note || undefined);
    this.toast.success(`${this.fmt(amount, currency)} deposited into ${userName}'s account`);
    this._depositForms.update(f => ({ ...f, [userId]: { ...form, open: false, amount: '', note: '' } }));
  }

  // ── Per-client restriction draft messages (keyed by userId) ───────────────
  private _draftMessages = signal<Record<string, string>>({});

  getDraftMessage(userId: string): string {
    return this._draftMessages()[userId] ?? this.policySvc.getUserBlockPolicy(userId)?.denialMessage ?? '';
  }

  setDraftMessage(userId: string, msg: string): void {
    this._draftMessages.update(d => ({ ...d, [userId]: msg }));
  }

  isClientBlocked(userId: string): boolean {
    return this.policySvc.isUserBlocked(userId);
  }

  toggleClientBlock(userId: string, userName: string, enabled: boolean): void {
    const existing = this.policySvc.getUserBlockPolicy(userId);
    if (enabled) {
      const msg = this.getDraftMessage(userId) ||
        `Your outgoing transfers have been temporarily restricted by your account manager. Please contact Summit Valley Bank support for assistance.`;

      if (existing) {
        // Re-enable existing policy with current message
        this.policySvc.updatePolicy(existing.id, { enabled: true, denialMessage: msg });
      } else {
        this.policySvc.addPolicy({
          id:           `pol-mgr-${userId}-${Date.now()}`,
          name:         `Manager Block — ${userName}`,
          enabled:      true,
          targetUserId: userId,
          ruleType:     'block_all_outgoing',
          denialMessage: msg,
          createdBy:    this.auth.user()?.id ?? '',
          createdAt:    new Date().toISOString(),
        });
      }
      this.toast.warning(`Outgoing transfers blocked for ${userName}`, 3500);
    } else {
      if (existing) {
        this.policySvc.updatePolicy(existing.id, { enabled: false });
      }
      this.toast.info(`Outgoing transfers unblocked for ${userName}`);
    }
  }

  saveRestrictionMessage(userId: string, userName: string): void {
    const msg = this.getDraftMessage(userId).trim();
    if (!msg) {
      this.toast.error('Please enter a denial message before saving.');
      return;
    }
    const existing = this.policySvc.getUserBlockPolicy(userId);
    if (existing) {
      this.policySvc.updatePolicy(existing.id, { denialMessage: msg });
      this.toast.success(`Denial message updated for ${userName}`);
    } else {
      this.toast.info('Enable the restriction first, then save the message.');
    }
  }

  fmt(amount: number, currency: 'USD' | 'GBP'): string {
    return new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-US', {
      style: 'currency', currency,
    }).format(amount);
  }

  relativeDate(date: string): string {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7)   return `${diff} days ago`;
    return new Date(date).toLocaleDateString();
  }

  accountLabel(type: string, currency: 'USD' | 'GBP'): string {
    if (currency === 'GBP') return type === 'checking' ? 'Current' : 'Savings';
    return type === 'checking' ? 'Checking' : 'Savings';
  }

  categoryIcon(cat: string): string {
    const m: Record<string, string> = {
      salary: 'work', groceries: 'shopping_cart', utilities: 'bolt',
      dining: 'restaurant', shopping: 'local_mall', transfer: 'swap_horiz',
      deposit: 'add_circle', withdrawal: 'remove_circle', payment: 'payment', other: 'more_horiz',
    };
    return m[cat] ?? 'more_horiz';
  }

  statusClass(status: string): string {
    return `status-${status}`;
  }

  get managerName(): string {
    const u = this.auth.user();
    return u ? u.firstName : '';
  }
}
