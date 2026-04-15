import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';

interface DemoAccount { label: string; email: string; password: string; icon: string; badge: string; }

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatCheckboxModule,
    MatProgressSpinnerModule, TranslateModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private fb    = inject(FormBuilder);
  private auth  = inject(AuthService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  loading         = signal(false);
  error           = signal('');
  hidePassword    = signal(true);
  sessionExpired  = signal(false);

  constructor() {
    this.route.queryParamMap.subscribe(params => {
      this.sessionExpired.set(params.get('reason') === 'session_expired');
    });
  }

  readonly demoAccounts: DemoAccount[] = [
    { label: 'John Ziland (Gmail)',  email: 'johnziland@gmail.com',    password: 'Ziland@1234',  icon: 'person',               badge: 'Customer'  },
    { label: 'John Ziland (Yahoo)',  email: 'johnziland@yahoo.com',    password: 'Ziland@4321',  icon: 'person',               badge: 'Customer'  },
    { label: 'John Omotoye',         email: 'omotoyejohn2@gmail.com',  password: 'Omotoye@123',  icon: 'person',               badge: 'Customer'  },
    { label: 'Manager',              email: 'john.omotoye@yahoo.com',  password: 'Manager@123',  icon: 'badge',                badge: 'Manager'   },
    { label: 'Admin',                email: 'johnomotoye@gmail.com',   password: 'Admin@1234',   icon: 'admin_panel_settings', badge: 'Admin'     },
  ];

  form = this.fb.group({
    email:      ['', [Validators.required, Validators.email]],
    password:   ['', [Validators.required, Validators.minLength(1)]],
    rememberMe: [false],
  });

  fillDemo(account: DemoAccount): void {
    this.form.patchValue({ email: account.email, password: account.password });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');

    const { email, password, rememberMe } = this.form.value;
    this.auth.login({ email: email!, password: password!, rememberMe: rememberMe! }).subscribe({
      next: (user: User) => {
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
