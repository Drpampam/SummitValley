import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InsightService } from '../../core/services/insight.service';
import { CategorySpend } from '../../core/models/insight.model';

type InsightTab = 'categories' | 'monthly' | 'merchants';

@Component({
  selector: 'app-insights',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './insights.html',
  styleUrl: './insights.scss',
})
export class InsightsComponent {
  private svc = inject(InsightService);

  activeTab     = signal<InsightTab>('categories');
  categorySpend = this.svc.categorySpend;
  monthlyBars   = this.svc.monthlyBars;
  topMerchants  = this.svc.topMerchants;
  currency      = this.svc.currency;

  setTab(tab: InsightTab): void { this.activeTab.set(tab); }

  readonly totalSpend = computed(() =>
    this.categorySpend().reduce((s, c) => s + c.amount, 0)
  );

  readonly donutGradient = computed(() => {
    const cats = this.categorySpend();
    if (!cats.length) return 'conic-gradient(#e5e7eb 0deg 360deg)';
    let deg = 0;
    const parts = cats.map(c => {
      const start = deg;
      deg += (c.percentage / 100) * 360;
      return `${c.color} ${start}deg ${deg}deg`;
    });
    return `conic-gradient(${parts.join(', ')})`;
  });

  readonly maxMonthly = computed(() => {
    const bars = this.monthlyBars();
    return Math.max(...bars.map(b => Math.max(b.income, b.expenses)), 1);
  });

  barHeight(value: number): string {
    return `${Math.round((value / this.maxMonthly()) * 160)}px`;
  }

  readonly maxMerchant = computed(() => {
    const m = this.topMerchants();
    return m.length ? m[0].totalSpent : 1;
  });

  merchantBarWidth(amount: number): string {
    return `${Math.round((amount / this.maxMerchant()) * 100)}%`;
  }

  trendIcon(trend: number): string { return trend >= 0 ? 'trending_up' : 'trending_down'; }
  trendClass(trend: number): string { return trend >= 0 ? 'trend-up' : 'trend-down'; }
}
