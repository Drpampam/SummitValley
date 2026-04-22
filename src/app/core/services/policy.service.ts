import { Injectable, signal, computed, inject, WritableSignal } from '@angular/core';
import { TransactionPolicy, PolicyCheckResult, TransferRequest } from '../models/transaction.model';
import { AccountService } from './account.service';
import { SupabaseService } from './supabase.service';

const DEFAULT_POLICIES: TransactionPolicy[] = [
  {
    id:              'pol-default-001',
    name:            'High-Value Transfer Limit',
    enabled:         false,
    ruleType:        'block_above_amount',
    amountThreshold: 50000,
    denialMessage:   'This transfer exceeds the maximum single-transaction limit. Please contact your account manager to authorise large transfers.',
    createdBy:       'admin-001',
    createdAt:       new Date().toISOString(),
  },
];

function rowToPolicy(r: Record<string, unknown>): TransactionPolicy {
  return {
    id:              r['id'] as string,
    name:            r['name'] as string,
    enabled:         r['enabled'] as boolean,
    ruleType:        r['rule_type'] as TransactionPolicy['ruleType'],
    amountThreshold: r['amount_threshold'] != null ? Number(r['amount_threshold']) : undefined,
    targetUserId:    r['target_user_id'] as string | undefined,
    denialMessage:   r['denial_message'] as string,
    createdBy:       r['created_by'] as string,
    createdAt:       r['created_at'] as string,
  };
}

function policyToRow(p: TransactionPolicy): Record<string, unknown> {
  return {
    id:               p.id,
    name:             p.name,
    enabled:          p.enabled,
    rule_type:        p.ruleType,
    amount_threshold: p.amountThreshold ?? null,
    target_user_id:   p.targetUserId ?? null,
    denial_message:   p.denialMessage,
    created_by:       p.createdBy,
    created_at:       p.createdAt,
  };
}

@Injectable({ providedIn: 'root' })
export class PolicyService {
  private accSvc = inject(AccountService);
  private sb     = inject(SupabaseService);

  private _policies: WritableSignal<TransactionPolicy[]> = signal([]);

  constructor() {
    this._loadFromSupabase();
  }

  private async _loadFromSupabase(): Promise<void> {
    this._policies.set([...DEFAULT_POLICIES]);
    try {
      const { data, error } = await this.sb.client.from('policies').select('*');
      if (error) { console.error('[PolicyService] load error — using default fallback:', error); return; }
      if (!data || data.length === 0) { await this._seed(); return; }
      this._policies.set(data.map(rowToPolicy));
    } catch (err) {
      console.error('[PolicyService] Supabase unreachable — using default fallback:', err);
    }
  }

  private async _seed(): Promise<void> {
    const { error } = await this.sb.client.from('policies').insert(DEFAULT_POLICIES.map(policyToRow));
    if (error) { console.error('[PolicyService] seed error:', error); return; }
    this._policies.set([...DEFAULT_POLICIES]);
  }

  readonly policies       = computed(() => this._policies());
  readonly activePolicies = computed(() => this._policies().filter(p => p.enabled));

  addPolicy(policy: TransactionPolicy): void {
    this._policies.update(list => [policy, ...list]);
    this.sb.client.from('policies').insert(policyToRow(policy))
      .then(({ error }) => { if (error) console.error('[PolicyService] add error:', error); });
  }

  updatePolicy(id: string, updates: Partial<TransactionPolicy>): void {
    this._policies.update(list => list.map(p => p.id === id ? { ...p, ...updates } : p));

    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined)             dbUpdates['name']             = updates.name;
    if (updates.enabled !== undefined)          dbUpdates['enabled']          = updates.enabled;
    if (updates.ruleType !== undefined)         dbUpdates['rule_type']        = updates.ruleType;
    if (updates.amountThreshold !== undefined)  dbUpdates['amount_threshold'] = updates.amountThreshold ?? null;
    if (updates.targetUserId !== undefined)     dbUpdates['target_user_id']   = updates.targetUserId ?? null;
    if (updates.denialMessage !== undefined)    dbUpdates['denial_message']   = updates.denialMessage;

    if (Object.keys(dbUpdates).length > 0) {
      this.sb.client.from('policies').update(dbUpdates).eq('id', id)
        .then(({ error }) => { if (error) console.error('[PolicyService] update error:', error); });
    }
  }

  togglePolicy(id: string): void {
    const current = this._policies().find(p => p.id === id);
    if (!current) return;
    const enabled = !current.enabled;
    this._policies.update(list => list.map(p => p.id === id ? { ...p, enabled } : p));
    this.sb.client.from('policies').update({ enabled }).eq('id', id)
      .then(({ error }) => { if (error) console.error('[PolicyService] toggle error:', error); });
  }

  deletePolicy(id: string): void {
    this._policies.update(list => list.filter(p => p.id !== id));
    this.sb.client.from('policies').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('[PolicyService] delete error:', error); });
  }

  evaluateTransfer(request: TransferRequest): PolicyCheckResult {
    const enabled = this._policies().filter(p => p.enabled);
    const userId  = this.accSvc.getAccountById(request.fromAccountId)?.userId;

    for (const policy of enabled) {
      if (policy.targetUserId && policy.targetUserId !== userId) continue;

      switch (policy.ruleType) {
        case 'block_all_outgoing':
          return { allowed: false, denialMessage: policy.denialMessage, policyName: policy.name };

        case 'block_above_amount':
          if (policy.amountThreshold != null && request.amount > policy.amountThreshold) {
            return { allowed: false, denialMessage: policy.denialMessage, policyName: policy.name };
          }
          break;
      }
    }
    return { allowed: true };
  }

  getPoliciesForUser(userId: string): TransactionPolicy[] {
    return this._policies().filter(p => !p.targetUserId || p.targetUserId === userId);
  }

  isUserBlocked(userId: string): boolean {
    return this._policies().some(p =>
      p.enabled && p.ruleType === 'block_all_outgoing' && (!p.targetUserId || p.targetUserId === userId)
    );
  }

  getUserBlockPolicy(userId: string): TransactionPolicy | undefined {
    return this._policies().find(p =>
      p.enabled && p.ruleType === 'block_all_outgoing' && p.targetUserId === userId
    );
  }
}
