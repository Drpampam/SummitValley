import { Injectable, inject, computed } from '@angular/core';
import { TransactionService } from './transaction.service';
import { LocaleService } from './locale.service';
import { CategorySpend, MonthlyBar, TopMerchant } from '../models/insight.model';

const CATEGORY_META: Record<string, { label: string; color: string; icon: string }> = {
  transfer:    { label: 'Transfers',   color: '#CC0000', icon: 'compare_arrows' },
  payment:     { label: 'Payments',   color: '#7a1118', icon: 'payments'       },
  groceries:   { label: 'Groceries',  color: '#15803d', icon: 'shopping_basket' },
  utilities:   { label: 'Utilities',  color: '#0891b2', icon: 'bolt'           },
  dining:      { label: 'Dining',     color: '#FFCD41', icon: 'restaurant'     },
  shopping:    { label: 'Shopping',   color: '#ec4899', icon: 'shopping_bag'   },
  withdrawal:  { label: 'Cash',       color: '#6b7280', icon: 'local_atm'      },
  other:       { label: 'Other',      color: '#94a3b8', icon: 'category'       },
};

@Injectable({ providedIn: 'root' })
export class InsightService {
  private txnSvc    = inject(TransactionService);
  private localeSvc = inject(LocaleService);

  private readonly debits = computed(() =>
    this.txnSvc.allTransactions.filter(t => t.type === 'debit' && t.status === 'completed')
  );

  readonly currentMonthDebits = computed(() => {
    const now = new Date();
    return this.debits().filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  });

  readonly categorySpend = computed<CategorySpend[]>(() => {
    const txns = this.currentMonthDebits();
    const totals: Record<string, number> = {};
    for (const t of txns) {
      totals[t.category] = (totals[t.category] ?? 0) + t.amount;
    }
    const grand = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(totals)
      .map(([cat, amount]) => {
        const meta = CATEGORY_META[cat] ?? CATEGORY_META['other'];
        return {
          category:   cat,
          label:      meta.label,
          amount,
          percentage: Math.round((amount / grand) * 100),
          color:      meta.color,
          icon:       meta.icon,
          trend:      Math.floor(Math.random() * 20) - 10,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  });

  readonly monthlyBars = computed<MonthlyBar[]>(() => {
    const now = new Date();
    const bars: MonthlyBar[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const txns = this.txnSvc.allTransactions.filter(t => {
        const td = new Date(t.date);
        return td.getFullYear() === y && td.getMonth() + 1 === m && t.status === 'completed';
      });
      bars.push({
        label:    d.toLocaleString('default', { month: 'short' }),
        income:   txns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0),
        expenses: txns.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0),
        month: m,
        year:  y,
      });
    }
    return bars;
  });

  readonly topMerchants = computed<TopMerchant[]>(() => {
    const map: Record<string, { total: number; count: number; category: string }> = {};
    for (const t of this.debits()) {
      if (!map[t.description]) map[t.description] = { total: 0, count: 0, category: t.category };
      map[t.description].total += t.amount;
      map[t.description].count += 1;
    }
    return Object.entries(map)
      .map(([name, v]) => {
        const meta = CATEGORY_META[v.category] ?? CATEGORY_META['other'];
        return { name, category: v.category, totalSpent: v.total, visitCount: v.count, icon: meta.icon, color: meta.color };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 8);
  });

  readonly currency = computed(() => this.localeSvc.currencySymbol());
}
