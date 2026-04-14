import { Injectable, inject, signal, computed, effect, WritableSignal } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Beneficiary } from '../models/beneficiary.model';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { MOCK_BENEFICIARIES } from '../data/mock-data';

@Injectable({ providedIn: 'root' })
export class BeneficiaryService {
  private auth    = inject(AuthService);
  private storage = inject(StorageService);

  private _all: WritableSignal<Beneficiary[]>;

  constructor() {
    this._all = signal(this.storage.get<Beneficiary[]>('beneficiaries') ?? MOCK_BENEFICIARIES);
    effect(() => { this.storage.set('beneficiaries', this._all()); });
  }

  readonly myBeneficiaries = computed<Beneficiary[]>(() => {
    const user = this.auth.user();
    if (!user) return [];
    return this._all()
      .filter(b => b.userId === user.id)
      .sort((a, b) => new Date(b.lastUsed ?? 0).getTime() - new Date(a.lastUsed ?? 0).getTime());
  });

  getBeneficiaries(): Observable<Beneficiary[]> { return of(this.myBeneficiaries()).pipe(delay(300)); }

  add(data: Omit<Beneficiary, 'id' | 'userId' | 'createdAt'>): void {
    const user = this.auth.user();
    if (!user) return;
    this._all.update(list => [{
      ...data,
      id: 'ben-' + Date.now(),
      userId: user.id,
      createdAt: new Date().toISOString(),
    }, ...list]);
  }

  remove(id: string): void {
    this._all.update(list => list.filter(b => b.id !== id));
  }

  markUsed(id: string): void {
    this._all.update(list => list.map(b =>
      b.id === id ? { ...b, lastUsed: new Date().toISOString() } : b
    ));
  }
}
