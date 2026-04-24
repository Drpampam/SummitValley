import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ToastService } from '../../core/services/toast.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AccountService } from '../../core/services/account.service';
import { TransactionService } from '../../core/services/transaction.service';
import { PolicyService } from '../../core/services/policy.service';
import { LocaleService } from '../../core/services/locale.service';
import { AuthService } from '../../core/services/auth.service';
import { EmailService } from '../../core/services/email.service';
import { Account } from '../../core/models/account.model';
import { TransferRequest } from '../../core/models/transaction.model';

type TransferTab = 'internal' | 'external';

export interface ProgressStep {
  id: number;
  label: string;
  icon: string;
  message: string;
}

@Component({
  selector: 'app-transfers',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule,
  ],
  templateUrl: './transfers.html',
  styleUrl: './transfers.scss',
})
export class TransfersComponent implements OnInit, OnDestroy {
  private fb                 = inject(FormBuilder);
  private accountService     = inject(AccountService);
  private transactionService = inject(TransactionService);
  private policySvc          = inject(PolicyService);
  localeService              = inject(LocaleService);
  private toast              = inject(ToastService);
  private translate          = inject(TranslateService);
  private auth               = inject(AuthService);
  private emailSvc           = inject(EmailService);

  accounts      = signal<Account[]>([]);
  loading       = signal(false);
  activeTab     = signal<TransferTab>('internal');
  /** 0=idle  1-4=processing steps  -1=declined */
  transferStep  = signal<number>(0);
  lastAmount    = signal<number>(0);
  lastRecipient = signal<string>('');
  denialMsg     = signal<string>('');
  today         = new Date();

  // ── OTP state ──────────────────────────────────────────────────────────────
  otpState        = signal<'idle' | 'sending' | 'pending'>('idle');
  otpInput        = signal('');
  otpError        = signal('');
  otpAttempts     = signal(0);
  otpSecondsLeft  = signal(300);

  otpCodeSet      = signal(false);   // true while a valid code is active

  private _otpCode            = '';
  private _otpExpiry          = 0;
  private _otpTimer?: ReturnType<typeof setInterval>;
  private _pendingRequest: TransferRequest | null = null;
  private _pendingType: 'internal' | 'external' | null = null;

  readonly otpTimerDisplay = computed(() => {
    const s = this.otpSecondsLeft();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  });

