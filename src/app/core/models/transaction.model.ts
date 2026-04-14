export type TransactionType = 'credit' | 'debit';
export type TransactionStatus = 'completed' | 'pending' | 'failed';
export type TransactionCategory =
  | 'transfer'
  | 'payment'
  | 'deposit'
  | 'withdrawal'
  | 'groceries'
  | 'utilities'
  | 'dining'
  | 'shopping'
  | 'salary'
  | 'other';

export interface Transaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  category: TransactionCategory;
  type: TransactionType;
  amount: number;
  balance: number;
  status: TransactionStatus;
  reference?: string;
  denialMessage?: string;   // set when blocked by a transaction policy
}

export type PolicyRuleType = 'block_all_outgoing' | 'block_above_amount';

export interface TransactionPolicy {
  id: string;
  name: string;
  enabled: boolean;
  targetUserId?: string;      // undefined = applies to all users
  ruleType: PolicyRuleType;
  amountThreshold?: number;   // for block_above_amount
  denialMessage: string;
  createdBy: string;
  createdAt: string;
}

export interface PolicyCheckResult {
  allowed: boolean;
  denialMessage?: string;
  policyName?: string;
}

export interface TransferRequest {
  fromAccountId: string;
  toAccountId?: string;
  recipientName?: string;
  routingNumber?: string;
  accountNumber?: string;
  amount: number;
  date: string;
  note?: string;
  isInternal: boolean;
}
