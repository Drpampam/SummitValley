import { Injectable, signal, computed, effect, WritableSignal, inject } from '@angular/core';
import { TransactionPolicy, PolicyCheckResult, TransferRequest } from '../models/transaction.model';
import { StorageService } from './storage.service';
import { MOCK_ACCOUNTS } from '../data/mock-data';

const STORAGE_KEY = 'policies';

const DEFAULT_POLICIES: TransactionPolicy[] = [
  {
    id: 'pol-default-001',
    name: 'High-Value Transfer Limit',
    enabled: false,
    ruleType: 'block_above_amount',
    amountThreshold: 50000,
    denialMessage: 'This transfer exceeds the maximum single-transaction limit. Please contact your account manager to authorise large transfers.',
    createdBy: 'admin-001',
    createdAt: new Date().toISOString(),
  },
];

@Injectable({ providedIn: 'root' })
export class PolicyService {
  private storage = inject(StorageService);
  private _policies: WritableSignal<TransactionPolicy[]>;

  constructor() {
    const stored = this.storage.get<TransactionPolicy[]>(STORAGE_KEY);
    this._policies = signal<TransactionPolicy[]>(stored ?? DEFAULT_POLICIES);

    effect(() => {
      this.storage.set(STORAGE_KEY, this._policies());
    });
  }

  readonly policies = computed(() => this._policies());

  readonly activePolicies = computed(() => this._policies().filter(p => p.enabled));

  addPolicy(policy: TransactionPolicy): void {
    this._policies.update(list => [policy, ...list]);
  }

  updatePolicy(id: string, updates: Partial<TransactionPolicy>): void {
    this._policies.update(list =>
      list.map(p => p.id === id ? { ...p, ...updates } : p)
    );
  }

  togglePolicy(id: string): void {
    this._policies.update(list =>
      list.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p)
    );
  }

  deletePolicy(id: string): void {
    this._policies.update(list => list.filter(p => p.id !== id));
  }

  /**
   * Evaluate whether a transfer request is permitted.
   * Returns { allowed: true } or { allowed: false, denialMessage, policyName }.
   */
  evaluateTransfer(request: TransferRequest): PolicyCheckResult {
    const enabled = this._policies().filter(p => p.enabled);
    const fromAccount = MOCK_ACCOUNTS.find(a => a.id === request.fromAccountId);
    const userId = fromAccount?.userId;

    for (const policy of enabled) {
      // Skip policies scoped to a different user
      if (policy.targetUserId && policy.targetUserId !== userId) continue;

      switch (policy.ruleType) {
        case 'block_all_outgoing':
          return {
            allowed: false,
            denialMessage: policy.denialMessage,
            policyName: policy.name,
          };

        case 'block_above_amount':
          if (policy.amountThreshold != null && request.amount > policy.amountThreshold) {
            return {
              allowed: false,
              denialMessage: policy.denialMessage,
              policyName: policy.name,
            };
          }
          break;
      }
    }

    return { allowed: true };
  }

  /** Convenience: get policies scoped to a specific user (or global). */
  getPoliciesForUser(userId: string): TransactionPolicy[] {
    return this._policies().filter(p => !p.targetUserId || p.targetUserId === userId);
  }

  /** Returns true if the given user is currently blocked from all outgoing txns. */
  isUserBlocked(userId: string): boolean {
    return this._policies().some(p =>
      p.enabled &&
      p.ruleType === 'block_all_outgoing' &&
      (!p.targetUserId || p.targetUserId === userId)
    );
  }

  /** Get the active block_all_outgoing policy for a specific user (exact match). */
  getUserBlockPolicy(userId: string): TransactionPolicy | undefined {
    return this._policies().find(p =>
      p.enabled &&
      p.ruleType === 'block_all_outgoing' &&
      p.targetUserId === userId
    );
  }
}
