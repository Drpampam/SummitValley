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
import { EmailService } from '../../core/services/email.service';
import { StorageService } from '../../core/services/storage.service';
import { LocaleService } from '../../core/services/locale.service';
import { ToastService } from '../../core/services/toast.service';
import { User, UserRole } from '../../core/models/user.model';
import { Transaction, TransactionStatus, TransactionPolicy, PolicyRuleType } from '../../core/models/transaction.model';
import { Account } from '../../core/models/account.model';
import { MOCK_ACCOUNTS, MOCK_TRANSACTIONS, getManagerForUser } from '../../core/data/mock-data';

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
  private emailSvc = inject(EmailService);
  private storage  = inject(StorageService);
  private fb       = inject(FormBuilder);
  private toast    = inject(ToastService);

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

  // ── Edit User ─────────────────────────────────────────────────────────────
  showEditUserForm  = signal(false);
  editingUserTarget = signal<User | null>(null);

  editUserForm = this.fb.group({
    firstName:   ['', Validators.required],
    lastName:    ['', Validators.required],
    email:       ['', [Validators.required, Validators.email]],
    phone:       [''],
    address:     [''],
    city:        [''],
    state:       [''],
    zip:         [''],
    country:     ['US', Validators.required],
    role:        ['user' as UserRole, Validators.required],
    newPassword: [''],   // optional — blank = keep current
  });

  openEditUser(user: User): void {
    this.editingUserTarget.set(user);
    this.editUserForm.reset({
      firstName:   user.firstName,
      lastName:    user.lastName,
      email:       user.email,
      phone:       user.phone ?? '',
      address:     user.address ?? '',
      city:        user.city ?? '',
      state:       user.state ?? '',
      zip:         user.zip ?? '',
      country:     user.country,
      role:        user.role,
      newPassword: '',
    });
    this.showEditUserForm.set(true);
  }

  cancelEditUser(): void {
    this.showEditUserForm.set(false);
    this.editingUserTarget.set(null);
    this.editUserForm.reset();
  }

  submitEditUser(): void {
    if (this.editUserForm.invalid) return;
    const target = this.editingUserTarget();
    if (!target) return;
    const v = this.editUserForm.value;
    const newEmail = v.email!.toLowerCase().trim();
    const emailChanged = newEmail !== target.email;

    // Guard: email conflict (ignore if unchanged)
    if (emailChanged && this.auth.allUsersReactive().some(u => u.id !== target.id && u.email === newEmail)) {
      this.toast.error('Another user already has this email address.');
      return;
    }

    const locale = v.country === 'GB' ? 'en-GB' as const : 'en-US' as const;
    this.auth.updateUserById(target.id, {
      firstName: v.firstName!,
      lastName:  v.lastName!,
      email:     newEmail,
      phone:     v.phone ?? '',
      address:   v.address ?? '',
      city:      v.city ?? '',
      state:     v.state ?? '',
      zip:       v.zip ?? '',
      country:   v.country!,
      role:      v.role as UserRole,
      locale,
    });

    // Update credentials if email or password changed
    if (emailChanged || v.newPassword) {
      this.auth.updateCredentialsByEmail(
        target.email,
        emailChanged ? newEmail : undefined,
        v.newPassword || undefined,
      );
    }

    this.toast.success(`${v.firstName} ${v.lastName}'s profile updated`);
    this.cancelEditUser();
  }

  // ── Data ──────────────────────────────────────────────────────────────────
  readonly allUsers    = computed(() => this.auth.allUsersReactive().filter(u => u.role === 'user'));
  readonly allManagers = computed(() => this.auth.allUsersReactive().filter(u => u.role === 'account_manager'));
  readonly allAdmins   = computed(() => this.auth.allUsersReactive().filter(u => u.role === 'admin'));

  private _getUser(id: string): User | undefined {
    return this.auth.allUsersReactive().find(u => u.id === id);
  }

  readonly txnRows = computed<AdminTxnRow[]>(() => {
    const allTxns = this.txnSvc.allTransactions;
    return allTxns
      .map(t => {
        const acc  = this.accSvc.accounts().find(a => a.id === t.accountId)
                  ?? MOCK_ACCOUNTS.find(a => a.id === t.accountId);
        const user = this._getUser(acc?.userId ?? '');
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
        const acc = this.accSvc.accounts().find(a => a.id === t.accountId)
                 ?? MOCK_ACCOUNTS.find(a => a.id === t.accountId);
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
      totalUsers:     this.allUsers().length,
      totalAccounts:  this.accSvc.accounts().length,
      pending:        txns.filter(t => t.status === 'pending').length,
      failed:         txns.filter(t => t.status === 'failed').length,
      volume:         txns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0),
      activePolicies: this.policySvc.activePolicies().length,
    };
  });

  // ── Create User ───────────────────────────────────────────────────────────
  showCreateUserForm  = signal(false);
  createdUserResult   = signal<{ user: User; tempPassword: string } | null>(null);

  createUserForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName:  ['', Validators.required],
    email:     ['', [Validators.required, Validators.email]],
    role:      ['user' as UserRole, Validators.required],
    country:   ['US', Validators.required],
    phone:     [''],
  });

  openCreateUserForm(): void {
    this.createUserForm.reset({ role: 'user', country: 'US', firstName: '', lastName: '', email: '', phone: '' });
    this.createdUserResult.set(null);
    this.showCreateUserForm.set(true);
  }

  cancelCreateUser(): void {
    this.showCreateUserForm.set(false);
    this.createdUserResult.set(null);
  }

  submitCreateUser(): void {
    if (this.createUserForm.invalid) return;
    const v = this.createUserForm.value;
    const email = v.email!.toLowerCase().trim();

    // Guard: email already exists
    if (this.auth.allUsersReactive().some(u => u.email === email)) {
      this.toast.error('A user with this email already exists.');
      return;
    }

    const result = this.auth.createUser({
      firstName: v.firstName!,
      lastName:  v.lastName!,
      email,
      role:      v.role as UserRole,
      country:   v.country!,
      phone:     v.phone ?? undefined,
    });

    // Create default checking + savings accounts
    const now      = new Date().toISOString();
    const ts       = Date.now();
    const currency = result.user.country === 'GB' ? 'GBP' : 'USD';
    this.accSvc.addAccount({
      id: `acc-${ts}-1`, userId: result.user.id,
      type: 'checking',
      accountNumber: '****' + String(Math.floor(1000 + Math.random() * 9000)),
      balance: 0, availableBalance: 0, currency, createdAt: now,
    });
    this.accSvc.addAccount({
      id: `acc-${ts}-2`, userId: result.user.id,
      type: 'savings',
      accountNumber: '****' + String(Math.floor(1000 + Math.random() * 9000)),
      balance: 0, availableBalance: 0, currency, createdAt: now,
    });

    // Fire welcome email
    this.emailSvc.sendWelcomeEmail(result.user.email, result.user.firstName, result.tempPassword);

    this.createdUserResult.set(result);
    this.showCreateUserForm.set(false);
    this.toast.success(`${result.user.firstName} ${result.user.lastName} created successfully`);
  }

  copyTempPassword(): void {
    const result = this.createdUserResult();
    if (result) {
      navigator.clipboard.writeText(result.tempPassword).catch(() => {});
      this.toast.info('Temporary password copied to clipboard');
    }
  }

  dismissCreatedResult(): void { this.createdUserResult.set(null); }

  // ── Add Funds / Deposit ───────────────────────────────────────────────────
  depositUserId    = signal<string | null>(null);
  depositAccountId = signal<string>('');
  depositAmount    = signal<string>('');
  depositNote      = signal<string>('');

  openDepositPanel(userId: string): void {
    const accounts = this.getAccountsByUserId(userId);
    this.depositUserId.set(userId);
    this.depositAccountId.set(accounts[0]?.id ?? '');
    this.depositAmount.set('');
    this.depositNote.set('');
  }

  closeDepositPanel(): void { this.depositUserId.set(null); }

  getDepositUserName(): string {
    const u = this._getUser(this.depositUserId() ?? '');
    return u ? `${u.firstName} ${u.lastName}` : '';
  }

  getDepositCurrencySymbol(): string {
    const acc = this.accSvc.accounts().find(a => a.id === this.depositAccountId());
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
    const acc  = this.accSvc.accounts().find(a => a.id === accountId);
    const user = this._getUser(userId);
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
  getManagerForUser(userId: string): User | undefined {
    return this.auth.allUsersReactive().find(
      u => u.role === 'account_manager' && u.managedUserIds?.includes(userId)
    );
  }
  getAccountsByUserId(userId: string): Account[] {
    return this.accSvc.accounts().filter(a => a.userId === userId);
  }

  getUserBalance(userId: string): string {
    const accs = this.getAccountsByUserId(userId);
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
    return (manager.managedUserIds ?? [])
      .map(id => this._getUser(id)!)
      .filter(Boolean);
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
    const u = this._getUser(userId);
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
    this.auth.resetToSeedData();
    this.toast.success('Database reset to seed data. All changes cleared.', 4000);
  }
}
