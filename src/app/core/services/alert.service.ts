import { Injectable, inject, signal, computed, effect, WritableSignal } from '@angular/core';
import { AccountAlert, AlertChannel } from '../models/alert.model';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { MOCK_ALERTS } from '../data/mock-data';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private auth    = inject(AuthService);
  private storage = inject(StorageService);

  private _all: WritableSignal<AccountAlert[]>;

  constructor() {
    this._all = signal(this.storage.get<AccountAlert[]>('account_alerts') ?? MOCK_ALERTS);
    effect(() => { this.storage.set('account_alerts', this._all()); });
  }

  readonly myAlerts = computed<AccountAlert[]>(() => {
    const user = this.auth.user();
    if (!user) return [];
    return this._all().filter(a => a.userId === user.id);
  });

  toggle(alertId: string): void {
    this._all.update(list => list.map(a =>
      a.id === alertId ? { ...a, enabled: !a.enabled } : a
    ));
  }

  updateThreshold(alertId: string, threshold: number): void {
    this._all.update(list => list.map(a =>
      a.id === alertId ? { ...a, threshold } : a
    ));
  }

  toggleChannel(alertId: string, channel: AlertChannel): void {
    this._all.update(list => list.map(a => {
      if (a.id !== alertId) return a;
      const channels = a.channels.includes(channel)
        ? a.channels.filter(c => c !== channel)
        : [...a.channels, channel];
      return { ...a, channels };
    }));
  }
}
