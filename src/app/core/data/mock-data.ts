import { User } from '../models/user.model';
import { Account } from '../models/account.model';
import { Transaction } from '../models/transaction.model';
import { Biller, BillPayment } from '../models/bill-pay.model';
import { DebitCard } from '../models/card.model';
import { Statement } from '../models/statement.model';
import { SavingsGoal } from '../models/goal.model';
import { Beneficiary } from '../models/beneficiary.model';
import { Dispute } from '../models/dispute.model';
import { AccountAlert } from '../models/alert.model';

// ── Credentials (email → password) ────────────────────────────────────────────
export const MOCK_CREDENTIALS: Record<string, string> = {
  'svb-marcus-reynolds@mailinator.com': 'Marcus@1234',
  'svb-sophie-hartley@mailinator.com':  'Sophie@4321',
  'svb-elena-vasquez@mailinator.com':   'Elena@1234',
  'svb-daniel-okafor@mailinator.com':   'Daniel@123',
  'svb-rachel-kim@mailinator.com':      'Rachel@1234',
};

// ── Users ──────────────────────────────────────────────────────────────────────
export const MOCK_USERS: User[] = [
  // ── Regular Customers ──────────────────────────────────────────────────────
  {
    id: 'user-001',
    firstName: 'Marcus',
    lastName: 'Reynolds',
    email: 'svb-marcus-reynolds@mailinator.com',
    phone: '+1 212 548 3901',
    address: '47 Lexington Avenue',
    city: 'New York',
    state: 'NY',
    zip: '10017',
    country: 'US',
    locale: 'en-US',
    role: 'user',
    createdAt: '2023-01-15T00:00:00Z',
  },
  {
    id: 'user-002',
    firstName: 'Sophie',
    lastName: 'Hartley',
    email: 'svb-sophie-hartley@mailinator.com',
    phone: '+44 20 3892 4715',
    address: '32 Kensington High Street',
    city: 'London',
    state: 'Greater London',
    zip: 'W8 4PT',
    country: 'GB',
    locale: 'en-GB',
    role: 'user',
    createdAt: '2023-03-20T00:00:00Z',
  },
  {
    id: 'user-003',
    firstName: 'Elena',
    lastName: 'Vasquez',
    email: 'svb-elena-vasquez@mailinator.com',
    phone: '+1 415 302 8847',
    address: '819 Castro Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94114',
    country: 'US',
    locale: 'en-US',
    role: 'user',
    createdAt: '2023-06-10T00:00:00Z',
  },

  // ── Account Manager ────────────────────────────────────────────────────────
  {
    id: 'mgr-001',
    firstName: 'Daniel',
    lastName: 'Okafor',
    email: 'svb-daniel-okafor@mailinator.com',
    phone: '+1 212 749 6032',
    address: '520 Park Avenue',
    city: 'New York',
    state: 'NY',
    zip: '10022',
    country: 'US',
    locale: 'en-US',
    role: 'account_manager',
    managedUserIds: ['user-001', 'user-002', 'user-003'],
    createdAt: '2022-06-01T00:00:00Z',
  },

  // ── Super Admin ────────────────────────────────────────────────────────────
  {
    id: 'admin-001',
    firstName: 'Rachel',
    lastName: 'Kim',
    email: 'svb-rachel-kim@mailinator.com',
    phone: '+1 800 427 5193',
    address: '1 World Financial Center',
    city: 'New York',
    state: 'NY',
    zip: '10281',
    country: 'US',
    locale: 'en-US',
    role: 'admin',
    createdAt: '2022-01-01T00:00:00Z',
  },
];

