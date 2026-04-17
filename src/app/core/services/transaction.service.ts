import { Injectable, inject, signal, computed, effect, WritableSignal } from '@angular/core';
import { Observable, of, delay, tap } from 'rxjs';
import { Transaction, TransactionStatus, TransferRequest } from '../models/transaction.model';
import { AuthService } from './auth.service';
import { AccountService } from './account.service';
import { PolicyService } from './policy.service';
import { StorageService } from './storage.service';
import { EmailService } from './email.service';
import { MOCK_TRANSACTIONS, MOCK_USERS, MOCK_ACCOUNTS } from '../data/mock-data';

const STORAGE_KEY = 'transactions';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private auth       = inject(AuthService);
  private accSvc     = inject(AccountService);
  private policySvc  = inject(PolicyService);
  private storage    = inject(StorageService);
  private emailSvc   = inject(EmailService);

  private _all: WritableSignal<Transaction[]>;

  constructor() {
    // Load from localStorage — fall back to seed data on first run
    const stored = this.storage.get<Transaction[]>(STORAGE_KEY);
    this._all = signal<Transaction[]>(stored ?? MOCK_TRANSACTIONS);

    // Persist every change automatically
    effect(() => {
      this.storage.set(STORAGE_KEY, this._all());
    });
  }

  /** Transactions visible to the current user based on their role. */
  readonly transactions = computed<Transaction[]>(() => {
    const user = this.auth.user();
    if (!user) return [];
    if (user.role === 'admin') return this._all();
    const visibleIds = this.accSvc.accounts().map(a => a.id);
    return this._all().filter(t => visibleIds.includes(t.accountId));
  });

  getTransactions(accountId?: string): Observable<Transaction[]> {
    const list = accountId
      ? this.transactions().filter(t => t.accountId === accountId)
      : this.transactions();
    return of([...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())).pipe(delay(400));
  }

  getRecentTransactions(limit = 5): Transaction[] {
    return [...this.transactions()]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  /** All transactions for a specific accountId (admin/manager raw access). */
  getTransactionsByAccountId(accountId: string): Transaction[] {
    return this._all().filter(t => t.accountId === accountId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /** Admin-only: update the status of any transaction. */
  updateTransactionStatus(txnId: string, status: TransactionStatus): void {
    this._all.update(txns =>
      txns.map(t => t.id === txnId ? { ...t, status } : t)
    );
  }

  submitTransfer(request: TransferRequest): Observable<Transaction> {
    // ── Policy check ─────────────────────────────────────────────────────────
    const check = this.policySvc.evaluateTransfer(request);
    if (!check.allowed) {
      const currentBalance = this.accSvc.getAccountById(request.fromAccountId)?.balance ?? 0;
      const deniedTxn: Transaction = {
        id: `txn-${Date.now()}`,
        accountId: request.fromAccountId,
        date: new Date().toISOString(),
        description: request.isInternal
          ? 'Internal Transfer'
          : `Transfer to ${request.recipientName}`,
        category: 'transfer',
        type: 'debit',
        amount: request.amount,
        balance: currentBalance,   // balance unchanged — transaction was blocked
        status: 'failed',
        reference: `DENIED-${Date.now()}`,
        denialMessage: check.denialMessage,
      };
      this._all.update(txns => [deniedTxn, ...txns]);
      // Email: notify user their transfer was blocked
      const blockedUser = this.auth.user();
      if (blockedUser?.role === 'user') {
        const currency = this.accSvc.getAccountById(request.fromAccountId)?.currency ?? 'USD';
        const fmtAmt = new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-US', { style: 'currency', currency }).format(request.amount);
        this.emailSvc.sendTransferBlocked(blockedUser.email, blockedUser.firstName, {
          amount: fmtAmt,
          reason: check.denialMessage ?? 'Transfer declined by account policy.',
        });
      }
      return of(deniedTxn).pipe(delay(800));
    }

    // ── Balance check ─────────────────────────────────────────────────────────
    const fromAcc = this.accSvc.getAccountById(request.fromAccountId);
    const availableBalance = fromAcc?.availableBalance ?? 0;

    if (request.amount > availableBalance) {
      const insufficientTxn: Transaction = {
        id:          `txn-${Date.now()}`,
        accountId:   request.fromAccountId,
        date:        new Date().toISOString(),
        description: request.isInternal
          ? 'Internal Transfer'
          : `Transfer to ${request.recipientName}`,
        category:    'transfer',
        type:        'debit',
        amount:      request.amount,
        balance:     availableBalance,
        status:      'failed',
        reference:   `INSUF-${Date.now()}`,
        denialMessage: 'Insufficient funds.',
      };
      this._all.update(txns => [insufficientTxn, ...txns]);
      return of(insufficientTxn).pipe(delay(800));
    }

    // ── Normal flow ───────────────────────────────────────────────────────────
    const ref = `TRF-${Date.now()}`;
    const now = new Date().toISOString();

    const fromBalBefore  = fromAcc?.balance ?? 0;
    const newFromBalance = fromBalBefore - request.amount;

    const newTxn: Transaction = {
      id:           `txn-${Date.now()}`,
      accountId:    request.fromAccountId,
      date:         now,
      description:  request.isInternal
        ? 'Internal Transfer'
        : `Transfer to ${request.recipientName}`,
      category:     'transfer',
      type:         'debit',
      amount:       request.amount,
      balance:      newFromBalance,
      status:       'pending',
      reference:    ref,
      transferType: request.isInternal ? 'internal' : 'external',
    };

    this._all.update(txns => [newTxn, ...txns]);

    // ── External transfers: hold funds and wait for admin approval ────────────
    if (!request.isInternal) {
      this.accSvc.holdFunds(request.fromAccountId, request.amount);
      return of(newTxn).pipe(delay(1000));
    }

    // ── Internal transfers: auto-complete immediately ─────────────────────────
    return of(newTxn).pipe(
      delay(1000),
      tap(() => {
        this._all.update(txns =>
          txns.map(t => t.id === newTxn.id ? { ...t, status: 'completed' } : t)
        );
        this.accSvc.updateBalance(request.fromAccountId, newFromBalance);

        if (request.toAccountId) {
          const toAcc        = this.accSvc.getAccountById(request.toAccountId);
          const toBalBefore  = toAcc?.balance ?? 0;
          const newToBalance = toBalBefore + request.amount;
          this.accSvc.updateBalance(request.toAccountId, newToBalance);

          const creditTxn: Transaction = {
            id:          `txn-${Date.now()}-cr`,
            accountId:   request.toAccountId,
            date:        now,
            description: 'Internal Transfer Received',
            category:    'transfer',
            type:        'credit',
            amount:      request.amount,
            balance:     newToBalance,
            status:      'completed',
            reference:   ref,
            transferType: 'internal',
          };
          this._all.update(txns => [creditTxn, ...txns]);
        }

        const txnUser = this.auth.user();
        if (txnUser?.role === 'user') {
          const currency     = fromAcc?.currency ?? 'USD';
          const fmtAmt       = new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-US', { style: 'currency', currency }).format(request.amount);
          const fromAccLabel = fromAcc ? `${fromAcc.type === 'checking' ? 'Checking' : 'Savings'} ···· ${fromAcc.accountNumber.slice(-4)}` : undefined;
          this.emailSvc.sendTransferConfirmation(txnUser.email, txnUser.firstName, {
            amount:      fmtAmt,
            recipient:   'Your account',
            fromAccount: fromAccLabel,
            reference:   ref,
            isInternal:  true,
          });
        }
      }),
    );
  }

  /** Admin: approve a pending external transfer — finalises the balance deduction. */
  approveExternalTransfer(txnId: string): void {
    const txn = this._all().find(t => t.id === txnId);
    if (!txn || txn.status !== 'pending') return;
    const acc = this.accSvc.getAccountById(txn.accountId);
    if (!acc) return;

    const newBalance = acc.balance - txn.amount;
    this.accSvc.updateBalance(txn.accountId, newBalance);
    this._all.update(txns =>
      txns.map(t => t.id === txnId ? { ...t, status: 'completed' } : t)
    );

    // Email: transfer confirmed
    const allUsers = this.auth.allUsersReactive();
    const owner = allUsers.find(u => u.id === acc.userId);
    if (owner?.role === 'user') {
      const currency     = acc.currency;
      const fmtAmt       = new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-US', { style: 'currency', currency }).format(txn.amount);
      const accLabel     = `${acc.type === 'checking' ? 'Checking' : 'Savings'} ···· ${acc.accountNumber.slice(-4)}`;
      this.emailSvc.sendTransferConfirmation(owner.email, owner.firstName, {
        amount:      fmtAmt,
        recipient:   txn.description.replace('Transfer to ', ''),
        fromAccount: accLabel,
        reference:   txn.reference,
        isInternal:  false,
      });
    }
  }

  /** Admin: reject a pending external transfer — releases the hold and notifies the user. */
  rejectExternalTransfer(txnId: string, reason: string): void {
    const txn = this._all().find(t => t.id === txnId);
    if (!txn || txn.status !== 'pending') return;
    const acc = this.accSvc.getAccountById(txn.accountId);
    if (!acc) return;

    this.accSvc.releaseHold(txn.accountId, txn.amount);
    this._all.update(txns =>
      txns.map(t => t.id === txnId ? { ...t, status: 'failed', rejectionReason: reason } : t)
    );

    // Email: transfer blocked
    const allUsers = this.auth.allUsersReactive();
    const owner = allUsers.find(u => u.id === acc.userId);
    if (owner?.role === 'user') {
      const currency = acc.currency;
      const fmtAmt   = new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-US', { style: 'currency', currency }).format(txn.amount);
      this.emailSvc.sendTransferBlocked(owner.email, owner.firstName, {
        amount: fmtAmt,
        reason,
      });
    }
  }

  /**
   * Admin / account-manager only: credit a deposit directly into a customer account.
   * Creates a completed 'deposit' credit transaction and updates the account balance.
   */
  depositToAccount(accountId: string, amount: number, note?: string): void {
    const acc = this.accSvc.getAccountById(accountId);
    if (!acc) return;
    const newBalance = acc.balance + amount;
    const now = new Date().toISOString();

    const txn: Transaction = {
      id:          `txn-dep-${Date.now()}`,
      accountId,
      date:        now,
      description: note?.trim() || 'Manual Deposit',
      category:    'deposit',
      type:        'credit',
      amount,
      balance:     newBalance,
      status:      'completed',
      reference:   `DEP-${Date.now()}`,
    };

    this._all.update(txns => [txn, ...txns]);
    this.accSvc.updateBalance(accountId, newBalance);

    // Email: notify the account owner of the deposit
    const owner = MOCK_USERS.find(u => u.id === acc.userId);
    if (owner?.role === 'user') {
      const currency   = acc.currency;
      const fmtAmt     = new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-US', { style: 'currency', currency }).format(amount);
      const accLabel   = `${acc.type === 'checking' ? 'Checking' : 'Savings'} ···· ${acc.accountNumber.slice(-4)}`;
      const depositor  = this.auth.user();
      const depositedBy = depositor ? `${depositor.firstName} ${depositor.lastName} (${depositor.role === 'admin' ? 'Admin' : 'Account Manager'})` : 'Summit Valley Bank';
      this.emailSvc.sendDepositNotification(owner.email, owner.firstName, {
        amount:      fmtAmt,
        account:     accLabel,
        note:        note?.trim(),
        depositedBy,
      });
    }
  }

  /** Reset transactions back to seed data (admin use). */
  resetToSeedData(): void {
    this._all.set([...MOCK_TRANSACTIONS]);
  }

  get allTransactions(): Transaction[] { return this._all(); }
}
