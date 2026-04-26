import { Injectable, signal, computed, inject, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, throwError, delay, tap } from 'rxjs';
import { User, LoginCredentials, RegisterData, AppLocale, UserRole } from '../models/user.model';
import { MOCK_CREDENTIALS, MOCK_USERS } from '../data/mock-data';
import { EmailService } from './email.service';
import { SupabaseService } from './supabase.service';

const SESSION_KEY  = 'nb_user';
const LOCKOUT_KEY  = 'nb_lockout';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 5 * 60 * 1000;

interface LockoutRecord { attempts: number; lockedUntil: number | null; }

// DB row → TypeScript model
function rowToUser(r: Record<string, unknown>): User {
  return {
    id:                  r['id'] as string,
    firstName:           r['first_name'] as string,
    lastName:            r['last_name'] as string,
    email:               r['email'] as string,
    phone:               (r['phone'] as string) ?? '',
    address:             (r['address'] as string) ?? '',
    city:                (r['city'] as string) ?? '',
    state:               (r['state'] as string) ?? '',
    zip:                 (r['zip'] as string) ?? '',
    country:             (r['country'] as string) ?? 'US',
    locale:              (r['locale'] as AppLocale) ?? 'en-US',
    role:                r['role'] as UserRole,
    mustChangePassword:  (r['must_change_password'] as boolean) ?? false,
    managedUserIds:      (r['managed_user_ids'] as string[]) ?? [],
    avatarUrl:           r['avatar_url'] as string | undefined,
    createdAt:           r['created_at'] as string,
  };
}

