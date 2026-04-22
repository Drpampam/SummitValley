import { Injectable, inject, signal, computed, WritableSignal } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Account } from '../models/account.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { MOCK_ACCOUNTS } from '../data/mock-data';

function rowToAccount(r: Record<string, unknown>): Account {
  return {
    id:               r['id'] as string,
    userId:           r['user_id'] as string,
    type:             r['type'] as 'checking' | 'savings',
    accountNumber:    r['account_number'] as string,
    balance:          Number(r['balance']),
    availableBalance: Number(r['available_balance']),
    currency:         r['currency'] as 'USD' | 'GBP',
    createdAt:        r['created_at'] as string,
  };
}

function accountToRow(a: Account): Record<string, unknown> {
  return {
    id:               a.id,
    user_id:          a.userId,
    type:             a.type,
    account_number:   a.accountNumber,
    balance:          a.balance,
    available_balance: a.availableBalance,
    currency:         a.currency,
    created_at:       a.createdAt,
  };
}

@Injectable({ providedIn: 'root' })
export class AccountService {
  private auth = inject(AuthService);
  private sb   = inject(SupabaseService);

  private _allAccounts: WritableSignal<Account[]> = signal([]);

  constructor() {
    this._loadFromSupabase();
  }

  private async _loadFromSupabase(): Promise<void> {
    if (!this.sb.isConfigured) return;
    try {
      const { data, error } = await this.sb.client.from('accounts').select('*');
      if (error) { console.error('[AccountService] load error:', error); return; }
      if (!data || data.length === 0) { await this._seed(); return; }
      this._allAccounts.set(data.map(rowToAccount));
    } catch (err) {
      console.error('[AccountService] Supabase unreachable:', err);
    }
  }

  private async _seed(): Promise<void> {
    const { error } = await this.sb.client.from('accounts').insert(MOCK_ACCOUNTS.map(accountToRow));
    if (error) { console.error('[AccountService] seed error:', error); return; }
    this._allAccounts.set([...MOCK_ACCOUNTS]);
  }

  readonly accounts = computed<Account[]>(() => {
    const user = this.auth.user();
    if (!user) return [];
    if (user.role === 'admin') return this._allAccounts();
    if (user.role === 'account_manager') {
      const ids = user.managedUserIds ?? [];
      return this._allAccounts().filter(a => ids.includes(a.userId));
    }
    return this._allAccounts().filter(a => a.userId === user.id);
  });

  getAccounts(): Observable<Account[]> {
    return of(this.accounts()).pipe(delay(400));
  }

  getAccountById(id: string): Account | undefined {
    return this._allAccounts().find(a => a.id === id);
  }

  getAccountsByUserId(userId: string): Account[] {
    return this._allAccounts().filter(a => a.userId === userId);
  }

  getTotalBalance(): number {
    return this.accounts().reduce((sum, a) => sum + a.balance, 0);
  }

  getTotalBalanceForUser(userId: string): number {
    return this._allAccounts()
      .filter(a => a.userId === userId)
      .reduce((sum, a) => sum + a.balance, 0);
  }

  updateBalance(accountId: string, newBalance: number): void {
    this._allAccounts.update(accounts =>
      accounts.map(a =>
        a.id === accountId
          ? { ...a, balance: newBalance, availableBalance: newBalance }
          : a
      )
    );
    if (this.sb.isConfigured) {
      this.sb.client.from('accounts')
        .update({ balance: newBalance, available_balance: newBalance })
        .eq('id', accountId)
        .then(({ error }) => { if (error) console.error('[AccountService] updateBalance error:', error); });
    }
  }

  holdFunds(accountId: string, amount: number): void {
    this._allAccounts.update(accounts =>
      accounts.map(a =>
        a.id === accountId
          ? { ...a, availableBalance: a.availableBalance - amount }
          : a
      )
    );
    const acc = this._allAccounts().find(a => a.id === accountId);
    if (acc && this.sb.isConfigured) {
      this.sb.client.from('accounts')
        .update({ available_balance: acc.availableBalance })
        .eq('id', accountId)
        .then(({ error }) => { if (error) console.error('[AccountService] holdFunds error:', error); });
    }
  }

  releaseHold(accountId: string, amount: number): void {
    this._allAccounts.update(accounts =>
      accounts.map(a =>
        a.id === accountId
          ? { ...a, availableBalance: a.availableBalance + amount }
          : a
      )
    );
    const acc = this._allAccounts().find(a => a.id === accountId);
    if (acc && this.sb.isConfigured) {
      this.sb.client.from('accounts')
        .update({ available_balance: acc.availableBalance })
        .eq('id', accountId)
        .then(({ error }) => { if (error) console.error('[AccountService] releaseHold error:', error); });
    }
  }

  recordAdminDeposit(accountId: string, amount: number): void {
    this._allAccounts.update(accounts =>
      accounts.map(a =>
        a.id === accountId
          ? { ...a, balance: a.balance + amount, availableBalance: a.availableBalance + amount }
          : a
      )
    );
    const acc = this._allAccounts().find(a => a.id === accountId);
    if (acc && this.sb.isConfigured) {
      this.sb.client.from('accounts')
        .update({ balance: acc.balance, available_balance: acc.availableBalance })
        .eq('id', accountId)
        .then(({ error }) => { if (error) console.error('[AccountService] recordAdminDeposit error:', error); });
    }
  }

  addAccount(account: Account): void {
    this._allAccounts.update(accounts => [...accounts, account]);
    if (this.sb.isConfigured) {
      this.sb.client.from('accounts').insert(accountToRow(account))
        .then(({ error }) => { if (error) console.error('[AccountService] addAccount error:', error); });
    }
  }

  /** No-op — data now lives in Supabase and persists across deployments. */
  resetToSeedData(): void { /* intentional no-op */ }
}
