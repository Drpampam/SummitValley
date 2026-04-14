import { Injectable, inject, signal, NgZone, OnDestroy } from '@angular/core';
import { environment } from '../../../environments/environment';

const TIMEOUT_MS = environment.sessionTimeoutMinutes * 60 * 1000;
const WARNING_MS = environment.sessionWarningMinutes * 60 * 1000;

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

@Injectable({ providedIn: 'root' })
export class SessionService implements OnDestroy {
  private ngZone    = inject(NgZone);
  private logoutFn: (() => void) | null = null;

  readonly showWarning = signal(false);

  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private warningId:  ReturnType<typeof setTimeout> | null = null;
  private boundReset: () => void;

  constructor() {
    this.boundReset = this.resetTimer.bind(this);
  }

  /** Call once after login, passing the logout function from AuthService. */
  start(logoutFn: () => void): void {
    this.logoutFn = logoutFn;
    this.attachListeners();
    this.scheduleTimers();
  }

  stop(): void {
    this.clearTimers();
    this.detachListeners();
    this.showWarning.set(false);
    this.logoutFn = null;
  }

  extendSession(): void {
    this.showWarning.set(false);
    this.resetTimer();
  }

  private resetTimer(): void {
    this.clearTimers();
    this.scheduleTimers();
    if (this.showWarning()) this.showWarning.set(false);
  }

  private scheduleTimers(): void {
    this.ngZone.runOutsideAngular(() => {
      this.warningId = setTimeout(() => {
        this.ngZone.run(() => this.showWarning.set(true));
      }, WARNING_MS);

      this.timeoutId = setTimeout(() => {
        this.ngZone.run(() => {
          this.showWarning.set(false);
          this.stop();
          this.logoutFn?.();
        });
      }, TIMEOUT_MS);
    });
  }

  private clearTimers(): void {
    if (this.timeoutId != null) { clearTimeout(this.timeoutId); this.timeoutId = null; }
    if (this.warningId  != null) { clearTimeout(this.warningId);  this.warningId  = null; }
  }

  private attachListeners(): void {
    this.ngZone.runOutsideAngular(() => {
      ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, this.boundReset, { passive: true }));
    });
  }

  private detachListeners(): void {
    ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, this.boundReset));
  }

  ngOnDestroy(): void { this.stop(); }
}
