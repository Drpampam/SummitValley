export type CardStatus = 'active' | 'frozen' | 'cancelled';
export type CardNetwork = 'Visa' | 'Mastercard';

export interface DebitCard {
  id: string;
  userId: string;
  accountId: string;
  last4: string;
  network: CardNetwork;
  expiryMonth: number;
  expiryYear: number;
  cardholderName: string;
  status: CardStatus;
  dailyLimit: number;
  atmLimit: number;
  onlineTransactionsEnabled: boolean;
  internationalTransactionsEnabled: boolean;
  contactlessEnabled: boolean;
  issuedAt: string;
}
