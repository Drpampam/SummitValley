export type BeneficiaryType = 'internal' | 'external';

export interface Beneficiary {
  id: string;
  userId: string;
  nickname: string;
  type: BeneficiaryType;
  recipientName?: string;
  routingNumber?: string;
  accountNumber?: string;
  bankName?: string;
  toAccountId?: string;
  createdAt: string;
  lastUsed?: string;
}
