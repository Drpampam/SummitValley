export type AlertChannel = 'email' | 'sms' | 'push';
export type AlertTrigger = 'large_transaction' | 'low_balance' | 'card_used' | 'login' | 'payment_due' | 'transfer_sent' | 'direct_deposit';

export interface AccountAlert {
  id: string;
  userId: string;
  trigger: AlertTrigger;
  label: string;
  description: string;
  enabled: boolean;
  channels: AlertChannel[];
  threshold?: number;
}
