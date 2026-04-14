import { Component, inject, signal, computed } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TitleCasePipe, DatePipe, DecimalPipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { AccountService } from '../../core/services/account.service';
import { TransactionService } from '../../core/services/transaction.service';
import { PolicyService } from '../../core/services/policy.service';
import { StorageService } from '../../core/services/storage.service';
import { LocaleService } from '../../core/services/locale.service';
import { ToastService } from '../../core/services/toast.service';
import { User, UserRole } from '../../core/models/user.model';
import { Transaction, TransactionStatus, TransactionPolicy, PolicyRuleType } from '../../core/models/transaction.model';
import { Account } from '../../core/models/account.model';
import { MOCK_USERS, MOCK_ACCOUNTS, MOCK_TRANSACTIONS, getManagerForUser, getAccountsByUserId } from '../../core/data/mock-data';

export interface AdminTxnRow extends Transaction {
  userName: string;
  userEmail: string;
  currency: 'USD' | 'GBP';
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    MatTableModule, MatTabsModule, MatSelectModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatTooltipModule, MatChipsModule,
    MatDividerModule, MatSlideToggleModule, FormsModule, ReactiveFormsModule,
    TitleCasePipe, DatePipe, DecimalPipe,
  ],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class AdminComponent {
  auth          = inject(AuthService);
  accSvc        = inject(AccountService);
  txnSvc        = inject(TransactionService);
  locSvc        = inject(LocaleService);
  policySvc     = inject(PolicyService);
  private storage = inject(StorageService);
  private fb    = inject(FormBuilder);
  private toast = inject(ToastService);

  // ── Filters ───────────────────────────────────────────────────────────────
  filterUserId  = signal<string>('');
  filterStatus  = signal<string>('');

  // ── Policy UI state ───────────────────────────────────────────────────────
  showPolicyForm = signal(false);
  editingPolicyId = signal<string | null>(null);

  policyForm = this.fb.group({
    name:             ['', Validators.required],
    targetUserId:     [''],          // '' = all users
    ruleType:         ['block_all_outgoing' as PolicyRuleType, Validators.required],
    amountThreshold:  [null as number | null],
    denialMessage:    ['', Validators.required],
  });

  // ── Data ──────────────────────────────────────────────────────────────────
  readonly allUsers = MOCK_USERS.filter(u => u.role === 'user');
  readonly allManagers = MOCK_USERS.filter(u => u.role === 'account_manager');

  readonly txnRows = computed<AdminTxnRow[]>(() => {
    const allTxns = this.txnSvc.allTransactions;
    return allTxns
      .map(t => {
        const acc = MOCK_ACCOUNTS.find(a => a.id === t.accountId);
        const user = MOCK_USERS.find(u => u.id === acc?.userId);
        return {
          ...t,
          userName:  user ? `${user.firstName} ${user.lastName}` : '—',
          userEmail: user?.email ?? '—',
          currency:  acc?.currency ?? 'USD',
        } as AdminTxnRow;
      })
      .filter(t => {
        const uid = this.filterUserId();
        const st  = this.filterStatus();
        const acc = MOCK_ACCOUNTS.find(a => a.id === t.accountId);
        if (uid && acc?.userId !== uid) return false;
        if (st  && t.status !== st) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  readonly stats = computed(() => {
    const txns = this.txnSvc.allTransactions;
    return {
      totalUsers:     this.allUsers.length,
      totalAccounts:  MOCK_ACCOUNTS.length,
      pending:        txns.filter(t => t.status === 'pending').length,
      failed:         txns.filter(t => t.status === 'failed').length,
      volume:         txns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0),
      activePolicies: this.policySvc.activePolicies().length,
    };
  });

  // ── Add Funds / Deposit ───────────────────────────────────────────────────
  depositUserId    = signal<string | null>(null);
  depositAccountId = signal<string>('');
  depositAmount    = signal<string>('');
  depositNote      = signal<string>('');

  openDepositPanel(userId: string): void {
    const accounts = getAccountsByUserId(userId);
    this.depositUserId.set(userId);
    this.depositAccountId.set(accounts[0]?.id ?? '');
    this.depositAmount.set('');
    this.depositNote.set('');
  }

  closeDepositPanel(): void { this.depositUserId.set(null); }

  getDepositUserName(): string {
    const u = MOCK_USERS.find(u => u.id === this.depositUserId());
    return u ? `${u.firstName} ${u.lastName}` : '';
  }

  getDepositCurrencySymbol(): string {
    const acc = MOCK_ACCOUNTS.find(a => a.id === this.depositAccountId());
    return acc?.currency === 'GBP' ? '£' : '$';
  }

  submitAdminDeposit(): void {
    const userId    = this.depositUserId();
    const accountId = this.depositAccountId();
    const amount    = parseFloat(this.depositAmount());
    if (!userId || !accountId || isNaN(amount) || amount <= 0) {
      this.toast.error('Please select an account and enter a valid amount.');
      return;
    }
    const acc = MOCK_ACCOUNTS.find(a => a.id === accountId);
    const user = MOCK_USERS.find(u => u.id === userId);
    const currency = (acc?.currency ?? 'USD') as 'USD' | 'GBP';
    this.txnSvc.depositToAccount(accountId, amount, this.depositNote() || undefined);
    const fmtAmt = new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-US', { style: 'currency', currency }).format(amount);
    this.toast.success(`${fmtAmt} deposited into ${user?.firstName}'s account`);
    this.closeDepositPanel();
  }

  // ── Columns ───────────────────────────────────────────────────────────────
  readonly userCols    = ['index', 'name', 'email', 'joined', 'manager', 'accounts', 'balance', 'actions'];
  readonly txnCols     = ['user', 'date', 'description', 'amount', 'type', 'status'];
  readonly managerCols = ['name', 'email', 'clients'];

  // ── Helpers ───────────────────────────────────────────────────────────────
  getManagerForUser(userId: string): User | undefined { return getManagerForUser(userId); }
  getAccountsByUserId(userId: string): Account[]      { return getAccountsByUserId(userId); }

  getUserBalance(userId: string): string {
    const accs = getAccountsByUserId(userId);
    if (!accs.length) return '—';
    const currency = accs[0].currency;
    const total    = accs.reduce((s, a) => s + a.balance, 0);
    return new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-US', {
      style: 'currency', currency,
    }).format(total);
  }

  fmtAmount(amount: number, currency: 'USD' | 'GBP'): string {
    return new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-US', {
      style: 'currency', currency,
    }).format(amount);
  }

  getManagedUsers(manager: User): User[] {
    return (manager.managedUserIds ?? []).map(id => MOCK_USERS.find(u => u.id === id)!).filter(Boolean);
  }

  onStatusChange(txnId: string, status: TransactionStatus): void {
    this.txnSvc.updateTransactionStatus(txnId, status);
  }

  statusOptions: TransactionStatus[] = ['completed', 'pending', 'failed'];

  roleColor(role: UserRole): string {
    if (role === 'admin') return 'admin';
    if (role === 'account_manager') return 'manager';
    return 'user';
  }

  clearFilters(): void {
    this.filterUserId.set('');
    this.filterStatus.set('');
  }

  // ── Policy Management ─────────────────────────────────────────────────────

  getUserName(userId: string): string {
    const u = MOCK_USERS.find(u => u.id === userId);
    return u ? `${u.firstName} ${u.lastName}` : 'Unknown';
  }

  openNewPolicyForm(): void {
    this.editingPolicyId.set(null);
    this.policyForm.reset({
      name: '',
      targetUserId: '',
      ruleType: 'block_all_outgoing',
      amountThreshold: null,
      denialMessage: '',
    });
    this.showPolicyForm.set(true);
  }

  editPolicy(policy: TransactionPolicy): void {
    this.editingPolicyId.set(policy.id);
    this.policyForm.patchValue({
      name:            policy.name,
      targetUserId:    policy.targetUserId ?? '',
      ruleType:        policy.ruleType,
      amountThreshold: policy.amountThreshold ?? null,
      denialMessage:   policy.denialMessage,
    });
    this.showPolicyForm.set(true);
  }

  cancelPolicyForm(): void {
    this.showPolicyForm.set(false);
    this.editingPolicyId.set(null);
    this.policyForm.reset();
  }

  savePolicy(): void {
    if (this.policyForm.invalid) return;
    const v = this.policyForm.value;
    const editId = this.editingPolicyId();

    if (editId) {
      this.policySvc.updatePolicy(editId, {
        name:            v.name!,
        targetUserId:    v.targetUserId || undefined,
        ruleType:        v.ruleType as PolicyRuleType,
        amountThreshold: v.ruleType === 'block_above_amount' ? (v.amountThreshold ?? undefined) : undefined,
        denialMessage:   v.denialMessage!,
      });
      this.toast.success('Policy updated successfully');
    } else {
      this.policySvc.addPolicy({
        id:              `pol-${Date.now()}`,
        name:            v.name!,
        enabled:         false,
        targetUserId:    v.targetUserId || undefined,
        ruleType:        v.ruleType as PolicyRuleType,
        amountThreshold: v.ruleType === 'block_above_amount' ? (v.amountThreshold ?? undefined) : undefined,
        denialMessage:   v.denialMessage!,
        createdBy:       this.auth.user()?.id ?? 'admin-001',
        createdAt:       new Date().toISOString(),
      });
      this.toast.success('Policy created — toggle it on to activate');
    }
    this.cancelPolicyForm();
  }

  togglePolicy(id: string): void {
    this.policySvc.togglePolicy(id);
    const p = this.policySvc.policies().find(p => p.id === id);
    if (p?.enabled) {
      this.toast.warning(`Policy "${p.name}" is now active`, 3500);
    } else if (p) {
      this.toast.info(`Policy "${p.name}" disabled`);
    }
  }

  deletePolicy(id: string): void {
    const p = this.policySvc.policies().find(p => p.id === id);
    this.policySvc.deletePolicy(id);
    this.toast.info(`Policy "${p?.name}" deleted`);
  }

  ruleTypeLabel(rt: PolicyRuleType): string {
    return rt === 'block_all_outgoing' ? 'Block All Outgoing' : 'Amount Limit';
  }

  ruleTypeIcon(rt: PolicyRuleType): string {
    return rt === 'block_all_outgoing' ? 'block' : 'money_off';
  }

  /** Reset all data back to seed data and clear localStorage. */
  resetDatabase(): void {
    this.storage.clearAll();
    this.txnSvc.resetToSeedData();
    this.accSvc.resetToSeedData();
    this.toast.success('Database reset to seed data. All changes cleared.', 4000);
  }
}
