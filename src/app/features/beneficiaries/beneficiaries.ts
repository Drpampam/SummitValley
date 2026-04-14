import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BeneficiaryService } from '../../core/services/beneficiary.service';
import { AccountService } from '../../core/services/account.service';
import { ToastService } from '../../core/services/toast.service';

type BenType = 'internal' | 'external';

@Component({
  selector: 'app-beneficiaries',
  standalone: true,
  imports: [
    CommonModule, DatePipe,
    ReactiveFormsModule,
    MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTooltipModule,
  ],
  templateUrl: './beneficiaries.html',
  styleUrl: './beneficiaries.scss',
})
export class BeneficiariesComponent {
  private benSvc = inject(BeneficiaryService);
  private accSvc = inject(AccountService);
  private toast  = inject(ToastService);
  private fb     = inject(FormBuilder);

  beneficiaries = this.benSvc.myBeneficiaries;
  accounts      = this.accSvc.accounts;

  showForm  = signal(false);
  benType   = signal<BenType>('external');

  readonly internalBens = computed(() => this.beneficiaries().filter(b => b.type === 'internal'));
  readonly externalBens = computed(() => this.beneficiaries().filter(b => b.type === 'external'));

  internalForm = this.fb.group({
    nickname:    ['', [Validators.required, Validators.maxLength(30)]],
    toAccountId: ['', Validators.required],
  });

  externalForm = this.fb.group({
    nickname:      ['', [Validators.required, Validators.maxLength(30)]],
    recipientName: ['', Validators.required],
    bankName:      ['', Validators.required],
    routingNumber: ['', [Validators.required, Validators.pattern(/^\d{9}$/)]],
    accountNumber: ['', [Validators.required, Validators.minLength(4)]],
  });

  openForm(type: BenType): void {
    this.benType.set(type);
    this.internalForm.reset();
    this.externalForm.reset();
    this.showForm.set(true);
  }

  closeForm(): void { this.showForm.set(false); }

  saveInternal(): void {
    if (this.internalForm.invalid) { this.internalForm.markAllAsTouched(); return; }
    const v = this.internalForm.value;
    this.benSvc.add({ nickname: v.nickname!, type: 'internal', toAccountId: v.toAccountId! });
    this.toast.success(`"${v.nickname}" saved as beneficiary.`);
    this.closeForm();
  }

  saveExternal(): void {
    if (this.externalForm.invalid) { this.externalForm.markAllAsTouched(); return; }
    const v = this.externalForm.value;
    const maskedAcct = '****' + v.accountNumber!.slice(-4);
    this.benSvc.add({
      nickname:      v.nickname!,
      type:          'external',
      recipientName: v.recipientName!,
      bankName:      v.bankName!,
      routingNumber: v.routingNumber!,
      accountNumber: maskedAcct,
    });
    this.toast.success(`"${v.nickname}" added as external beneficiary.`);
    this.closeForm();
  }

  remove(id: string, nickname: string): void {
    this.benSvc.remove(id);
    this.toast.info(`"${nickname}" removed from beneficiaries.`);
  }

  accountLabel(id: string): string {
    const a = this.accounts().find(a => a.id === id);
    return a ? `${a.type === 'checking' ? 'Checking' : 'Savings'} ${a.accountNumber}` : id;
  }

  initials(nickname: string): string {
    return nickname.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
}