// ── Accounts ───────────────────────────────────────────────────────────────────
export const MOCK_ACCOUNTS: Account[] = [
  // Alex Morgan (user-001) — USD
  { id: 'acc-001', userId: 'user-001', type: 'checking', accountNumber: '****4521', balance: 8432.50,  availableBalance: 8200.00,  currency: 'USD', createdAt: '2023-01-15T00:00:00Z' },
  { id: 'acc-002', userId: 'user-001', type: 'savings',  accountNumber: '****7893', balance: 24750.00, availableBalance: 24750.00, currency: 'USD', createdAt: '2023-01-15T00:00:00Z' },

  // James Wilson (user-002) — GBP
  { id: 'acc-003', userId: 'user-002', type: 'checking', accountNumber: '****2847', balance: 12845.00, availableBalance: 12500.00, currency: 'GBP', createdAt: '2023-03-20T00:00:00Z' },
  { id: 'acc-004', userId: 'user-002', type: 'savings',  accountNumber: '****6152', balance: 31200.00, availableBalance: 31200.00, currency: 'GBP', createdAt: '2023-03-20T00:00:00Z' },

  // Priya Patel (user-003) — USD
  { id: 'acc-005', userId: 'user-003', type: 'checking', accountNumber: '****9034', balance: 5280.00,  availableBalance: 5100.00,  currency: 'USD', createdAt: '2023-06-10T00:00:00Z' },
  { id: 'acc-006', userId: 'user-003', type: 'savings',  accountNumber: '****3471', balance: 18960.00, availableBalance: 18960.00, currency: 'USD', createdAt: '2023-06-10T00:00:00Z' },
];

