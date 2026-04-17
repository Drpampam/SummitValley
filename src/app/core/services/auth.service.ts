import { Injectable, signal, computed, inject, effect, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, throwError, delay, tap } from 'rxjs';
import { User, LoginCredentials, RegisterData, AppLocale, UserRole } from '../models/user.model';
import { MOCK_CREDENTIALS, MOCK_USERS, getUserByEmail } from '../data/mock-data';
import { EmailService } from './email.service';

const STORAGE_KEY          = 'nb_user';
const LOCKOUT_KEY          = 'nb_lockout';
const DYNAMIC_USERS_KEY    = 'dynamic_users';
const DYNAMIC_CREDS_KEY    = 'dynamic_credentials';
const MAX_ATTEMPTS         = 5;
const LOCKOUT_MS           = 5 * 60 * 1000; // 5 minutes

interface LockoutRecord { attempts: number; lockedUntil: number | null; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private emailSvc = inject(EmailService);
  private _user = signal<User | null>(null);

  private _dynamicUsers:   WritableSignal<User[]>;
  private _dynamicCreds:   WritableSignal<Record<string, string>>;
  private _userOverrides:  WritableSignal<Record<string, Partial<User>>>;

  /** All users — MOCK seed (with overrides) + admin-created dynamic users. */
  readonly allUsersReactive = computed<User[]>(() => {
    const overrides = this._userOverrides();
    const mockWithOverrides = MOCK_USERS.map(u =>
      overrides[u.id] ? { ...u, ...overrides[u.id] } : u
    );
    return [...mockWithOverrides, ...this._dynamicUsers()];
  });

  readonly user            = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly isAdmin         = computed(() => this._user()?.role === 'admin');
  readonly isManager       = computed(() => this._user()?.role === 'account_manager');
  readonly isUser          = computed(() => this._user()?.role === 'user');

  constructor(private router: Router) {
    // Load dynamic users, credentials, and overrides from localStorage
    this._dynamicUsers  = signal<User[]>(this._loadJson(DYNAMIC_USERS_KEY, []));
    this._dynamicCreds  = signal<Record<string, string>>(this._loadJson(DYNAMIC_CREDS_KEY, {}));
    this._userOverrides = signal<Record<string, Partial<User>>>(this._loadJson('svb_user_overrides', {}));
    effect(() => { localStorage.setItem(DYNAMIC_USERS_KEY, JSON.stringify(this._dynamicUsers())); });
    effect(() => { localStorage.setItem(DYNAMIC_CREDS_KEY, JSON.stringify(this._dynamicCreds())); });
    effect(() => { localStorage.setItem('svb_user_overrides', JSON.stringify(this._userOverrides())); });

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

  private _loadJson<T>(key: string, fallback: T): T {
    try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; }
    catch { return fallback; }
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

    const found    = this.allUsersReactive().find(u => u.email === email);
    const expected = this._dynamicCreds()[email] ?? MOCK_CREDENTIALS[email];

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
    const user = this._user();
    if (user?.mustChangePassword) return '/change-password';
    const role = user?.role;
    if (role === 'admin') return '/admin';
    if (role === 'account_manager') return '/manager';
    return '/dashboard';
  }

  /** All users — MOCK seed + dynamic (admin-only view). */
  get allUsers(): User[] { return this.allUsersReactive(); }

  // ── Admin: create a new user with a generated temp password ─────────────────
  createUser(data: {
    firstName: string;
    lastName:  string;
    email:     string;
    role:      UserRole;
    country:   string;
    phone?:    string;
  }): { user: User; tempPassword: string } {
    const locale: AppLocale = data.country === 'GB' ? 'en-GB' : 'en-US';
    const tempPassword = this._generateTempPassword();
    const prefix = data.role === 'account_manager' ? 'mgr' : 'user';
    const user: User = {
      id:                 `${prefix}-${Date.now()}`,
      firstName:          data.firstName,
      lastName:           data.lastName,
      email:              data.email.toLowerCase().trim(),
      phone:              data.phone ?? '',
      address: '', city: '', state: '', zip: '',
      country:            data.country,
      locale,
      role:               data.role,
      mustChangePassword: true,
      createdAt:          new Date().toISOString(),
    };
    this._dynamicUsers.update(users => [...users, user]);
    this._dynamicCreds.update(creds => ({ ...creds, [user.email]: tempPassword }));
    return { user, tempPassword };
  }

