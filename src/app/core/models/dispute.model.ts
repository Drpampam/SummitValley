export type DisputeReason = 'unauthorized' | 'duplicate' | 'incorrect_amount' | 'merchant_error' | 'not_received' | 'other';
export type DisputeStatus = 'submitted' | 'under_review' | 'resolved' | 'rejected';

export interface Dispute {
  id: string;
  transactionId: string;
  userId: string;
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  submittedAt: string;
  resolvedAt?: string;
  caseNumber: string;
}