// ── Transactions ───────────────────────────────────────────────────────────────
export const MOCK_TRANSACTIONS: Transaction[] = [
  // ── Alex Morgan (acc-001 checking, acc-002 savings) ─────────────────────────
  { id: 'txn-001', accountId: 'acc-001', date: '2026-04-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',      type: 'credit', amount: 3500.00, balance: 8432.50, status: 'completed', reference: 'PAY-20260405' },
  { id: 'txn-002', accountId: 'acc-001', date: '2026-04-04T10:15:00Z', description: 'Whole Foods Market',         category: 'groceries',   type: 'debit',  amount: 87.43,   balance: 4932.50, status: 'completed' },
  { id: 'txn-003', accountId: 'acc-001', date: '2026-04-03T19:45:00Z', description: 'Netflix Subscription',       category: 'utilities',   type: 'debit',  amount: 15.99,   balance: 5019.93, status: 'completed' },
  { id: 'txn-004', accountId: 'acc-001', date: '2026-04-02T12:00:00Z', description: 'Transfer to Savings',        category: 'transfer',    type: 'debit',  amount: 500.00,  balance: 5035.92, status: 'completed', reference: 'TRF-20260402' },
  { id: 'txn-005', accountId: 'acc-001', date: '2026-04-01T08:30:00Z', description: 'Amazon.com',                 category: 'shopping',    type: 'debit',  amount: 124.99,  balance: 5535.92, status: 'completed' },
  { id: 'txn-006', accountId: 'acc-001', date: '2026-03-31T20:15:00Z', description: 'The Cheesecake Factory',     category: 'dining',      type: 'debit',  amount: 68.50,   balance: 5660.91, status: 'completed' },
  { id: 'txn-007', accountId: 'acc-001', date: '2026-03-30T09:00:00Z', description: 'Electric Bill – ConEd',      category: 'utilities',   type: 'debit',  amount: 142.00,  balance: 5729.41, status: 'completed' },
  { id: 'txn-008', accountId: 'acc-001', date: '2026-03-28T14:00:00Z', description: 'Online Transfer Received',   category: 'transfer',    type: 'credit', amount: 200.00,  balance: 5871.41, status: 'pending',   reference: 'TRF-20260328' },
  { id: 'txn-009', accountId: 'acc-002', date: '2026-04-02T12:00:00Z', description: 'Transfer from Checking',     category: 'transfer',    type: 'credit', amount: 500.00,  balance: 24750.00, status: 'completed', reference: 'TRF-20260402' },
  { id: 'txn-010', accountId: 'acc-002', date: '2026-03-01T09:00:00Z', description: 'Interest Earned',            category: 'deposit',     type: 'credit', amount: 41.25,   balance: 24250.00, status: 'completed' },

  // ── James Wilson (acc-003 current, acc-004 savings) — GBP ───────────────────
  { id: 'txn-011', accountId: 'acc-003', date: '2026-04-05T09:00:00Z', description: 'BACS Salary – Hartley & Co', category: 'salary',      type: 'credit', amount: 2800.00, balance: 12845.00, status: 'completed', reference: 'PAY-20260405' },
  { id: 'txn-012', accountId: 'acc-003', date: '2026-04-04T11:30:00Z', description: 'Tesco Supermarket',          category: 'groceries',   type: 'debit',  amount: 67.50,   balance: 10045.00, status: 'completed' },
  { id: 'txn-013', accountId: 'acc-003', date: '2026-04-03T08:00:00Z', description: 'BT Broadband',               category: 'utilities',   type: 'debit',  amount: 35.00,   balance: 10112.50, status: 'completed' },
  { id: 'txn-014', accountId: 'acc-003', date: '2026-04-02T13:00:00Z', description: 'Transfer to Savings',        category: 'transfer',    type: 'debit',  amount: 500.00,  balance: 10147.50, status: 'completed', reference: 'TRF-20260402' },
  { id: 'txn-015', accountId: 'acc-003', date: '2026-04-01T15:45:00Z', description: 'Marks & Spencer',            category: 'shopping',    type: 'debit',  amount: 89.99,   balance: 10647.50, status: 'completed' },
  { id: 'txn-016', accountId: 'acc-003', date: '2026-03-31T19:00:00Z', description: "Nando's Restaurant",         category: 'dining',      type: 'debit',  amount: 38.50,   balance: 10737.49, status: 'pending' },
  { id: 'txn-017', accountId: 'acc-003', date: '2026-03-30T10:00:00Z', description: 'British Gas',                category: 'utilities',   type: 'debit',  amount: 112.00,  balance: 10775.99, status: 'completed' },
  { id: 'txn-018', accountId: 'acc-004', date: '2026-04-02T13:00:00Z', description: 'Transfer from Current',      category: 'transfer',    type: 'credit', amount: 500.00,  balance: 31200.00, status: 'completed', reference: 'TRF-20260402' },
  { id: 'txn-019', accountId: 'acc-004', date: '2026-03-01T09:00:00Z', description: 'Interest Earned',            category: 'deposit',     type: 'credit', amount: 23.40,   balance: 30700.00, status: 'completed' },

  // ── Priya Patel (acc-005 checking, acc-006 savings) — USD ────────────────────
  { id: 'txn-021', accountId: 'acc-005', date: '2026-04-05T10:00:00Z', description: 'Direct Deposit – Salary',    category: 'salary',      type: 'credit', amount: 3200.00, balance: 5280.00,  status: 'completed', reference: 'PAY-20260405' },
  { id: 'txn-022', accountId: 'acc-005', date: '2026-04-04T14:20:00Z', description: "Trader Joe's",               category: 'groceries',   type: 'debit',  amount: 92.30,   balance: 2080.00,  status: 'completed' },
  { id: 'txn-023', accountId: 'acc-005', date: '2026-04-03T08:00:00Z', description: 'PG&E Utilities',             category: 'utilities',   type: 'debit',  amount: 110.00,  balance: 2172.30,  status: 'completed' },
  { id: 'txn-024', accountId: 'acc-005', date: '2026-04-02T11:00:00Z', description: 'Transfer to Savings',        category: 'transfer',    type: 'debit',  amount: 400.00,  balance: 2282.30,  status: 'completed', reference: 'TRF-20260402' },
  { id: 'txn-025', accountId: 'acc-005', date: '2026-04-01T16:30:00Z', description: 'Target',                     category: 'shopping',    type: 'debit',  amount: 155.40,  balance: 2682.30,  status: 'completed' },
  { id: 'txn-026', accountId: 'acc-005', date: '2026-03-31T18:45:00Z', description: 'Cheeseboard Pizza',          category: 'dining',      type: 'debit',  amount: 42.00,   balance: 2837.70,  status: 'pending' },
  { id: 'txn-027', accountId: 'acc-005', date: '2026-03-30T09:00:00Z', description: 'Comcast Internet',           category: 'utilities',   type: 'debit',  amount: 89.99,   balance: 2879.70,  status: 'completed' },
  { id: 'txn-028', accountId: 'acc-005', date: '2026-03-28T17:00:00Z', description: 'Venmo Payment Received',     category: 'transfer',    type: 'credit', amount: 250.00,  balance: 2969.69,  status: 'failed',    reference: 'VNM-20260328' },
  { id: 'txn-029', accountId: 'acc-006', date: '2026-03-01T09:00:00Z', description: 'Interest Earned',            category: 'deposit',     type: 'credit', amount: 31.60,   balance: 18960.00, status: 'completed' },
  { id: 'txn-030', accountId: 'acc-006', date: '2026-04-02T11:00:00Z', description: 'Transfer from Checking',     category: 'transfer',    type: 'credit', amount: 400.00,  balance: 18928.40, status: 'completed', reference: 'TRF-20260402' },
];

