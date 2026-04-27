import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { UpperCasePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/services/auth.service';
import { EmailService } from '../../core/services/email.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    ReactiveFormsModule, UpperCasePipe,
    MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule,
  ],
  templateUrl: './contact.html',
  styleUrl:    './contact.scss',
})
export class ContactComponent {
  private fb      = inject(FormBuilder);
  private auth    = inject(AuthService);
  private emailSvc = inject(EmailService);
  private toast   = inject(ToastService);

  submitted = signal(false);
  loading   = signal(false);

  readonly categories = [
    { value: 'account_issue',    label: 'Account Issue' },
    { value: 'transfer_problem', label: 'Transfer Problem' },
    { value: 'card_issue',       label: 'Card Issue' },
    { value: 'billing',          label: 'Billing Question' },
    { value: 'technical',        label: 'Technical Support' },
    { value: 'general',          label: 'General Inquiry' },
    { value: 'other',            label: 'Other' },
  ];

  form = this.fb.group({
    category: ['', Validators.required],
    subject:  ['', [Validators.required, Validators.minLength(5), Validators.maxLength(120)]],
    priority: ['normal'],
    message:  ['', [Validators.required, Validators.minLength(20), Validators.maxLength(2000)]],
  });

  get messageLen(): number { return this.form.get('message')?.value?.length ?? 0; }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);

    const user = this.auth.user()!;
    const { category, subject, priority, message } = this.form.value;
    const catLabel = this.categories.find(c => c.value === category)?.label ?? category ?? '';

    this.emailSvc.sendContactRequest(user.email, `${user.firstName} ${user.lastName}`, {
      category:    catLabel,
      subject:     subject!,
      priority:    priority ?? 'normal',
      message:     message!,
    });

    setTimeout(() => {
      this.loading.set(false);
      this.submitted.set(true);
    }, 900);
  }

  reset(): void {
    this.form.reset({ priority: 'normal' });
    this.submitted.set(false);
  }
}
