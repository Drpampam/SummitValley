import { Injectable, inject, signal, computed, effect, WritableSignal } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Dispute, DisputeReason } from '../models/dispute.model';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { MOCK_DISPUTES } from '../data/mock-data';

@Injectable({ providedIn: 'root' })
export class DisputeService {
  private auth    = inject(AuthService);
  private storage = inject(StorageService);

  private _all: WritableSignal<Dispute[]>;

  constructor() {
    this._all = signal(this.storage.get<Dispute[]>('disputes') ?? MOCK_DISPUTES);
    effect(() => { this.storage.set('disputes', this._all()); });
  }

  readonly myDisputes = computed<Dispute[]>(() => {
    const user = this.auth.user();
    if (!user) return [];
    return this._all().filter(d => d.userId === user.id);
  });

  readonly allDisputes = computed<Dispute[]>(() => this._all());

  readonly disputedTransactionIds = computed(() =>
    new Set(this.myDisputes().map(d => d.transactionId))
  );

  updateDisputeStatus(id: string, status: Dispute['status']): void {
    this._all.update(list =>
      list.map(d => d.id === id
        ? { ...d, status, resolvedAt: (status === 'resolved' || status === 'rejected') ? new Date().toISOString() : d.resolvedAt }
        : d
      )
    );
  }

  submit(transactionId: string, reason: DisputeReason, description: string): Observable<Dispute> {
    const user = this.auth.user();
    if (!user) throw new Error('Not authenticated');
    const seq = String(this._all().length + 1).padStart(4, '0');
    const dispute: Dispute = {
      id:            'dsp-' + Date.now(),
      transactionId,
      userId:        user.id,
      reason,
      description,
      status:        'submitted',
      submittedAt:   new Date().toISOString(),
      caseNumber:    `DSP-2026-${seq}`,
    };
    this._all.update(list => [dispute, ...list]);
    return of(dispute).pipe(delay(800));
  }
}
