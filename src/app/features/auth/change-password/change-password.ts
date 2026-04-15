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
  selector: 'app-change-password',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './change-password.html',
  styleUrl:    './change-password.scss',
})
export class ChangePasswordComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);

  readonly user        = this.auth.user;
  readonly isForced    = () => this.user()?.mustChangePassword === true;

  loading     = signal(false);
  error       = signal('');
  hideNew     = signal(true);
  hideConfirm = signal(true);

  form = this.fb.group({
    newPassword:     ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatch });

  onSubmit(): void {
    if (this.form.invalid) return;
    const { newPassword } = this.form.value;
    const email = this.user()?.email;
    if (!email || !newPassword) return;

    this.loading.set(true);
    this.error.set('');

    // Simulate async for UX consistency
    setTimeout(() => {
      this.auth.changePassword(email, newPassword);
      this.loading.set(false);
      this.router.navigate([this.auth.homeRoute()]);
    }, 600);
  }
}
