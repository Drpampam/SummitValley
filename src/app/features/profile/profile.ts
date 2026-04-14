import { Component, inject, OnInit, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ToastService } from '../../core/services/toast.service';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { LocaleService } from '../../core/services/locale.service';
import { AppLocale } from '../../core/models/user.model';
import { MOCK_CREDENTIALS } from '../../core/data/mock-data';

type ProfileTab = 'personal' | 'security' | 'notifications' | 'preferences';
interface TabDef { id: ProfileTab; label: string; icon: string; }

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule, DatePipe,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatSlideToggleModule, MatSnackBarModule, MatDividerModule,
    MatProgressSpinnerModule, MatTooltipModule, TranslateModule,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class ProfileComponent implements OnInit {
  auth          = inject(AuthService);
  localeService = inject(LocaleService);
  private fb    = inject(FormBuilder);
  private toast = inject(ToastService);

  @ViewChild('avatarInput') avatarInput!: ElementRef<HTMLInputElement>;

  activeTab     = signal<ProfileTab>('personal');
  saving        = signal(false);
  avatarUrl     = signal<string | null>(null);
  avatarLoading = signal(false);
  tfaEnabled    = signal(false);
  hideCurrentPw = signal(true);
  hideNewPw     = signal(true);
  hideConfirmPw = signal(true);

  readonly tabs: TabDef[] = [
    { id: 'personal',      label: 'Personal Info', icon: 'person'        },
    { id: 'security',      label: 'Security',      icon: 'lock'          },
    { id: 'notifications', label: 'Notifications', icon: 'notifications' },
    { id: 'preferences',   label: 'Preferences',   icon: 'tune'          },
  ];

  readonly locales = [
    { value: 'en-US' as AppLocale, flag: '🇺🇸', name: 'United States', currency: 'USD', format: 'MM/DD/YYYY' },
    { value: 'en-GB' as AppLocale, flag: '🇬🇧', name: 'United Kingdom', currency: 'GBP', format: 'DD/MM/YYYY' },
    { value: 'en-IE' as AppLocale, flag: '🇪🇺', name: 'Eurozone',       currency: 'EUR', format: 'DD/MM/YYYY' },
  ];

  readonly countries = [
    { value: 'US', label: 'United States' },
    { value: 'GB', label: 'United Kingdom' },
  ];

  readonly notifItems = [
    { key: 'emailNotifications', label: 'Email Notifications',  description: 'Account updates and alerts via email',             icon: 'email',        color: '#6366f1' },
    { key: 'smsNotifications',   label: 'SMS Alerts',           description: 'Critical alerts sent to your phone number',        icon: 'sms',          color: '#0891b2' },
    { key: 'transactionAlerts',  label: 'Transaction Alerts',   description: 'Real-time notification for every transaction',     icon: 'receipt_long', color: '#16a34a' },
    { key: 'marketingEmails',    label: 'Marketing Emails',     description: 'Offers, tips and product updates from Summit Valley Bank',   icon: 'campaign',     color: '#d97706' },
  ];

  personalForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName:  ['', Validators.required],
    email:     ['', [Validators.required, Validators.email]],
    phone:     [''],
    address:   [''],
    city:      [''],
    state:     [''],
    zip:       [''],
    country:   [''],
  });

  passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword:     ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  notificationForm = this.fb.group({
    emailNotifications: [true],
    smsNotifications:   [false],
    transactionAlerts:  [true],
    marketingEmails:    [false],
  });

  ngOnInit(): void {
    const user = this.auth.user();
    if (user) {
      this.personalForm.patchValue(user);
      if (user.avatarUrl) this.avatarUrl.set(user.avatarUrl);
    }
  }

  // ── Avatar ─────────────────────────────────────────────────────────────────

  triggerAvatarUpload(): void {
    this.avatarInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toast.error('Please select an image file (JPG, PNG, GIF, WebP)');
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.toast.error('Image must be smaller than 5 MB');
      input.value = '';
      return;
    }

    this.avatarLoading.set(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      this.avatarUrl.set(dataUrl);
      this.auth.updateUser({ avatarUrl: dataUrl });
      this.avatarLoading.set(false);
      this.toast.success('Profile photo updated!');
    };
    reader.onerror = () => {
      this.avatarLoading.set(false);
      this.toast.error('Failed to read image. Please try again.');
    };
    reader.readAsDataURL(file);
    input.value = '';   // reset so same file can be re-selected
  }

  removeAvatar(): void {
    this.avatarUrl.set(null);
    this.auth.updateUser({ avatarUrl: undefined });
    this.toast.info('Profile photo removed');
  }

  // ── Personal ───────────────────────────────────────────────────────────────

  savePersonal(): void {
    if (this.personalForm.invalid) return;
    this.saving.set(true);
    setTimeout(() => {
      this.auth.updateUser(this.personalForm.value as any);
      this.saving.set(false);
      this.toast.success('Profile updated successfully');
    }, 600);
  }

  cancelPersonal(): void {
    const user = this.auth.user();
    if (user) this.personalForm.patchValue(user);
    this.personalForm.markAsPristine();
    this.personalForm.markAsUntouched();
  }

  // ── Password ───────────────────────────────────────────────────────────────

  get passwordStrength(): { label: string; score: number; color: string; width: number } {
    const pw = this.passwordForm.get('newPassword')?.value ?? '';
    let score = 0;
    if (pw.length >= 8)              score++;
    if (/[A-Z]/.test(pw))            score++;
    if (/[0-9]/.test(pw))            score++;
    if (/[^A-Za-z0-9]/.test(pw))     score++;
    const levels = [
      { label: '',       score: 0, color: 'var(--nb-border)',   width: 0   },
      { label: 'Weak',   score: 1, color: '#ef4444',            width: 25  },
      { label: 'Fair',   score: 2, color: '#f59e0b',            width: 50  },
      { label: 'Good',   score: 3, color: '#16a34a',            width: 75  },
      { label: 'Strong', score: 4, color: '#15803d',            width: 100 },
    ];
    return levels[score];
  }

  get passwordMismatch(): boolean {
    const np = this.passwordForm.get('newPassword')?.value;
    const cp = this.passwordForm.get('confirmPassword')?.value;
    return !!cp && np !== cp;
  }

  savePassword(): void {
    if (this.passwordForm.invalid) return;
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;

    // Verify current password against mock credentials
    const userEmail   = this.auth.user()?.email ?? '';
    const expectedPw  = MOCK_CREDENTIALS[userEmail];
    if (expectedPw && currentPassword !== expectedPw) {
      this.toast.error('Current password is incorrect');
      return;
    }

    if (newPassword !== confirmPassword) {
      this.toast.error('New passwords do not match');
      return;
    }

    if (newPassword === currentPassword) {
      this.toast.warning('New password must be different from your current password');
      return;
    }

    this.saving.set(true);
    setTimeout(() => {
      this.saving.set(false);
      this.passwordForm.reset();
      this.toast.success('Password changed successfully');
    }, 800);
  }

  // ── 2FA ────────────────────────────────────────────────────────────────────

  toggleTfa(): void {
    const enabling = !this.tfaEnabled();
    this.tfaEnabled.set(enabling);
    if (enabling) {
      this.toast.success('Two-factor authentication enabled — backup codes sent to your email', 4500);
    } else {
      this.toast.info('Two-factor authentication has been disabled');
    }
  }

  // ── Notifications ──────────────────────────────────────────────────────────

  saveNotifications(): void {
    this.saving.set(true);
    setTimeout(() => {
      this.saving.set(false);
      this.toast.success('Notification preferences saved');
    }, 500);
  }

  // ── Preferences ────────────────────────────────────────────────────────────

  onLocaleChange(locale: AppLocale): void {
    this.localeService.setLocale(locale);
    this.auth.updateUser({ locale });
    const regionLabel = locale === 'en-GB' ? 'United Kingdom (GBP)' : locale === 'en-IE' ? 'Eurozone (EUR)' : 'United States (USD)';
    this.toast.success(`Region updated to ${regionLabel}`);
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  get userInitials(): string {
    const u = this.auth.user();
    if (!u) return 'U';
    return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
  }
}
