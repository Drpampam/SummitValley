import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BillPayService } from '../../core/services/bill-pay.service';
import { AccountService } from '../../core/services/account.service';
import { ToastService } from '../../core/services/toast.service';
import { LocaleService } from '../../core/services/locale.service';
import { Biller, BillPayment } from '../../core/models/bill-pay.model';

type ActiveTab = 'billers' | 'pay' | 'history';

@Component({
  selector: 'app-bill-pay',
  standalone: true,
  imports: [
    CommonModule, DatePipe,
    ReactiveFormsModule,
    MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatTooltipModule, MatProgressSpinnerModule,
  ],
  templateUrl: './bill-pay.html',
  styleUrl: './bill-pay.scss',
})
export class BillPayComponent implements OnInit {
  private billPaySvc = inject(BillPayService);
  private accSvc     = inject(AccountService);
  private toast      = inject(ToastService);
  private locale     = inject(LocaleService);
  private fb         = inject(FormBuilder);

  activeTab      = signal<ActiveTab>('billers');
  selectedBiller = signal<Biller | null>(null);
  submitting     = signal(false);

  billers   = this.billPaySvc.billers;
  scheduled = this.billPaySvc.scheduled;
  history   = this.billPaySvc.history;
  accounts  = this.accSvc.accounts;
  currency  = this.locale.currencySymbol;

  form = this.fb.group({
    billerId:      ['', Validators.required],
    fromAccountId: ['', Validators.required],
    amount:        [null as number | null, [Validators.required, Validators.min(0.01)]],
    scheduledDate: [new Date().toISOString().split('T')[0], Validators.required],
    memo:          [''],
  });

  ngOnInit(): void {
    const accs = this.accounts();
    if (accs.length) this.form.patchValue({ fromAccountId: accs[0].id });
  }

  setTab(tab: ActiveTab): void { this.activeTab.set(tab); }

  payNow(biller: Biller): void {
    this.selectedBiller.set(biller);
    this.form.patchValue({
      billerId: biller.id,
      amount:   biller.defaultAmount ?? null,
    });
    this.activeTab.set('pay');
  }

  onBillerChange(billerId: string): void {
    const b = this.billers().find(b => b.id === billerId);
    if (b) {
      this.selectedBiller.set(b);
      this.form.patchValue({ amount: b.defaultAmount ?? null });
    }
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    const v = this.form.value;
    const biller = this.billers().find(b => b.id === v.billerId!);
    this.billPaySvc.schedulePayment({
      billerId:      v.billerId!,
      billerName:    biller?.name ?? '',
      fromAccountId: v.fromAccountId!,
      amount:        v.amount!,
      scheduledDate: new Date(v.scheduledDate!).toISOString(),
      memo:          v.memo ?? undefined,
      status:        'scheduled',
    }).subscribe({
      next: (payment) => {
        setTimeout(() => {
          this.billPaySvc.completePayment(payment.id);
          this.submitting.set(false);
          this.form.reset({ fromAccountId: this.accounts()[0]?.id, scheduledDate: new Date().toISOString().split('T')[0] });
          this.selectedBiller.set(null);
          this.toast.success(`Payment of ${this.currency()}${v.amount?.toFixed(2)} to ${biller?.name} confirmed!`);
          this.activeTab.set('history');
        }, 1200);
      },
    });
  }

  toggleAutopay(billerId: string, e: Event): void {
    e.stopPropagation();
    this.billPaySvc.toggleAutopay(billerId);
  }

  cancelPayment(id: string): void {
    this.billPaySvc.cancelPayment(id);
    this.toast.info('Payment cancelled.');
  }

  billerIcon(category: string): string {
    const map: Record<string, string> = {
      utilities: 'bolt', insurance: 'shield', subscription: 'subscriptions',
      rent: 'home', credit_card: 'credit_card', phone: 'phone_iphone', internet: 'wifi', other: 'receipt',
    };
    return map[category] ?? 'receipt';
  }

  statusClass(status: string): string {
    if (status === 'paid')      return 'status-completed';
    if (status === 'scheduled') return 'status-pending';
    if (status === 'failed')    return 'status-failed';
    if (status === 'cancelled') return 'status-cancelled';
    return '';
  }

  accountLabel(id: string): string {
    const a = this.accounts().find(a => a.id === id);
    return a ? `${a.type === 'checking' ? 'Checking' : 'Savings'} ${a.accountNumber}` : id;
  }
}
