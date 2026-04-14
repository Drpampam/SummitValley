import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DisputeService } from '../../core/services/dispute.service';
import { TransactionService } from '../../core/services/transaction.service';
import { ToastService } from '../../core/services/toast.service';
import { LocaleService } from '../../core/services/locale.service';
import { DisputeReason } from '../../core/models/dispute.model';

type ActiveTab = 'open' | 'history' | 'new';

@Component({
  selector: 'app-disputes',
  standalone: true,
  imports: [
    CommonModule, DatePipe, TitleCasePipe, DecimalPipe,
    ReactiveFormsModule,
    MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatTooltipModule, MatProgressSpinnerModule,
  ],
  templateUrl: './disputes.html',
  styleUrl: './disputes.scss',
})
export class DisputesComponent {
  private disputeSvc = inject(DisputeService);
  private txnSvc     = inject(TransactionService);
  private toast      = inject(ToastService);
  private locale     = inject(LocaleService);
  private fb         = inject(FormBuilder);

  activeTab    = signal<ActiveTab>('open');
  submitting   = signal(false);

  disputes     = this.disputeSvc.myDisputes;
  transactions = this.txnSvc.transactions;
  currency     = this.locale.currencySymbol;

  readonly openDisputes    = computed(() => this.disputes().filter(d => ['submitted', 'under_review'].includes(d.status)));
  readonly historyDisputes = computed(() => this.disputes().filter(d => ['resolved', 'rejected'].includes(d.status)));

  readonly reasons: { value: DisputeReason; label: string }[] = [
    { value: 'unauthorized',     label: 'Unauthorized Transaction' },
    { value: 'duplicate',        label: 'Duplicate Charge' },
    { value: 'incorrect_amount', label: 'Incorrect Amount' },
    { value: 'merchant_error',   label: 'Merchant Error' },
    { value: 'not_received',     label: 'Goods / Services Not Received' },
    { value: 'other',            label: 'Other' },
  ];

  form = this.fb.group({
    transactionId: ['', Validators.required],
    reason:        ['', Validators.required],
    description:   ['', [Validators.required, Validators.minLength(20)]],
  });

  setTab(t: ActiveTab): void { this.activeTab.set(t); }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    const v = this.form.value;
    this.disputeSvc.submit(v.transactionId!, v.reason as DisputeReason, v.description!).subscribe({
      next: () => {
        this.submitting.set(false);
        this.form.reset();
        this.toast.success('Dispute submitted. A case number has been assigned.');
        this.setTab('open');
      },
    });
  }

  statusIcon(status: string): string {
    const m: Record<string, string> = {
      submitted:    'hourglass_empty',
      under_review: 'manage_search',
      resolved:     'check_circle',
      rejected:     'cancel',
    };
    return m[status] ?? 'help';
  }

  statusClass(status: string): string {
    if (status === 'submitted')    return 'status-pending';
    if (status === 'under_review') return 'status-review';
    if (status === 'resolved')     return 'status-resolved';
    if (status === 'rejected')     return 'status-rejected';
    return '';
  }

  reasonLabel(reason: string): string {
    return this.reasons.find(r => r.value === reason)?.label ?? reason;
  }

  txnLabel(id: string): string {
    const t = this.transactions().find(t => t.id === id);
    return t ? `${t.description} — ${this.currency()}${t.amount.toFixed(2)}` : id;
  }
}
