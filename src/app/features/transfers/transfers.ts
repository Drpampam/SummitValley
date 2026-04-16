import { Component, inject, OnInit, signal, computed } from '@angular/core';
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
import { Account } from '../../core/models/account.model';

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
export class TransfersComponent implements OnInit {
  private fb                 = inject(FormBuilder);
  private accountService     = inject(AccountService);
  private transactionService = inject(TransactionService);
  private policySvc          = inject(PolicyService);
  localeService              = inject(LocaleService);
  private toast              = inject(ToastService);
  private translate          = inject(TranslateService);

  accounts      = signal<Account[]>([]);
  loading       = signal(false);
  activeTab     = signal<TransferTab>('internal');
  /**
   * 0=idle  1-4=processing steps  -1=declined
   */
  transferStep  = signal<number>(0);
  lastAmount    = signal<number>(0);
  lastRecipient = signal<string>('');
  denialMsg     = signal<string>('');
  today         = new Date();

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

  getAccountLabel(account: Account): string {
    const type = this.localeService.isUK()
      ? (account.type === 'checking' ? 'Current' : 'Savings')
      : (account.type === 'checking' ? 'Checking' : 'Savings');
    return `${type} ${account.accountNumber} · ${this.localeService.formatCurrency(account.balance)}`;
  }

  fmt(amount: number | null | undefined): string {
    return this.localeService.formatCurrency(amount ?? 0);
  }

  submitInternal(): void {
    if (this.internalForm.invalid) return;
    const { fromAccount, toAccount, amount, date, note } = this.internalForm.value;
    if (fromAccount === toAccount) {
      this.toast.error('Source and destination accounts cannot be the same.');
      return;
    }

    this.lastAmount.set(amount ?? 0);
    this.lastRecipient.set('');

    const sourceAccount = this.accounts().find(a => a.id === fromAccount);
    if ((amount ?? 0) > (sourceAccount?.availableBalance ?? 0)) {
      this._runDeclined('Insufficient funds. Please check your available balance and try again.');
      this.transactionService.submitTransfer({
        fromAccountId: fromAccount!, toAccountId: toAccount!,
        amount: amount!, date: (date as Date).toISOString(),
        note: note ?? undefined, isInternal: true,
      }).subscribe();
      return;
    }

    const check = this.policySvc.evaluateTransfer({
      fromAccountId: fromAccount!, toAccountId: toAccount!,
      amount: amount!, date: (date as Date).toISOString(), isInternal: true,
    });

    if (!check.allowed) {
      this._runDeclined(check.denialMessage ?? 'This transaction has been declined by your account policy.');
    } else {
      this._runProgress();
    }

    this.transactionService.submitTransfer({
      fromAccountId: fromAccount!, toAccountId: toAccount!,
      amount: amount!, date: (date as Date).toISOString(),
      note: note ?? undefined, isInternal: true,
    }).subscribe(() => {
      this.internalForm.patchValue({ amount: null, note: '', date: new Date() });
    });
  }

  submitExternal(): void {
    if (this.externalForm.invalid) return;
    const { fromAccount, recipientName, routingNumber, accountNumber, amount, date, note } = this.externalForm.value;

    this.lastAmount.set(amount ?? 0);
    this.lastRecipient.set(recipientName ?? '');

    const sourceAccount = this.accounts().find(a => a.id === fromAccount);
    if ((amount ?? 0) > (sourceAccount?.availableBalance ?? 0)) {
      this._runDeclined('Insufficient funds. Please check your available balance and try again.');
      this.transactionService.submitTransfer({
        fromAccountId: fromAccount!, recipientName: recipientName!,
        routingNumber: routingNumber!, accountNumber: accountNumber!,
        amount: amount!, date: (date as Date).toISOString(),
        note: note ?? undefined, isInternal: false,
      }).subscribe();
      return;
    }

    const check = this.policySvc.evaluateTransfer({
      fromAccountId: fromAccount!, recipientName: recipientName!,
      routingNumber: routingNumber!, accountNumber: accountNumber!,
      amount: amount!, date: (date as Date).toISOString(), isInternal: false,
    });

    if (!check.allowed) {
      this._runDeclined(check.denialMessage ?? 'This transaction has been declined by your account policy.');
    } else {
      this._runProgress();
    }

    this.transactionService.submitTransfer({
      fromAccountId: fromAccount!, recipientName: recipientName!,
      routingNumber: routingNumber!, accountNumber: accountNumber!,
      amount: amount!, date: (date as Date).toISOString(),
      note: note ?? undefined, isInternal: false,
    }).subscribe(() => {
      this.externalForm.patchValue({ recipientName: '', routingNumber: '', accountNumber: '', amount: null, note: '' });
    });
  }

  /** Normal 4-step progress animation. */
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

  /** Decline animation: show step 1 briefly then switch to -1 (declined). */
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
