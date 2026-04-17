import { Injectable, inject, signal, computed, effect, WritableSignal } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Account } from '../models/account.model';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { MOCK_ACCOUNTS } from '../data/mock-data';

const STORAGE_KEY = 'accounts';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private auth    = inject(AuthService);
  private storage = inject(StorageService);

  private _allAccounts: WritableSignal<Account[]>;

  constructor() {
    const stored = this.storage.get<Account[]>(STORAGE_KEY);
    this._allAccounts = signal<Account[]>(stored ?? MOCK_ACCOUNTS);

    effect(() => {
      this.storage.set(STORAGE_KEY, this._allAccounts());
    });
  }

  /** Accounts visible to the current user based on their role. */
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
        a.id === accountId ? { ...a, balance: newBalance, availableBalance: newBalance } : a
      )
    );
  }

  /** Reserve funds for a pending external transfer (reduces availableBalance only). */
  holdFunds(accountId: string, amount: number): void {
    this._allAccounts.update(accounts =>
      accounts.map(a =>
        a.id === accountId ? { ...a, availableBalance: a.availableBalance - amount } : a
      )
    );
  }

  /** Release a hold when a pending external transfer is rejected. */
  releaseHold(accountId: string, amount: number): void {
    this._allAccounts.update(accounts =>
      accounts.map(a =>
        a.id === accountId ? { ...a, availableBalance: a.availableBalance + amount } : a
      )
    );
  }

  /** Add a new account (admin-created users). */
  addAccount(account: Account): void {
    this._allAccounts.update(accounts => [...accounts, account]);
  }

  /** Reset accounts back to seed data (admin use). */
  resetToSeedData(): void {
    this._allAccounts.set([...MOCK_ACCOUNTS]);
  }
}