// ── Lookup helpers ─────────────────────────────────────────────────────────────
export function getUserById(id: string): User | undefined {
  return MOCK_USERS.find(u => u.id === id);
}

export function getUserByEmail(email: string): User | undefined {
  return MOCK_USERS.find(u => u.email === email);
}

export function getManagerForUser(userId: string): User | undefined {
  return MOCK_USERS.find(u => u.role === 'account_manager' && u.managedUserIds?.includes(userId));
}

export function getAccountsByUserId(userId: string): Account[] {
  return MOCK_ACCOUNTS.filter(a => a.userId === userId);
}

// ── Bill Pay ───────────────────────────────────────────────────────────────────
export const MOCK_BILLERS: Biller[] = [
  { id: 'blr-001', name: 'ConEd Electric',   category: 'utilities',    logoIcon: 'bolt',        accountNumber: 'CONED-8821',  defaultAmount: 142,   autopay: true,  autopayDay: 5 },
  { id: 'blr-002', name: 'Netflix',          category: 'subscription', logoIcon: 'tv',          accountNumber: 'NFL-4423991', defaultAmount: 15.99, autopay: true,  autopayDay: 3 },
  { id: 'blr-003', name: 'State Farm',       category: 'insurance',    logoIcon: 'shield',      accountNumber: 'SF-00192831', defaultAmount: 210,   autopay: false              },
  { id: 'blr-004', name: 'Chase Sapphire',   category: 'credit_card',  logoIcon: 'credit_card', accountNumber: '****7732',    defaultAmount: 0,     autopay: false              },
  { id: 'blr-005', name: 'NYC Water Board',  category: 'utilities',    logoIcon: 'water_drop',  accountNumber: 'NYC-WB-5541', defaultAmount: 55,    autopay: false              },
  { id: 'blr-006', name: 'Verizon',          category: 'phone',        logoIcon: 'phone_iphone', accountNumber: 'VZN-9912',   defaultAmount: 85,    autopay: true,  autopayDay: 12 },
];