  // ── Change password (called after first login or from profile) ───────────────
  changePassword(email: string, newPassword: string): void {
    const lc = email.toLowerCase().trim();
    // Update dynamic credential if present
    if (this._dynamicCreds()[lc] !== undefined) {
      this._dynamicCreds.update(creds => ({ ...creds, [lc]: newPassword }));
    }
    // Clear mustChangePassword on the dynamic user record
    this._dynamicUsers.update(users =>
      users.map(u => u.email === lc ? { ...u, mustChangePassword: false } : u)
    );
    // Update the active session
    const current = this._user();
    if (current && current.email === lc) {
      const updated = { ...current, mustChangePassword: false };
      this._user.set(updated);
      const store = localStorage.getItem(STORAGE_KEY) ? localStorage : sessionStorage;
      store.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  }

  // ── Admin: update any user's profile by ID ───────────────────────────────────
  updateUserById(id: string, updates: Partial<User>): void {
    const isDynamic = this._dynamicUsers().some(u => u.id === id);
    if (isDynamic) {
      this._dynamicUsers.update(users => users.map(u => u.id === id ? { ...u, ...updates } : u));
    } else {
      // Mock user — store delta as an override (persisted under svb_ prefix so DB reset clears it)
      this._userOverrides.update(ov => ({ ...ov, [id]: { ...(ov[id] ?? {}), ...updates } }));
    }
    // Keep active session in sync
    if (this._user()?.id === id) {
      const merged = { ...this._user()!, ...updates };
      this._user.set(merged);
      const store = localStorage.getItem(STORAGE_KEY) ? localStorage : sessionStorage;
      store.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
  }

  // ── Admin: update login credentials for any user ─────────────────────────────
  updateCredentialsByEmail(currentEmail: string, newEmail?: string, newPassword?: string): void {
    const lc = currentEmail.toLowerCase().trim();
    const ne = newEmail?.toLowerCase().trim();
    // Retrieve the current password (dynamic override takes precedence)
    const currentPwd = this._dynamicCreds()[lc] ?? MOCK_CREDENTIALS[lc] ?? '';

    if (ne && ne !== lc) {
      // Email changed — move credential entry to new email
      this._dynamicCreds.update(c => {
        const updated = { ...c };
        delete updated[lc];
        updated[ne] = newPassword ?? currentPwd;
        return updated;
      });
    } else if (newPassword) {
      // Password changed only
      this._dynamicCreds.update(c => ({ ...c, [lc]: newPassword }));
    }
  }

  // ── Admin: reset all dynamic data back to seed ────────────────────────────────
  resetToSeedData(): void {
    this._dynamicUsers.set([]);
    this._dynamicCreds.set({});
    this._userOverrides.set({});
    localStorage.removeItem('svb_user_overrides');
  }

  private _generateTempPassword(): string {
    const upper   = 'ABCDEFGHJKMNPQRSTUVWXYZ';
    const lower   = 'abcdefghjkmnpqrstuvwxyz';
    const digits  = '23456789';
    const special = '@#$!';
    const all     = upper + lower + digits + special;
    const parts: string[] = [
      upper[Math.floor(Math.random() * upper.length)],
      lower[Math.floor(Math.random() * lower.length)],
      digits[Math.floor(Math.random() * digits.length)],
      special[Math.floor(Math.random() * special.length)],
      ...Array.from({ length: 6 }, () => all[Math.floor(Math.random() * all.length)]),
    ];
    return parts.sort(() => Math.random() - 0.5).join('');
  }
}