function userToRow(u: User): Record<string, unknown> {
  return {
    id:                   u.id,
    first_name:           u.firstName,
    last_name:            u.lastName,
    email:                u.email,
    phone:                u.phone ?? '',
    address:              u.address ?? '',
    city:                 u.city ?? '',
    state:                u.state ?? '',
    zip:                  u.zip ?? '',
    country:              u.country ?? 'US',
    locale:               u.locale ?? 'en-US',
    role:                 u.role,
    must_change_password: u.mustChangePassword ?? false,
    managed_user_ids:     u.managedUserIds ?? [],
    avatar_url:           u.avatarUrl ?? null,
    created_at:           u.createdAt,
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private emailSvc = inject(EmailService);
  private sb       = inject(SupabaseService);

  private _user: WritableSignal<User | null>    = signal(null);
  private _allUsers: WritableSignal<User[]>     = signal([]);
  private _allCreds: WritableSignal<Record<string, string>> = signal({});

  readonly user            = this._user.asReadonly();
  readonly allUsersReactive = computed(() => this._allUsers());
  readonly isAuthenticated    = computed(() => this._user() !== null);
  readonly isAdmin            = computed(() => this._user()?.role === 'admin');
  readonly isManager          = computed(() => this._user()?.role === 'account_manager');
  readonly isCustomerService  = computed(() => this._user()?.role === 'customer_service');
  readonly isUser             = computed(() => this._user()?.role === 'user');

  constructor(private router: Router) {
    // Restore session from storage
    const stored = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      try { this._user.set(JSON.parse(stored)); } catch { /* ignore */ }
    }
    // Load users and credentials from Supabase
    this._loadFromSupabase();
  }

  private async _loadFromSupabase(): Promise<void> {
    if (!this.sb.isConfigured) return;

    try {
      const db = this.sb.client;
      const [{ data: users, error: ue }, { data: creds, error: ce }] = await Promise.all([
        db.from('users').select('*'),
        db.from('credentials').select('*'),
      ]);

      if (ue || ce) {
        console.error('[AuthService] Supabase load error:', ue ?? ce);
        return;
      }

      if (!users || users.length === 0) {
        await this._seedUsers();
        return;
      }

      const loaded = users.map(rowToUser);
      this._allUsers.set(loaded);

      const credMap: Record<string, string> = {};
      (creds ?? []).forEach((r: Record<string, unknown>) => {
        credMap[r['email'] as string] = r['password'] as string;
      });
      this._allCreds.set(credMap);

      // Insert any seed users that were added after the initial seed ran
      await this._syncMissingUsers(loaded, credMap);
    } catch (err) {
      console.error('[AuthService] Supabase unreachable:', err);
    }
  }

  private async _seedUsers(): Promise<void> {
    if (!this.sb.isConfigured) return;
    const db = this.sb.client;

    const userRows = MOCK_USERS.map(userToRow);
    const credRows = Object.entries(MOCK_CREDENTIALS).map(([email, password]) => ({ email, password }));

    const [{ error: ue }, { error: ce }] = await Promise.all([
      db.from('users').insert(userRows),
      db.from('credentials').insert(credRows),
    ]);

    if (ue) { console.error('[AuthService] seed users error:', ue); return; }
    if (ce) { console.error('[AuthService] seed credentials error:', ce); return; }

    this._allUsers.set([...MOCK_USERS]);
    this._allCreds.set({ ...MOCK_CREDENTIALS });
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

    if (record.lockedUntil && Date.now() < record.lockedUntil) {
      const secs = Math.ceil((record.lockedUntil - Date.now()) / 1000);
      return throwError(() => new Error(`Account locked. Try again in ${secs}s.`)).pipe(delay(300));
    }

    const found    = this._allUsers().find(u => u.email === email);
    const expected = this._allCreds()[email];

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
    store.setItem(SESSION_KEY, JSON.stringify(found));
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
    localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
    this._user.set(newUser);
    return of(newUser).pipe(delay(1000));
  }

  updateUser(updated: Partial<User>): void {
    const current = this._user();
    if (!current) return;
    const merged = { ...current, ...updated };
    this._user.set(merged);
    if (localStorage.getItem(SESSION_KEY)) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(merged));
    } else {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(merged));
    }
  }

  logout(): void {
    this._user.set(null);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    this.router.navigate(['/auth/login']);
  }

  homeRoute(): string {
    const user = this._user();
    if (user?.mustChangePassword) return '/change-password';
    const role = user?.role;
    if (role === 'admin') return '/admin';
    if (role === 'account_manager') return '/manager';
    if (role === 'customer_service') return '/support';
    return '/dashboard';
  }

  get allUsers(): User[] { return this._allUsers(); }

  // ── Admin: create a new user ─────────────────────────────────────────────────
  createUser(data: {
    firstName: string; lastName: string; email: string;
    role: UserRole; country: string; phone?: string;
  }): { user: User; tempPassword: string } {
    const locale: AppLocale = data.country === 'GB' ? 'en-GB' : 'en-US';
    const tempPassword = this._generateTempPassword();
    const prefix = data.role === 'account_manager' ? 'mgr' : data.role === 'customer_service' ? 'cs' : 'user';
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

    // Optimistic update
    this._allUsers.update(users => [...users, user]);
    this._allCreds.update(c => ({ ...c, [user.email]: tempPassword }));

    // Persist to Supabase
    if (this.sb.isConfigured) {
      this.sb.client.from('users').insert(userToRow(user))
        .then(({ error }) => { if (error) console.error('[AuthService] createUser error:', error); });
      this.sb.client.from('credentials').insert({ email: user.email, password: tempPassword })
        .then(({ error }) => { if (error) console.error('[AuthService] createUser cred error:', error); });
    }

    return { user, tempPassword };
  }

  // ── Change password ──────────────────────────────────────────────────────────
  changePassword(email: string, newPassword: string): void {
    const lc = email.toLowerCase().trim();

    // Update credential
    this._allCreds.update(c => ({ ...c, [lc]: newPassword }));
    if (this.sb.isConfigured) {
      this.sb.client.from('credentials')
        .upsert({ email: lc, password: newPassword }, { onConflict: 'email' })
        .then(({ error }) => { if (error) console.error('[AuthService] changePassword cred error:', error); });
    }

    // Clear mustChangePassword
    this._allUsers.update(users =>
      users.map(u => u.email === lc ? { ...u, mustChangePassword: false } : u)
    );
    if (this.sb.isConfigured) {
      this.sb.client.from('users')
        .update({ must_change_password: false })
        .eq('email', lc)
        .then(({ error }) => { if (error) console.error('[AuthService] changePassword user error:', error); });
    }

    // Update active session
    const current = this._user();
    if (current && current.email === lc) {
      const updated = { ...current, mustChangePassword: false };
      this._user.set(updated);
      const store = localStorage.getItem(SESSION_KEY) ? localStorage : sessionStorage;
      store.setItem(SESSION_KEY, JSON.stringify(updated));
    }
  }

  // ── Admin: update any user profile by ID ────────────────────────────────────
  updateUserById(id: string, updates: Partial<User>): void {
    this._allUsers.update(users =>
      users.map(u => u.id === id ? { ...u, ...updates } : u)
    );

    // Build DB-column update from Partial<User>
    const dbUpdates: Record<string, unknown> = {};
    if (updates.firstName !== undefined)        dbUpdates['first_name']           = updates.firstName;
    if (updates.lastName !== undefined)         dbUpdates['last_name']            = updates.lastName;
    if (updates.email !== undefined)            dbUpdates['email']                = updates.email;
    if (updates.phone !== undefined)            dbUpdates['phone']                = updates.phone;
    if (updates.address !== undefined)          dbUpdates['address']              = updates.address;
    if (updates.city !== undefined)             dbUpdates['city']                 = updates.city;
    if (updates.state !== undefined)            dbUpdates['state']                = updates.state;
    if (updates.zip !== undefined)              dbUpdates['zip']                  = updates.zip;
    if (updates.country !== undefined)          dbUpdates['country']              = updates.country;
    if (updates.locale !== undefined)           dbUpdates['locale']               = updates.locale;
    if (updates.role !== undefined)             dbUpdates['role']                 = updates.role;
    if (updates.mustChangePassword !== undefined) dbUpdates['must_change_password'] = updates.mustChangePassword;
    if (updates.managedUserIds !== undefined)   dbUpdates['managed_user_ids']     = updates.managedUserIds;
    if (updates.avatarUrl !== undefined)        dbUpdates['avatar_url']           = updates.avatarUrl;

    if (Object.keys(dbUpdates).length > 0 && this.sb.isConfigured) {
      this.sb.client.from('users').update(dbUpdates).eq('id', id)
        .then(({ error }) => { if (error) console.error('[AuthService] updateUserById error:', error); });
    }

    // Sync active session
    if (this._user()?.id === id) {
      const merged = { ...this._user()!, ...updates };
      this._user.set(merged);
      const store = localStorage.getItem(SESSION_KEY) ? localStorage : sessionStorage;
      store.setItem(SESSION_KEY, JSON.stringify(merged));
    }
  }

  // ── Admin: update login credentials for any user ─────────────────────────────
  updateCredentialsByEmail(currentEmail: string, newEmail?: string, newPassword?: string): void {
    const lc = currentEmail.toLowerCase().trim();
    const ne = newEmail?.toLowerCase().trim();
    const currentPwd = this._allCreds()[lc] ?? '';

    if (ne && ne !== lc) {
      this._allCreds.update(c => {
        const updated = { ...c };
        delete updated[lc];
        updated[ne] = newPassword ?? currentPwd;
        return updated;
      });
      if (this.sb.isConfigured) {
        this.sb.client.from('credentials').delete().eq('email', lc)
          .then(() => {
            this.sb.client.from('credentials')
              .insert({ email: ne, password: newPassword ?? currentPwd })
              .then(({ error }) => { if (error) console.error('[AuthService] updateCredentials error:', error); });
          });
      }
    } else if (newPassword) {
      this._allCreds.update(c => ({ ...c, [lc]: newPassword }));
      if (this.sb.isConfigured) {
        this.sb.client.from('credentials')
          .upsert({ email: lc, password: newPassword }, { onConflict: 'email' })
          .then(({ error }) => { if (error) console.error('[AuthService] updateCredentials error:', error); });
      }
    }
  }

  // ── Forgot password ──────────────────────────────────────────────────────────
  forgotPassword(email: string): Observable<void> {
    const lc   = email.toLowerCase().trim();
    const user = this._allUsers().find(u => u.email === lc);
    if (!user) {
      return throwError(() => new Error('No account found with that email address.')).pipe(delay(1000));
    }
    const tempPassword = this._generateTempPassword();
    this._allCreds.update(creds => ({ ...creds, [lc]: tempPassword }));
    if (this.sb.isConfigured) {
      this.sb.client.from('credentials')
        .upsert({ email: lc, password: tempPassword }, { onConflict: 'email' })
        .then(({ error }) => { if (error) console.error('[AuthService] forgotPassword error:', error); });
    }
    this.emailSvc.sendForgotPasswordEmail(user.email, user.firstName, tempPassword);
    return of(undefined).pipe(delay(1000));
  }

  // ── Reset password ───────────────────────────────────────────────────────────
  resetPassword(email: string, tempPassword: string, newPassword: string): Observable<User> {
    const lc        = email.toLowerCase().trim();
    const storedPwd = this._allCreds()[lc];
    if (!storedPwd || storedPwd !== tempPassword) {
      return throwError(() => new Error('The temporary password you entered is incorrect.')).pipe(delay(800));
    }
    this.changePassword(lc, newPassword);
    return this.login({ email: lc, password: newPassword, rememberMe: false });
  }

  // ── Sync users added to mock-data after initial Supabase seed ───────────────
  private async _syncMissingUsers(existing: User[], existingCreds: Record<string, string>): Promise<void> {
    const existingIds  = new Set(existing.map(u => u.id));
    const existingEmails = new Set(Object.keys(existingCreds));
    const missingUsers = MOCK_USERS.filter(u => !existingIds.has(u.id));
    const missingCreds = Object.entries(MOCK_CREDENTIALS)
      .filter(([email]) => !existingEmails.has(email));

    if (missingUsers.length === 0 && missingCreds.length === 0) return;

    const db = this.sb.client;
    if (missingUsers.length > 0) {
      const { error } = await db.from('users').insert(missingUsers.map(userToRow));
      if (!error) this._allUsers.update(list => [...list, ...missingUsers]);
      else console.error('[AuthService] _syncMissingUsers users error:', error);
    }
    if (missingCreds.length > 0) {
      const rows = missingCreds.map(([email, password]) => ({ email, password }));
      const { error } = await db.from('credentials').insert(rows);
      if (!error) this._allCreds.update(c => ({ ...c, ...Object.fromEntries(missingCreds) }));
      else console.error('[AuthService] _syncMissingUsers creds error:', error);
    }
  }

  // ── CS / Admin: force-reset any customer's password ─────────────────────────
  adminResetPassword(userId: string): string {
    const user = this._allUsers().find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    const tempPassword = this._generateTempPassword();
    this._allCreds.update(c => ({ ...c, [user.email]: tempPassword }));
    this._allUsers.update(list => list.map(u => u.id === userId ? { ...u, mustChangePassword: true } : u));
    if (this.sb.isConfigured) {
      this.sb.client.from('credentials')
        .upsert({ email: user.email, password: tempPassword }, { onConflict: 'email' })
        .then(({ error }) => { if (error) console.error('[AuthService] adminResetPassword cred error:', error); });
      this.sb.client.from('users')
        .update({ must_change_password: true }).eq('id', userId)
        .then(({ error }) => { if (error) console.error('[AuthService] adminResetPassword user error:', error); });
    }
    this.emailSvc.sendForgotPasswordEmail(user.email, user.firstName, tempPassword);
    return tempPassword;
  }

  // ── Legacy no-op (kept for any residual calls) ───────────────────────────────
  resetToSeedData(): void { /* data now lives in Supabase — no local reset */ }

  private _generateTempPassword(): string {
    const upper   = 'ABCDEFGHJKMNPQRSTUVWXYZ';
    const lower   = 'abcdefghjkmnpqrstuvwxyz';
    const digits  = '23456789';
    const special = '@#$!';
    const all     = upper + lower + digits + special;
    const parts   = [
      upper[Math.floor(Math.random() * upper.length)],
      lower[Math.floor(Math.random() * lower.length)],
      digits[Math.floor(Math.random() * digits.length)],
      special[Math.floor(Math.random() * special.length)],
      ...Array.from({ length: 6 }, () => all[Math.floor(Math.random() * all.length)]),
    ];
    return parts.sort(() => Math.random() - 0.5).join('');
  }
}
