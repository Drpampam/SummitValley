import { Injectable, inject, signal, computed, WritableSignal } from '@angular/core';
import { Observable, of, delay, tap } from 'rxjs';
import { Transaction, TransactionStatus, TransferRequest } from '../models/transaction.model';
import { AuthService } from './auth.service';
import { AccountService } from './account.service';
import { PolicyService } from './policy.service';
import { EmailService } from './email.service';
import { SupabaseService } from './supabase.service';

function rowToTransaction(r: Record<string, unknown>): Transaction {
  return {
    id:              r['id'] as string,
    accountId:       r['account_id'] as string,
    date:            r['date'] as string,
    description:     r['description'] as string,
    category:        r['category'] as Transaction['category'],
    type:            r['type'] as Transaction['type'],
    amount:          Number(r['amount']),
    balance:         Number(r['balance']),
    status:          r['status'] as TransactionStatus,
    reference:       r['reference'] as string | undefined,
    transferType:    r['transfer_type'] as Transaction['transferType'],
    denialMessage:   r['denial_message'] as string | undefined,
    rejectionReason: r['rejection_reason'] as string | undefined,
  };
}

function transactionToRow(t: Transaction): Record<string, unknown> {
  return {
    id:               t.id,
    account_id:       t.accountId,
    date:             t.date,
    description:      t.description,
    category:         t.category,
    type:             t.type,
    amount:           t.amount,
    balance:          t.balance,
    status:           t.status,
    reference:        t.reference ?? null,
    transfer_type:    t.transferType ?? null,
    denial_message:   t.denialMessage ?? null,
    rejection_reason: t.rejectionReason ?? null,
  };
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private auth      = inject(AuthService);
  private accSvc    = inject(AccountService);
  private policySvc = inject(PolicyService);
  private emailSvc  = inject(EmailService);
  private sb        = inject(SupabaseService);

  private _all: WritableSignal<Transaction[]> = signal([]);

  constructor() {
    this._loadFromSupabase();
  }

  private async _loadFromSupabase(): Promise<void> {
    if (!this.sb.isConfigured) return;
    try {
      const { data, error } = await this.sb.client.from('transactions').select('*');
      if (error) { console.error('[TransactionService] load error:', error); return; }
      if (data && data.length > 0) {
        this._all.set(data.map(rowToTransaction));
      }
    } catch (err) {
      console.error('[TransactionService] Supabase unreachable:', err);
    }
  }

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

  getTransactionsByAccountId(accountId: string): Transaction[] {
    return this._all()
      .filter(t => t.accountId === accountId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  updateTransactionStatus(txnId: string, status: TransactionStatus): void {
    this._all.update(txns => txns.map(t => t.id === txnId ? { ...t, status } : t));
    if (this.sb.isConfigured) {
      this.sb.client.from('transactions').update({ status }).eq('id', txnId)
        .then(({ error }) => { if (error) console.error('[TransactionService] updateStatus error:', error); });
    }
  }

  submitTransfer(request: TransferRequest): Observable<Transaction> {
    // ── Policy check ──────────────────────────────────────────────────────────
    const check = this.policySvc.evaluateTransfer(request);
    if (!check.allowed) {
      const currentBalance = this.accSvc.getAccountById(request.fromAccountId)?.balance ?? 0;
      const deniedTxn: Transaction = {
        id:           `txn-${Date.now()}`,
        accountId:    request.fromAccountId,
        date:         new Date().toISOString(),
        description:  request.isInternal ? 'Internal Transfer' : `Transfer to ${request.recipientName}`,
        category:     'transfer',
        type:         'debit',
        amount:       request.amount,
        balance:      currentBalance,
        status:       'failed',
        reference:    `DENIED-${Date.now()}`,
        denialMessage: check.denialMessage,
      };
      this._all.update(txns => [deniedTxn, ...txns]);
      this._persistTxn(deniedTxn);

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
        id:           `txn-${Date.now()}`,
        accountId:    request.fromAccountId,
        date:         new Date().toISOString(),
        description:  request.isInternal ? 'Internal Transfer' : `Transfer to ${request.recipientName}`,
        category:     'transfer',
        type:         'debit',
        amount:       request.amount,
        balance:      availableBalance,
        status:       'failed',
        reference:    `INSUF-${Date.now()}`,
        denialMessage: 'Insufficient funds.',
      };
      this._all.update(txns => [insufficientTxn, ...txns]);
      this._persistTxn(insufficientTxn);
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
      description:  request.isInternal ? 'Internal Transfer' : `Transfer to ${request.recipientName}`,
      category:     'transfer',
      type:         'debit',
      amount:       request.amount,
      balance:      newFromBalance,
      status:       'pending',
      reference:    ref,
      transferType: request.isInternal ? 'internal' : 'external',
    };

    this._all.update(txns => [newTxn, ...txns]);
    this._persistTxn(newTxn);

    if (!request.isInternal) {
      this.accSvc.holdFunds(request.fromAccountId, request.amount);
      return of(newTxn).pipe(delay(1000));
    }

    return of(newTxn).pipe(
      delay(1000),
      tap(() => {
        const completedTxn = { ...newTxn, status: 'completed' as TransactionStatus };
        this._all.update(txns => txns.map(t => t.id === newTxn.id ? completedTxn : t));
        if (this.sb.isConfigured) {
          this.sb.client.from('transactions').update({ status: 'completed' }).eq('id', newTxn.id)
            .then(({ error }) => { if (error) console.error('[TransactionService] complete error:', error); });
        }

        this.accSvc.updateBalance(request.fromAccountId, newFromBalance);

        if (request.toAccountId) {
          const toAcc        = this.accSvc.getAccountById(request.toAccountId);
          const newToBalance = (toAcc?.balance ?? 0) + request.amount;
          this.accSvc.updateBalance(request.toAccountId, newToBalance);

          const creditTxn: Transaction = {
            id:           `txn-${Date.now()}-cr`,
            accountId:    request.toAccountId,
            date:         now,
            description:  'Internal Transfer Received',
            category:     'transfer',
            type:         'credit',
            amount:       request.amount,
            balance:      newToBalance,
            status:       'completed',
            reference:    ref,
            transferType: 'internal',
          };
          this._all.update(txns => [creditTxn, ...txns]);
          this._persistTxn(creditTxn);
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

  approveExternalTransfer(txnId: string): void {
    const txn = this._all().find(t => t.id === txnId);
    if (!txn || txn.status !== 'pending') return;
    const acc = this.accSvc.getAccountById(txn.accountId);
    if (!acc) return;

    const newBalance = acc.balance - txn.amount;
    this.accSvc.updateBalance(txn.accountId, newBalance);
    this._all.update(txns => txns.map(t => t.id === txnId ? { ...t, status: 'completed' } : t));
    if (this.sb.isConfigured) {
      this.sb.client.from('transactions').update({ status: 'completed' }).eq('id', txnId)
        .then(({ error }) => { if (error) console.error('[TransactionService] approve error:', error); });
    }

    const owner = this.auth.allUsersReactive().find(u => u.id === acc.userId);
    if (owner?.role === 'user') {
      const currency   = acc.currency;
      const fmtAmt     = new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-US', { style: 'currency', currency }).format(txn.amount);
      const accLabel   = `${acc.type === 'checking' ? 'Checking' : 'Savings'} ···· ${acc.accountNumber.slice(-4)}`;
      this.emailSvc.sendTransferConfirmation(owner.email, owner.firstName, {
        amount:      fmtAmt,
        recipient:   txn.description.replace('Transfer to ', ''),
        fromAccount: accLabel,
        reference:   txn.reference,
        isInternal:  false,
      });
    }
  }

  rejectExternalTransfer(txnId: string, reason: string): void {
    const txn = this._all().find(t => t.id === txnId);
    if (!txn || txn.status !== 'pending') return;
    const acc = this.accSvc.getAccountById(txn.accountId);
    if (!acc) return;

    this.accSvc.releaseHold(txn.accountId, txn.amount);
    this._all.update(txns => txns.map(t => t.id === txnId ? { ...t, status: 'failed', rejectionReason: reason } : t));
    if (this.sb.isConfigured) {
      this.sb.client.from('transactions').update({ status: 'failed', rejection_reason: reason }).eq('id', txnId)
        .then(({ error }) => { if (error) console.error('[TransactionService] reject error:', error); });
    }

    const owner = this.auth.allUsersReactive().find(u => u.id === acc.userId);
    if (owner?.role === 'user') {
      const currency = acc.currency;
      const fmtAmt   = new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-US', { style: 'currency', currency }).format(txn.amount);
      this.emailSvc.sendTransferBlocked(owner.email, owner.firstName, { amount: fmtAmt, reason });
    }
  }

  depositToAccount(accountId: string, amount: number, note?: string): void {
    const acc = this.accSvc.getAccountById(accountId);
    if (!acc) return;

    this.accSvc.recordAdminDeposit(accountId, amount);

    const newBalance = acc.balance + amount;
    const now        = new Date().toISOString();
    const txn: Transaction = {
      id:          `txn-dep-${Date.now()}`,
      accountId,
      date:        now,
      description: note?.trim() || 'Account Deposit',
      category:    'deposit',
      type:        'credit',
      amount,
      balance:     newBalance,
      status:      'completed',
      reference:   `DEP-${Date.now()}`,
    };

    this._all.update(txns => [txn, ...txns]);
    this._persistTxn(txn);

    const owner = this.auth.allUsersReactive().find(u => u.id === acc.userId);
    if (owner?.role === 'user') {
      const currency    = acc.currency;
      const fmtAmt      = new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-US', { style: 'currency', currency }).format(amount);
      const accLabel    = `${acc.type === 'checking' ? 'Checking' : 'Savings'} ···· ${acc.accountNumber.slice(-4)}`;
      const depositor   = this.auth.user();
      const depositedBy = depositor
        ? `${depositor.firstName} ${depositor.lastName} (${depositor.role === 'admin' ? 'Admin' : 'Account Manager'})`
        : 'Summit Valley Bank';
      this.emailSvc.sendDepositNotification(owner.email, owner.firstName, {
        amount: fmtAmt, account: accLabel, note: note?.trim(), depositedBy,
      });
    }
  }

  /** No-op — data now lives in Supabase and persists across deployments. */
  resetToSeedData(): void { /* intentional no-op */ }

  get allTransactions(): Transaction[] { return this._all(); }

  private _persistTxn(t: Transaction): void {
    if (!this.sb.isConfigured) return;
    this.sb.client.from('transactions').insert(transactionToRow(t))
      .then(({ error }) => { if (error) console.error('[TransactionService] persist error:', error); });
  }
}
