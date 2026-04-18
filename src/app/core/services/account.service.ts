import { Injectable, inject, signal, computed, effect, WritableSignal } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Account } from '../models/account.model';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { MOCK_ACCOUNTS } from '../data/mock-data';

const STORAGE_KEY           = 'accounts';
// Stored WITHOUT svb_ prefix so they survive storage.clearAll() on DB reset
const ADMIN_DEPOSITS_KEY    = 'admin_deposit_amounts';
const DYNAMIC_ACCOUNTS_KEY  = 'dynamic_accounts';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private auth    = inject(AuthService);
  private storage = inject(StorageService);

  private _allAccounts: WritableSignal<Account[]>;
  /** Cumulative admin-deposited amount per accountId. Never wiped by DB reset. */
  private _adminDepositAmounts: WritableSignal<Record<string, number>>;
  /** Accounts created for admin-created users. Never wiped by DB reset. */
  private _dynamicAccounts: WritableSignal<Account[]>;

  constructor() {
    // Load persisted admin deposit totals first (needed during account init)
    const storedDeposits = this._loadJson<Record<string, number>>(ADMIN_DEPOSITS_KEY, {});
    this._adminDepositAmounts = signal<Record<string, number>>(storedDeposits);

    // Load accounts for admin-created users (survive DB reset)
    const storedDynamic = this._loadJson<Account[]>(DYNAMIC_ACCOUNTS_KEY, []);
    this._dynamicAccounts = signal<Account[]>(storedDynamic);

    const stored = this.storage.get<Account[]>(STORAGE_KEY);
    this._allAccounts = signal<Account[]>(
      stored ?? this._applyDeposits([...MOCK_ACCOUNTS, ...storedDynamic], storedDeposits)
    );

    effect(() => { this.storage.set(STORAGE_KEY, this._allAccounts()); });
    effect(() => { localStorage.setItem(ADMIN_DEPOSITS_KEY, JSON.stringify(this._adminDepositAmounts())); });
    effect(() => { localStorage.setItem(DYNAMIC_ACCOUNTS_KEY, JSON.stringify(this._dynamicAccounts())); });
  }

  private _loadJson<T>(key: string, fallback: T): T {
    try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; }
    catch { return fallback; }
  }

  private _applyDeposits(accounts: Account[], deposits: Record<string, number>): Account[] {
    return accounts.map(a => {
      const extra = deposits[a.id] ?? 0;
      return extra > 0
        ? { ...a, balance: a.balance + extra, availableBalance: a.availableBalance + extra }
        : a;
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

  /**
   * Record an admin/manager deposit. Updates both the live balance and the
   * persistent deposit tally so balances survive DB reset.
   */
  recordAdminDeposit(accountId: string, amount: number): void {
    this._adminDepositAmounts.update(d => ({ ...d, [accountId]: (d[accountId] ?? 0) + amount }));
    this._allAccounts.update(accounts =>
      accounts.map(a =>
        a.id === accountId
          ? { ...a, balance: a.balance + amount, availableBalance: a.availableBalance + amount }
          : a
      )
    );
  }

  /** Add a new account (admin-created users). Persists through DB reset. */
  addAccount(account: Account): void {
    this._allAccounts.update(accounts => [...accounts, account]);
    this._dynamicAccounts.update(accounts => [...accounts, account]);
  }

  /** Reset accounts back to seed data — preserves admin-created user accounts and deposits. */
  resetToSeedData(): void {
    const deposits = this._adminDepositAmounts();
    const dynamic  = this._dynamicAccounts();
    this._allAccounts.set(this._applyDeposits([...MOCK_ACCOUNTS, ...dynamic], deposits));
  }
}
