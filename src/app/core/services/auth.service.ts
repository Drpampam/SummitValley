import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, throwError, delay, tap } from 'rxjs';
import { User, LoginCredentials, RegisterData, AppLocale } from '../models/user.model';
import { MOCK_CREDENTIALS, MOCK_USERS, getUserByEmail } from '../data/mock-data';
import { EmailService } from './email.service';

const STORAGE_KEY     = 'nb_user';
const LOCKOUT_KEY     = 'nb_lockout';
const MAX_ATTEMPTS    = 5;
const LOCKOUT_MS      = 5 * 60 * 1000; // 5 minutes

interface LockoutRecord { attempts: number; lockedUntil: number | null; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private emailSvc = inject(EmailService);
  private _user = signal<User | null>(null);

  readonly user            = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly isAdmin         = computed(() => this._user()?.role === 'admin');
  readonly isManager       = computed(() => this._user()?.role === 'account_manager');
  readonly isUser          = computed(() => this._user()?.role === 'user');

  constructor(private router: Router) {
    // Migrate legacy key if present
    const legacy = localStorage.getItem('svb_user') ?? sessionStorage.getItem('svb_user');
    if (legacy) {
      localStorage.setItem(STORAGE_KEY, legacy);
      localStorage.removeItem('svb_user');
      sessionStorage.removeItem('svb_user');
    }
    const stored = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { this._user.set(JSON.parse(stored)); }
      catch {
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  // ── Rate limiting ────────────────────────────────────────────────────────────
  private getLockout(email: string): LockoutRecord {
    try {
      const raw = sessionStorage.getItem(`${LOCKOUT_KEY}_${btoa(email)}`);
      return raw ? JSON.parse(raw) : { attempts: 0, lockedUntil: null };
    } catch { return { attempts: 0, lockedUntil: null }; }
  }

  private setLockout(email: string, record: LockoutRecord): void {
    sessionStorage.setItem(`${LOCKOUT_KEY}_${btoa(email)}`, JSON.stringify(record));
  }

  private clearLockout(email: string): void {
    sessionStorage.removeItem(`${LOCKOUT_KEY}_${btoa(email)}`);
  }

  remainingLockoutSeconds(email: string): number {
    const record = this.getLockout(email);
    if (!record.lockedUntil) return 0;
    const remaining = Math.ceil((record.lockedUntil - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  }

  login(credentials: LoginCredentials): Observable<User> {
    const email = credentials.email.toLowerCase().trim();
    const record = this.getLockout(email);

    // Check lockout
    if (record.lockedUntil && Date.now() < record.lockedUntil) {
      const secs = Math.ceil((record.lockedUntil - Date.now()) / 1000);
      return throwError(() => new Error(`Account locked. Try again in ${secs}s.`)).pipe(delay(300));
    }

    const found    = getUserByEmail(email);
    const expected = MOCK_CREDENTIALS[email];

    if (!found || !expected || credentials.password !== expected) {
      const attempts = record.attempts + 1;
      const lockedUntil = attempts >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : null;
      this.setLockout(email, { attempts, lockedUntil });
      const remaining = MAX_ATTEMPTS - attempts;
      const msg = lockedUntil
        ? `Too many failed attempts. Account locked for 5 minutes.`
        : `Invalid email or password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`;
      return throwError(() => new Error(msg)).pipe(delay(800));
    }

    this.clearLockout(email);
    const store = credentials.rememberMe ? localStorage : sessionStorage;
    store.setItem(STORAGE_KEY, JSON.stringify(found));
    this._user.set(found);
    return of(found).pipe(
      delay(800),
      tap(user => {
        if (user.role === 'user') {
          this.emailSvc.sendLoginAlert(user.email, user.firstName);
        }
      })
    );
  }

  register(data: RegisterData): Observable<User> {
    const locale: AppLocale = data.country === 'GB' ? 'en-GB' : 'en-US';
    const newUser: User = {
      id: `user-${Date.now()}`,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      address: '', city: '', state: '', zip: '',
      country: data.country,
      locale,
      role: 'user',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    this._user.set(newUser);
    return of(newUser).pipe(delay(1000));
  }

  updateUser(updated: Partial<User>): void {
    const current = this._user();
    if (!current) return;
    const merged = { ...current, ...updated };
    this._user.set(merged);
    // Persist to whichever store originally held the session
    if (localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
  }

  logout(): void {
    this._user.set(null);
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    this.router.navigate(['/auth/login']);
  }

  /** Returns the home route for the currently authenticated user based on role. */
  homeRoute(): string {
    const role = this._user()?.role;
    if (role === 'admin') return '/admin';
    if (role === 'account_manager') return '/manager';
    return '/dashboard';
  }

  /** All users (admin-only view). */
  get allUsers(): User[] { return MOCK_USERS; }
}
