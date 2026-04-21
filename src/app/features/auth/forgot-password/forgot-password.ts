import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const pw  = control.get('newPassword')?.value;
  const cpw = control.get('confirmPassword')?.value;
  return pw && cpw && pw !== cpw ? { mismatch: true } : null;
}

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './forgot-password.html',
  styleUrl:    './forgot-password.scss',
})
export class ForgotPasswordComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);

  step        = signal<'email' | 'reset'>('email');
  loading     = signal(false);
  error       = signal('');
  sentEmail   = signal('');

  hideNew     = signal(true);
  hideConfirm = signal(true);
  hideTmp     = signal(true);

  emailForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  resetForm = this.fb.group({
    tempPassword:    ['', Validators.required],
    newPassword:     ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatch });

  onRequestReset(): void {
    if (this.emailForm.invalid) return;
    this.loading.set(true);
    this.error.set('');

    const email = this.emailForm.value.email!;
    this.auth.forgotPassword(email).subscribe({
      next: () => {
        this.loading.set(false);
        this.sentEmail.set(email);
        this.step.set('reset');
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.error.set(err.message);
      },
    });
  }

  onResetPassword(): void {
    if (this.resetForm.invalid) return;
    this.loading.set(true);
    this.error.set('');

    const { tempPassword, newPassword } = this.resetForm.value;
    this.auth.resetPassword(this.sentEmail(), tempPassword!, newPassword!).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate([this.auth.homeRoute()]);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.error.set(err.message);
      },
    });
  }
}