export const MOCK_BILL_PAYMENTS: BillPayment[] = [
  { id: 'bp-001', billerId: 'blr-001', billerName: 'ConEd Electric',  fromAccountId: 'acc-001', amount: 142.00, scheduledDate: '2026-04-05T00:00:00Z', paidDate: '2026-04-05T08:00:00Z', status: 'paid',      confirmationCode: 'CONED-20260405' },
  { id: 'bp-002', billerId: 'blr-002', billerName: 'Netflix',         fromAccountId: 'acc-001', amount: 15.99,  scheduledDate: '2026-04-03T00:00:00Z', paidDate: '2026-04-03T06:00:00Z', status: 'paid',      confirmationCode: 'NFL-20260403'   },
  { id: 'bp-003', billerId: 'blr-003', billerName: 'State Farm',      fromAccountId: 'acc-001', amount: 210.00, scheduledDate: '2026-04-20T00:00:00Z',                                   status: 'scheduled'                                         },
  { id: 'bp-004', billerId: 'blr-006', billerName: 'Verizon',         fromAccountId: 'acc-001', amount: 85.00,  scheduledDate: '2026-04-12T00:00:00Z',                                   status: 'scheduled'                                         },
  { id: 'bp-005', billerId: 'blr-001', billerName: 'ConEd Electric',  fromAccountId: 'acc-001', amount: 136.00, scheduledDate: '2026-03-05T00:00:00Z', paidDate: '2026-03-05T08:00:00Z', status: 'paid',      confirmationCode: 'CONED-20260305' },
  { id: 'bp-006', billerId: 'blr-004', billerName: 'Chase Sapphire',  fromAccountId: 'acc-001', amount: 450.00, scheduledDate: '2026-03-20T00:00:00Z', paidDate: '2026-03-20T10:00:00Z', status: 'paid',      confirmationCode: 'CHASE-20260320' },
  { id: 'bp-007', billerId: 'blr-005', billerName: 'NYC Water Board', fromAccountId: 'acc-001', amount: 55.00,  scheduledDate: '2026-03-15T00:00:00Z', paidDate: '2026-03-15T09:00:00Z', status: 'paid',      confirmationCode: 'NYCWB-20260315' },
];

// ── Cards ──────────────────────────────────────────────────────────────────────
export const MOCK_CARDS: DebitCard[] = [
  { id: 'card-001', userId: 'user-001', accountId: 'acc-001', last4: '4521', network: 'Visa',       expiryMonth: 9,  expiryYear: 2028, cardholderName: 'MARCUS REYNOLDS', status: 'active', dailyLimit: 2500, atmLimit: 1000, onlineTransactionsEnabled: true,  internationalTransactionsEnabled: false, contactlessEnabled: true,  issuedAt: '2023-01-15T00:00:00Z' },
  { id: 'card-002', userId: 'user-002', accountId: 'acc-003', last4: '2847', network: 'Mastercard', expiryMonth: 6,  expiryYear: 2027, cardholderName: 'SOPHIE HARTLEY',  status: 'active', dailyLimit: 2000, atmLimit: 500,  onlineTransactionsEnabled: true,  internationalTransactionsEnabled: true,  contactlessEnabled: true,  issuedAt: '2023-03-20T00:00:00Z' },
  { id: 'card-003', userId: 'user-003', accountId: 'acc-005', last4: '9034', network: 'Visa',       expiryMonth: 12, expiryYear: 2026, cardholderName: 'ELENA VASQUEZ',   status: 'active', dailyLimit: 1500, atmLimit: 500,  onlineTransactionsEnabled: true,  internationalTransactionsEnabled: false, contactlessEnabled: false, issuedAt: '2023-06-10T00:00:00Z' },
];

