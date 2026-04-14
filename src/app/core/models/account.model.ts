export type AccountType = 'checking' | 'savings';

export interface Account {
  id: string;
  userId: string;
  type: AccountType;
  accountNumber: string;
  balance: number;
  availableBalance: number;
  currency: 'USD' | 'GBP';
  createdAt: string;
}
