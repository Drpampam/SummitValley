import { Injectable, inject, signal, computed, effect, WritableSignal } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { DebitCard } from '../models/card.model';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { MOCK_CARDS } from '../data/mock-data';

@Injectable({ providedIn: 'root' })
export class CardService {
  private auth    = inject(AuthService);
  private storage = inject(StorageService);

  private _all: WritableSignal<DebitCard[]>;

  constructor() {
    this._all = signal(this.storage.get<DebitCard[]>('cards') ?? MOCK_CARDS);
    effect(() => { this.storage.set('cards', this._all()); });
  }

  readonly myCards = computed<DebitCard[]>(() => {
    const user = this.auth.user();
    if (!user) return [];
    return this._all().filter(c => c.userId === user.id);
  });

  getCards(): Observable<DebitCard[]> { return of(this.myCards()).pipe(delay(300)); }

  toggleFreeze(cardId: string): void {
    this._all.update(list => list.map(c =>
      c.id === cardId
        ? { ...c, status: c.status === 'frozen' ? 'active' : 'frozen' }
        : c
    ));
  }

  updateLimits(cardId: string, dailyLimit: number, atmLimit: number): void {
    this._all.update(list => list.map(c =>
      c.id === cardId ? { ...c, dailyLimit, atmLimit } : c
    ));
  }

  updateSettings(cardId: string, partial: Partial<DebitCard>): void {
    this._all.update(list => list.map(c =>
      c.id === cardId ? { ...c, ...partial } : c
    ));
  }

  reportLost(cardId: string): void {
    this._all.update(list => list.map(c =>
      c.id === cardId ? { ...c, status: 'cancelled' } : c
    ));
  }
}
