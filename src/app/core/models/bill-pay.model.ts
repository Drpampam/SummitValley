export type BillPayStatus = 'scheduled' | 'paid' | 'failed' | 'cancelled';
export type BillerCategory = 'utilities' | 'insurance' | 'subscription' | 'rent' | 'credit_card' | 'phone' | 'internet' | 'other';

export interface Biller {
  id: string;
  name: string;
  category: BillerCategory;
  logoIcon: string;
  accountNumber: string;
  defaultAmount?: number;
  autopay: boolean;
  autopayDay?: number;
}

export interface BillPayment {
  id: string;
  billerId: string;
  billerName: string;
  fromAccountId: string;
  amount: number;
  scheduledDate: string;
  paidDate?: string;
  status: BillPayStatus;
  confirmationCode?: string;
  memo?: string;
}