// ── Statements ─────────────────────────────────────────────────────────────────
export const MOCK_STATEMENTS: Statement[] = [
  { id: 'stmt-001', accountId: 'acc-001', month: 3,  year: 2026, openingBalance: 5200.00, closingBalance: 8432.50, totalCredits: 3700.00, totalDebits:  467.50, transactionCount: 14, generatedAt: '2026-04-01T00:00:00Z', pdfSize: '312 KB' },
  { id: 'stmt-002', accountId: 'acc-001', month: 2,  year: 2026, openingBalance: 4800.00, closingBalance: 5200.00, totalCredits: 3500.00, totalDebits: 3100.00, transactionCount: 18, generatedAt: '2026-03-01T00:00:00Z', pdfSize: '298 KB' },
  { id: 'stmt-003', accountId: 'acc-001', month: 1,  year: 2026, openingBalance: 4200.00, closingBalance: 4800.00, totalCredits: 3500.00, totalDebits: 2900.00, transactionCount: 16, generatedAt: '2026-02-01T00:00:00Z', pdfSize: '284 KB' },
  { id: 'stmt-004', accountId: 'acc-001', month: 12, year: 2025, openingBalance: 3900.00, closingBalance: 4200.00, totalCredits: 3800.00, totalDebits: 3500.00, transactionCount: 22, generatedAt: '2026-01-01T00:00:00Z', pdfSize: '341 KB' },
  { id: 'stmt-005', accountId: 'acc-001', month: 11, year: 2025, openingBalance: 3500.00, closingBalance: 3900.00, totalCredits: 3500.00, totalDebits: 3100.00, transactionCount: 19, generatedAt: '2025-12-01T00:00:00Z', pdfSize: '276 KB' },
  { id: 'stmt-006', accountId: 'acc-001', month: 10, year: 2025, openingBalance: 3100.00, closingBalance: 3500.00, totalCredits: 3500.00, totalDebits: 3100.00, transactionCount: 17, generatedAt: '2025-11-01T00:00:00Z', pdfSize: '261 KB' },
  { id: 'stmt-007', accountId: 'acc-002', month: 3,  year: 2026, openingBalance: 23000.00, closingBalance: 24750.00, totalCredits: 2000.00, totalDebits: 250.00, transactionCount: 4, generatedAt: '2026-04-01T00:00:00Z', pdfSize: '189 KB' },
  { id: 'stmt-008', accountId: 'acc-002', month: 2,  year: 2026, openingBalance: 21500.00, closingBalance: 23000.00, totalCredits: 1750.00, totalDebits: 250.00, transactionCount: 3, generatedAt: '2026-03-01T00:00:00Z', pdfSize: '176 KB' },
];

// ── Savings Goals ──────────────────────────────────────────────────────────────
export const MOCK_GOALS: SavingsGoal[] = [
  { id: 'goal-001', userId: 'user-001', name: 'Emergency Fund',       targetAmount: 15000, currentAmount: 8432,  linkedAccountId: 'acc-002', targetDate: '2026-12-31', status: 'active',    icon: 'shield',         color: '#15803d', createdAt: '2025-01-01T00:00:00Z', autoContribute: true,  monthlyContribution: 500 },
  { id: 'goal-002', userId: 'user-001', name: 'Vacation to Hawaii',  targetAmount: 5000,  currentAmount: 2250,  linkedAccountId: 'acc-002', targetDate: '2026-09-01', status: 'active',    icon: 'flight_takeoff', color: '#0891b2', createdAt: '2025-06-15T00:00:00Z', autoContribute: true,  monthlyContribution: 250 },
  { id: 'goal-003', userId: 'user-001', name: 'New Laptop',          targetAmount: 2000,  currentAmount: 2000,  linkedAccountId: 'acc-002', targetDate: '2026-03-01', status: 'completed', icon: 'laptop',         color: '#8b5cf6', createdAt: '2025-09-01T00:00:00Z', autoContribute: false                           },
  { id: 'goal-004', userId: 'user-002', name: 'House Deposit',       targetAmount: 50000, currentAmount: 12000, linkedAccountId: 'acc-004', targetDate: '2028-06-01', status: 'active',    icon: 'home',           color: '#CC0000', createdAt: '2024-01-01T00:00:00Z', autoContribute: true,  monthlyContribution: 1000 },
];

