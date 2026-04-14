import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AlertService } from '../../core/services/alert.service';
import { ToastService } from '../../core/services/toast.service';
import { LocaleService } from '../../core/services/locale.service';
import { AccountAlert, AlertChannel } from '../../core/models/alert.model';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [
    CommonModule, DecimalPipe, FormsModule,
    MatIconModule, MatButtonModule, MatSlideToggleModule, MatTooltipModule,
  ],
  templateUrl: './alerts.html',
  styleUrl: './alerts.scss',
})
export class AlertsComponent {
  private alertSvc = inject(AlertService);
  private toast    = inject(ToastService);
  private locale   = inject(LocaleService);

  alerts   = this.alertSvc.myAlerts;
  currency = this.locale.currencySymbol;

  thresholdEditing = signal<string | null>(null);
  tempThreshold    = signal<number>(0);

  readonly enabledCount = computed(() => this.alerts().filter(a => a.enabled).length);

  readonly channels: { value: AlertChannel; icon: string; label: string }[] = [
    { value: 'email', icon: 'email',         label: 'Email' },
    { value: 'sms',   icon: 'sms',           label: 'SMS' },
    { value: 'push',  icon: 'notifications', label: 'Push' },
  ];

  toggle(alertId: string): void {
    this.alertSvc.toggle(alertId);
    const a = this.alerts().find(a => a.id === alertId);
    this.toast.info(a?.enabled ? 'Alert enabled.' : 'Alert disabled.');
  }

  toggleChannel(alert: AccountAlert, channel: AlertChannel): void {
    this.alertSvc.toggleChannel(alert.id, channel);
  }

  isChannelActive(alert: AccountAlert, channel: AlertChannel): boolean {
    return alert.channels.includes(channel);
  }

  openThreshold(alert: AccountAlert): void {
    this.thresholdEditing.set(alert.id);
    this.tempThreshold.set(alert.threshold ?? 0);
  }

  saveThreshold(alertId: string): void {
    this.alertSvc.updateThreshold(alertId, this.tempThreshold());
    this.thresholdEditing.set(null);
    this.toast.success('Alert threshold updated.');
  }

  cancelThreshold(): void { this.thresholdEditing.set(null); }

  triggerIcon(trigger: string): string {
    const m: Record<string, string> = {
      large_transaction: 'payments',
      low_balance:       'account_balance_wallet',
      card_used:         'credit_card',
      login:             'login',
      payment_due:       'schedule',
      transfer_sent:     'compare_arrows',
      direct_deposit:    'savings',
    };
    return m[trigger] ?? 'notifications';
  }
}