  readonly maskedEmail = computed(() => {
    const email = this.auth.user()?.email ?? '';
    const [user, domain] = email.split('@');
    if (!domain) return email;
    const visible = user.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(1, user.length - 2))}@${domain}`;
  });

  // ── Progress ───────────────────────────────────────────────────────────────
  readonly progressSteps: ProgressStep[] = [
    { id: 1, label: 'Validating',  icon: 'security',    message: 'Verifying your account details and security checks…' },
    { id: 2, label: 'Processing',  icon: 'autorenew',   message: 'Initiating the transfer through the payment network…' },
    { id: 3, label: 'Confirming',  icon: 'fact_check',  message: 'Finalising and recording your transaction…'           },
    { id: 4, label: 'Complete',    icon: 'check_circle',message: 'Your transfer has been completed successfully!'        },
  ];

  readonly trackFillPercent = computed(() =>
    Math.max(0, (this.transferStep() - 1) / (this.progressSteps.length - 1) * 100)
  );

  readonly currentMessage = computed(() =>
    this.progressSteps.find(s => s.id === this.transferStep())?.message ?? ''
  );

  // ── Forms ──────────────────────────────────────────────────────────────────
  internalForm = this.fb.group({
    fromAccount: ['', Validators.required],
    toAccount:   ['', Validators.required],
    amount:      [null as number | null, [Validators.required, Validators.min(0.01)]],
    date:        [new Date(), Validators.required],
    note:        [''],
  });

  externalForm = this.fb.group({
    fromAccount:   ['', Validators.required],
    recipientName: ['', Validators.required],
    routingNumber: ['', [Validators.required, Validators.minLength(6)]],
    accountNumber: ['', [Validators.required, Validators.minLength(8)]],
    amount:        [null as number | null, [Validators.required, Validators.min(0.01)]],
    date:          [new Date(), Validators.required],
    note:          [''],
  });

  ngOnInit(): void {
    this.accountService.getAccounts().subscribe((accounts) => {
      this.accounts.set(accounts);
      if (accounts.length > 0) {
        this.internalForm.patchValue({ fromAccount: accounts[0].id });
        this.externalForm.patchValue({ fromAccount: accounts[0].id });
      }
      if (accounts.length > 1) {
        this.internalForm.patchValue({ toAccount: accounts[1].id });
      }
    });
  }

  ngOnDestroy(): void {
    this._clearOtpTimer();
  }

  // ── Form helpers ───────────────────────────────────────────────────────────
  getAccountLabel(account: Account): string {
    const type = this.localeService.isUK()
      ? (account.type === 'checking' ? 'Current' : 'Savings')
      : (account.type === 'checking' ? 'Checking' : 'Savings');
    return `${type} ${account.accountNumber} · ${this.localeService.formatCurrency(account.balance)}`;
  }

  fmt(amount: number | null | undefined): string {
    return this.localeService.formatCurrency(amount ?? 0);
  }

  // ── Submit — build request then gate on OTP ────────────────────────────────
  submitInternal(): void {
    if (this.internalForm.invalid) return;
    const { fromAccount, toAccount, amount, date, note } = this.internalForm.value;
    if (fromAccount === toAccount) {
      this.toast.error('Source and destination accounts cannot be the same.');
      return;
    }
    this.lastAmount.set(amount ?? 0);
    this.lastRecipient.set('');

    this._requestOtp(
      { fromAccountId: fromAccount!, toAccountId: toAccount!, amount: amount!,
        date: (date as Date).toISOString(), note: note ?? undefined, isInternal: true },
      'internal',
    );
  }

  submitExternal(): void {
    if (this.externalForm.invalid) return;
    const { fromAccount, recipientName, routingNumber, accountNumber, amount, date, note } = this.externalForm.value;
    this.lastAmount.set(amount ?? 0);
    this.lastRecipient.set(recipientName ?? '');

    this._requestOtp(
      { fromAccountId: fromAccount!, recipientName: recipientName!,
        routingNumber: routingNumber!, accountNumber: accountNumber!,
        amount: amount!, date: (date as Date).toISOString(),
        note: note ?? undefined, isInternal: false },
      'external',
    );
  }

  // ── OTP lifecycle ──────────────────────────────────────────────────────────
  private _requestOtp(request: TransferRequest, type: 'internal' | 'external'): void {
    this._pendingRequest = request;
    this._pendingType    = type;

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this._otpCode   = code;
    this._otpExpiry = Date.now() + 5 * 60 * 1000;
    this.otpCodeSet.set(true);

    this.otpState.set('sending');
    this.otpInput.set('');
    this.otpError.set('');
    this.otpAttempts.set(0);
    this.otpSecondsLeft.set(300);

    const user     = this.auth.user();
    const currency = this.accounts().find(a => a.id === request.fromAccountId)?.currency ?? 'USD';
    const fmtAmt   = new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-US',
      { style: 'currency', currency }).format(request.amount);

    if (user) {
      this.emailSvc.sendTransferOTP(user.email, user.firstName, code, {
        amount:    fmtAmt,
        recipient: request.isInternal ? 'your account' : (request.recipientName ?? 'recipient'),
      });
    }

    this.otpState.set('pending');
    this._startOtpTimer();
  }

  private _startOtpTimer(): void {
    this._clearOtpTimer();
    this._otpTimer = setInterval(() => {
      const left = Math.ceil((this._otpExpiry - Date.now()) / 1000);
      this.otpSecondsLeft.set(Math.max(0, left));
      if (left <= 0) this._clearOtpTimer();
    }, 1000);
  }

  private _clearOtpTimer(): void {
    if (this._otpTimer) { clearInterval(this._otpTimer); this._otpTimer = undefined; }
  }

  verifyOtp(): void {
    const entered = this.otpInput().trim();

    if (this.otpSecondsLeft() <= 0) {
      this.otpError.set('Verification code has expired. Please request a new one.');
      return;
    }

    if (entered !== this._otpCode) {
      const attempts = this.otpAttempts() + 1;
      this.otpAttempts.set(attempts);
      if (attempts >= 3) {
        this._otpCode = '';
        this.otpCodeSet.set(false);
        this.otpError.set('Too many incorrect attempts. Please request a new code.');
      } else {
        const left = 3 - attempts;
        this.otpError.set(`Incorrect code. ${left} attempt${left === 1 ? '' : 's'} remaining.`);
      }
      return;
    }

    this._clearOtpTimer();
    this._proceedWithTransfer();
  }

  resendOtp(): void {
    if (!this._pendingRequest) return;
    this._requestOtp(this._pendingRequest, this._pendingType!);
    this.toast.info('A new verification code has been sent to your email.');
  }

  cancelOtp(): void {
    this._clearOtpTimer();
    this.otpState.set('idle');
    this._otpCode        = '';
    this.otpCodeSet.set(false);
    this._pendingRequest = null;
    this._pendingType    = null;
    this.otpInput.set('');
    this.otpError.set('');
  }

  onOtpInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6);
    this.otpInput.set(raw);
    this.otpError.set('');
    if (raw.length === 6) this.verifyOtp();
  }

  // ── Execute the transfer after OTP passes ──────────────────────────────────
  private _proceedWithTransfer(): void {
    const request = this._pendingRequest!;
    const type    = this._pendingType!;

    this.otpState.set('idle');
    this._otpCode        = '';
    this.otpCodeSet.set(false);
    this._pendingRequest = null;
    this._pendingType    = null;

    const sourceAccount = this.accounts().find(a => a.id === request.fromAccountId);
    if (request.amount > (sourceAccount?.availableBalance ?? 0)) {
      this._runDeclined('Insufficient funds. Please check your available balance and try again.');
      this.transactionService.submitTransfer(request).subscribe();
      return;
    }

    const check = this.policySvc.evaluateTransfer(request);
    if (!check.allowed) {
      this._runDeclined(check.denialMessage ?? 'This transaction has been declined by your account policy.');
    } else {
      this._runProgress();
    }

    this.transactionService.submitTransfer(request).subscribe(() => {
      if (type === 'internal') {
        this.internalForm.patchValue({ amount: null, note: '', date: new Date() });
      } else {
        this.externalForm.patchValue({ recipientName: '', routingNumber: '', accountNumber: '', amount: null, note: '' });
      }
    });
  }

  // ── Progress animation helpers ─────────────────────────────────────────────
  private _runProgress(): void {
    this.loading.set(true);
    this.transferStep.set(1);
    setTimeout(() => this.transferStep.set(2),  750);
    setTimeout(() => this.transferStep.set(3), 1550);
    setTimeout(() => {
      this.transferStep.set(4);
      this.loading.set(false);
    }, 2400);
  }

  private _runDeclined(message: string): void {
    this.loading.set(true);
    this.denialMsg.set(message);
    this.transferStep.set(1);
    setTimeout(() => {
      this.transferStep.set(-1);
      this.loading.set(false);
    }, 1000);
  }

  resetTransfer(): void {
    this.transferStep.set(0);
    this.lastAmount.set(0);
    this.lastRecipient.set('');
    this.denialMsg.set('');
  }
}