// ── Beneficiaries ──────────────────────────────────────────────────────────────
export const MOCK_BENEFICIARIES: Beneficiary[] = [
  { id: 'ben-001', userId: 'user-001', nickname: 'My Savings',        type: 'internal', toAccountId: 'acc-002',                                                                          createdAt: '2023-02-01T00:00:00Z', lastUsed: '2026-04-02T12:00:00Z' },
  { id: 'ben-002', userId: 'user-001', nickname: 'Mom',               type: 'external', recipientName: 'Patricia Reynolds', routingNumber: '021000021', accountNumber: '****5678', bankName: 'Chase Bank',    createdAt: '2023-05-10T00:00:00Z', lastUsed: '2026-03-15T00:00:00Z' },
  { id: 'ben-003', userId: 'user-001', nickname: 'Rent – Lexington',  type: 'external', recipientName: 'Lexington Properties LLC', routingNumber: '026009593', accountNumber: '****3311', bankName: 'Citibank', createdAt: '2023-01-20T00:00:00Z', lastUsed: '2026-04-01T09:00:00Z' },
  { id: 'ben-004', userId: 'user-002', nickname: 'My Savings',        type: 'internal', toAccountId: 'acc-004',                                                                          createdAt: '2023-04-01T00:00:00Z', lastUsed: '2026-03-28T10:00:00Z' },
];

// ── Disputes ───────────────────────────────────────────────────────────────────
export const MOCK_DISPUTES: Dispute[] = [];

// ── Account Alerts ─────────────────────────────────────────────────────────────
export const MOCK_ALERTS: AccountAlert[] = [
  { id: 'alt-001', userId: 'user-001', trigger: 'large_transaction', label: 'Large Transaction',  description: 'Alert when a single transaction exceeds your threshold', enabled: true,  channels: ['email', 'sms'], threshold: 500  },
  { id: 'alt-002', userId: 'user-001', trigger: 'low_balance',       label: 'Low Balance',        description: 'Alert when your checking balance drops below threshold',  enabled: true,  channels: ['email', 'sms'], threshold: 1000 },
  { id: 'alt-003', userId: 'user-001', trigger: 'card_used',         label: 'Card Used',          description: 'Alert on every debit card transaction',                  enabled: false, channels: ['email']                         },
  { id: 'alt-004', userId: 'user-001', trigger: 'login',             label: 'New Login',          description: 'Alert every time your account is accessed',             enabled: true,  channels: ['email']                         },
  { id: 'alt-005', userId: 'user-001', trigger: 'direct_deposit',    label: 'Direct Deposit',     description: 'Alert when a direct deposit is received',               enabled: true,  channels: ['email', 'sms']                  },
  { id: 'alt-006', userId: 'user-001', trigger: 'transfer_sent',     label: 'Transfer Sent',      description: 'Alert when an outgoing transfer is completed',          enabled: false, channels: ['sms']                           },
  { id: 'alt-007', userId: 'user-002', trigger: 'large_transaction', label: 'Large Transaction',  description: 'Alert when a single transaction exceeds your threshold', enabled: true,  channels: ['email'],        threshold: 300  },
  { id: 'alt-008', userId: 'user-002', trigger: 'low_balance',       label: 'Low Balance',        description: 'Alert when your checking balance drops below threshold',  enabled: true,  channels: ['email', 'sms'], threshold: 500  },
  { id: 'alt-009', userId: 'user-002', trigger: 'login',             label: 'New Login',          description: 'Alert every time your account is accessed',             enabled: true,  channels: ['email']                         },
  { id: 'alt-010', userId: 'user-002', trigger: 'direct_deposit',    label: 'Direct Deposit',     description: 'Alert when a direct deposit is received',               enabled: false, channels: ['email']                         },
  { id: 'alt-011', userId: 'user-003', trigger: 'large_transaction', label: 'Large Transaction',  description: 'Alert when a single transaction exceeds your threshold', enabled: false, channels: ['email'],        threshold: 200  },
  { id: 'alt-012', userId: 'user-003', trigger: 'low_balance',       label: 'Low Balance',        description: 'Alert when your checking balance drops below threshold',  enabled: true,  channels: ['sms'],          threshold: 200  },
];
