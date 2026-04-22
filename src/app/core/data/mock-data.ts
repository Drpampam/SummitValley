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
  'svb-daniel-roland@mailinator.com':   'Daniel@123',
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
    email: 'svb-daniel-roland@mailinator.com',
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

  // ══════════════════════════════════════════════════════════════════════════════
  // Marcus Reynolds — acc-001 (Checking, USD)  |  acc-002 (Savings, USD)
  // ══════════════════════════════════════════════════════════════════════════════

  // — 2026 —
  { id: 'txn-001', accountId: 'acc-001', date: '2026-04-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3500.00, balance: 8432.50,  status: 'completed', reference: 'PAY-20260405' },
  { id: 'txn-002', accountId: 'acc-001', date: '2026-04-04T10:15:00Z', description: 'Whole Foods Market',         category: 'groceries', type: 'debit',  amount:   87.43, balance: 4932.50,  status: 'completed' },
  { id: 'txn-003', accountId: 'acc-001', date: '2026-04-03T19:45:00Z', description: 'Netflix Subscription',       category: 'utilities', type: 'debit',  amount:   15.99, balance: 5019.93,  status: 'completed' },
  { id: 'txn-004', accountId: 'acc-001', date: '2026-04-02T12:00:00Z', description: 'Transfer to Savings',        category: 'transfer',  type: 'debit',  amount:  500.00, balance: 5035.92,  status: 'completed', reference: 'TRF-20260402' },
  { id: 'txn-005', accountId: 'acc-001', date: '2026-04-01T08:30:00Z', description: 'Amazon.com',                 category: 'shopping',  type: 'debit',  amount:  124.99, balance: 5535.92,  status: 'completed' },
  { id: 'txn-006', accountId: 'acc-001', date: '2026-03-31T20:15:00Z', description: 'The Cheesecake Factory',     category: 'dining',    type: 'debit',  amount:   68.50, balance: 5660.91,  status: 'completed' },
  { id: 'txn-007', accountId: 'acc-001', date: '2026-03-30T09:00:00Z', description: 'Electric Bill – ConEd',      category: 'utilities', type: 'debit',  amount:  142.00, balance: 5729.41,  status: 'completed' },
  { id: 'txn-008', accountId: 'acc-001', date: '2026-03-28T14:00:00Z', description: 'Online Transfer Received',   category: 'transfer',  type: 'credit', amount:  200.00, balance: 5871.41,  status: 'pending',   reference: 'TRF-20260328' },
  { id: 'txn-m01', accountId: 'acc-001', date: '2026-03-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3500.00, balance: 5671.41,  status: 'completed', reference: 'PAY-20260305' },
  { id: 'txn-m02', accountId: 'acc-001', date: '2026-03-03T11:00:00Z', description: 'Whole Foods Market',         category: 'groceries', type: 'debit',  amount:   94.80, balance: 2171.41,  status: 'completed' },
  { id: 'txn-m03', accountId: 'acc-001', date: '2026-03-02T08:30:00Z', description: 'Verizon Wireless',           category: 'utilities', type: 'debit',  amount:   85.00, balance: 2266.21,  status: 'completed' },
  { id: 'txn-m04', accountId: 'acc-001', date: '2026-02-28T12:00:00Z', description: 'Transfer to Savings',        category: 'transfer',  type: 'debit',  amount:  500.00, balance: 2351.21,  status: 'completed', reference: 'TRF-20260228' },
  { id: 'txn-m05', accountId: 'acc-001', date: '2026-02-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3500.00, balance: 2851.21,  status: 'completed', reference: 'PAY-20260205' },
  { id: 'txn-m06', accountId: 'acc-001', date: '2026-02-04T17:20:00Z', description: 'Amazon.com',                 category: 'shopping',  type: 'debit',  amount:  198.50, balance: 2034.90,  status: 'completed' },
  { id: 'txn-m07', accountId: 'acc-001', date: '2026-02-02T09:15:00Z', description: 'Electric Bill – ConEd',      category: 'utilities', type: 'debit',  amount:  138.00, balance: 2233.40,  status: 'completed' },
  { id: 'txn-m08', accountId: 'acc-001', date: '2026-01-06T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3500.00, balance: 2371.40,  status: 'completed', reference: 'PAY-20260106' },
  { id: 'txn-m09', accountId: 'acc-001', date: '2026-01-04T10:00:00Z', description: 'State Farm – Auto Insurance',category: 'payment',   type: 'debit',  amount:  210.00, balance: 1857.80,  status: 'completed' },
  { id: 'txn-m10', accountId: 'acc-001', date: '2026-01-03T13:45:00Z', description: 'Whole Foods Market',         category: 'groceries', type: 'debit',  amount:   88.60, balance: 2067.80,  status: 'completed' },

  // — 2025 —
  { id: 'txn-m11', accountId: 'acc-001', date: '2025-12-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3400.00, balance: 7220.40,  status: 'completed', reference: 'PAY-20251205' },
  { id: 'txn-m12', accountId: 'acc-001', date: '2025-12-03T15:30:00Z', description: "Macy's – Holiday Shopping",  category: 'shopping',  type: 'debit',  amount:  312.50, balance: 3820.40,  status: 'completed' },
  { id: 'txn-m13', accountId: 'acc-001', date: '2025-12-01T09:00:00Z', description: 'Electric Bill – ConEd',      category: 'utilities', type: 'debit',  amount:  165.00, balance: 4132.90,  status: 'completed' },
  { id: 'txn-m14', accountId: 'acc-001', date: '2025-11-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3400.00, balance: 4297.90,  status: 'completed', reference: 'PAY-20251105' },
  { id: 'txn-m15', accountId: 'acc-001', date: '2025-11-28T11:00:00Z', description: 'Amazon – Black Friday',      category: 'shopping',  type: 'debit',  amount:  245.99, balance: 3282.30,  status: 'completed' },
  { id: 'txn-m16', accountId: 'acc-001', date: '2025-11-04T17:00:00Z', description: 'Whole Foods Market',         category: 'groceries', type: 'debit',  amount:   88.30, balance: 3528.29,  status: 'completed' },
  { id: 'txn-m17', accountId: 'acc-001', date: '2025-10-06T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3400.00, balance: 3616.59,  status: 'completed', reference: 'PAY-20251006' },
  { id: 'txn-m18', accountId: 'acc-001', date: '2025-10-05T10:00:00Z', description: 'State Farm – Auto Insurance',category: 'payment',   type: 'debit',  amount:  210.00, balance: 2190.09,  status: 'completed' },
  { id: 'txn-m19', accountId: 'acc-001', date: '2025-10-02T09:00:00Z', description: 'Electric Bill – ConEd',      category: 'utilities', type: 'debit',  amount:  151.00, balance: 2400.09,  status: 'completed' },
  { id: 'txn-m20', accountId: 'acc-001', date: '2025-09-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3400.00, balance: 2551.09,  status: 'completed', reference: 'PAY-20250905' },
  { id: 'txn-m21', accountId: 'acc-001', date: '2025-09-12T14:00:00Z', description: 'Amazon.com',                 category: 'shopping',  type: 'debit',  amount:   76.40, balance: 2174.69,  status: 'completed' },
  { id: 'txn-m22', accountId: 'acc-001', date: '2025-08-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3400.00, balance: 2251.09,  status: 'completed', reference: 'PAY-20250805' },
  { id: 'txn-m23', accountId: 'acc-001', date: '2025-08-10T19:30:00Z', description: 'The Cheesecake Factory',     category: 'dining',    type: 'debit',  amount:   89.00, balance: 1940.19,  status: 'completed' },
  { id: 'txn-m24', accountId: 'acc-001', date: '2025-07-07T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3400.00, balance: 2029.19,  status: 'completed', reference: 'PAY-20250707' },
  { id: 'txn-m25', accountId: 'acc-001', date: '2025-07-04T13:00:00Z', description: 'Best Buy',                   category: 'shopping',  type: 'debit',  amount:  450.00, balance: 1874.99,  status: 'completed' },
  { id: 'txn-m26', accountId: 'acc-001', date: '2025-06-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3400.00, balance: 2324.99,  status: 'completed', reference: 'PAY-20250605' },
  { id: 'txn-m27', accountId: 'acc-001', date: '2025-06-14T10:00:00Z', description: 'Whole Foods Market',         category: 'groceries', type: 'debit',  amount:   91.20, balance: 1624.99,  status: 'completed' },
  { id: 'txn-m28', accountId: 'acc-001', date: '2025-05-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3400.00, balance: 1716.19,  status: 'completed', reference: 'PAY-20250505' },
  { id: 'txn-m29', accountId: 'acc-001', date: '2025-04-06T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3400.00, balance: 1932.10,  status: 'completed', reference: 'PAY-20250406' },
  { id: 'txn-m30', accountId: 'acc-001', date: '2025-04-15T09:00:00Z', description: 'H&R Block – Tax Preparation', category: 'payment',  type: 'debit',  amount:  195.00, balance: 1737.10,  status: 'completed' },
  { id: 'txn-m31', accountId: 'acc-001', date: '2025-03-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3400.00, balance: 1932.10,  status: 'completed', reference: 'PAY-20250305' },
  { id: 'txn-m32', accountId: 'acc-001', date: '2025-02-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3400.00, balance: 1620.00,  status: 'completed', reference: 'PAY-20250205' },
  { id: 'txn-m33', accountId: 'acc-001', date: '2025-01-06T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3400.00, balance: 1380.50,  status: 'completed', reference: 'PAY-20250106' },

  // — 2024 —
  { id: 'txn-m34', accountId: 'acc-001', date: '2024-12-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3200.00, balance: 6510.20,  status: 'completed', reference: 'PAY-20241205' },
  { id: 'txn-m35', accountId: 'acc-001', date: '2024-12-02T14:00:00Z', description: 'Nordstrom – Holiday',        category: 'shopping',  type: 'debit',  amount:  380.00, balance: 3310.20,  status: 'completed' },
  { id: 'txn-m36', accountId: 'acc-001', date: '2024-11-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3200.00, balance: 3690.20,  status: 'completed', reference: 'PAY-20241105' },
  { id: 'txn-m37', accountId: 'acc-001', date: '2024-10-07T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3200.00, balance: 3280.40,  status: 'completed', reference: 'PAY-20241007' },
  { id: 'txn-m38', accountId: 'acc-001', date: '2024-09-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3200.00, balance: 3010.80,  status: 'completed', reference: 'PAY-20240905' },
  { id: 'txn-m39', accountId: 'acc-001', date: '2024-08-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3200.00, balance: 2740.20,  status: 'completed', reference: 'PAY-20240805' },
  { id: 'txn-m40', accountId: 'acc-001', date: '2024-07-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3200.00, balance: 2560.50,  status: 'completed', reference: 'PAY-20240705' },
  { id: 'txn-m41', accountId: 'acc-001', date: '2024-07-10T11:00:00Z', description: 'Home Depot',                 category: 'shopping',  type: 'debit',  amount:  234.50, balance: 1812.80,  status: 'completed' },
  { id: 'txn-m42', accountId: 'acc-001', date: '2024-06-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3200.00, balance: 2047.30,  status: 'completed', reference: 'PAY-20240605' },
  { id: 'txn-m43', accountId: 'acc-001', date: '2024-05-06T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3200.00, balance: 1896.50,  status: 'completed', reference: 'PAY-20240506' },
  { id: 'txn-m44', accountId: 'acc-001', date: '2024-04-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3200.00, balance: 1743.10,  status: 'completed', reference: 'PAY-20240405' },
  { id: 'txn-m45', accountId: 'acc-001', date: '2024-03-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3200.00, balance: 1590.40,  status: 'completed', reference: 'PAY-20240305' },
  { id: 'txn-m46', accountId: 'acc-001', date: '2024-02-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3200.00, balance: 1438.10,  status: 'completed', reference: 'PAY-20240205' },
  { id: 'txn-m47', accountId: 'acc-001', date: '2024-01-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 3200.00, balance: 1285.80,  status: 'completed', reference: 'PAY-20240105' },

  // — 2023 —
  { id: 'txn-m48', accountId: 'acc-001', date: '2023-12-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 2800.00, balance: 3810.40,  status: 'completed', reference: 'PAY-20231205' },
  { id: 'txn-m49', accountId: 'acc-001', date: '2023-11-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 2800.00, balance: 3240.30,  status: 'completed', reference: 'PAY-20231105' },
  { id: 'txn-m50', accountId: 'acc-001', date: '2023-10-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 2800.00, balance: 2810.20,  status: 'completed', reference: 'PAY-20231005' },
  { id: 'txn-m51', accountId: 'acc-001', date: '2023-09-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 2800.00, balance: 2490.10,  status: 'completed', reference: 'PAY-20230905' },
  { id: 'txn-m52', accountId: 'acc-001', date: '2023-08-07T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 2800.00, balance: 2210.50,  status: 'completed', reference: 'PAY-20230807' },
  { id: 'txn-m53', accountId: 'acc-001', date: '2023-07-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 2800.00, balance: 1980.30,  status: 'completed', reference: 'PAY-20230705' },
  { id: 'txn-m54', accountId: 'acc-001', date: '2023-06-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 2800.00, balance: 1720.40,  status: 'completed', reference: 'PAY-20230605' },
  { id: 'txn-m55', accountId: 'acc-001', date: '2023-05-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 2800.00, balance: 1480.60,  status: 'completed', reference: 'PAY-20230505' },
  { id: 'txn-m56', accountId: 'acc-001', date: '2023-04-05T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 2800.00, balance: 1220.80,  status: 'completed', reference: 'PAY-20230405' },
  { id: 'txn-m57', accountId: 'acc-001', date: '2023-03-06T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 2800.00, balance: 1020.50,  status: 'completed', reference: 'PAY-20230306' },
  { id: 'txn-m58', accountId: 'acc-001', date: '2023-02-06T14:30:00Z', description: 'Direct Deposit – Salary',    category: 'salary',    type: 'credit', amount: 2800.00, balance:  820.30,  status: 'completed', reference: 'PAY-20230206' },
  { id: 'txn-m59', accountId: 'acc-001', date: '2023-01-20T09:00:00Z', description: 'Account Opening Deposit',    category: 'deposit',   type: 'credit', amount: 1000.00, balance: 1000.00,  status: 'completed', reference: 'OPEN-20230115' },

  // acc-002 (Marcus Savings, USD)
  { id: 'txn-009', accountId: 'acc-002', date: '2026-04-02T12:00:00Z', description: 'Transfer from Checking',     category: 'transfer',  type: 'credit', amount:  500.00, balance: 24750.00, status: 'completed', reference: 'TRF-20260402' },
  { id: 'txn-010', accountId: 'acc-002', date: '2026-01-01T09:00:00Z', description: 'Interest Earned',            category: 'deposit',   type: 'credit', amount:   41.25, balance: 24250.00, status: 'completed' },
  { id: 'txn-s01', accountId: 'acc-002', date: '2025-10-01T09:00:00Z', description: 'Interest Earned',            category: 'deposit',   type: 'credit', amount:   38.90, balance: 23708.75, status: 'completed' },
  { id: 'txn-s02', accountId: 'acc-002', date: '2025-07-01T09:00:00Z', description: 'Interest Earned',            category: 'deposit',   type: 'credit', amount:   36.15, balance: 22869.85, status: 'completed' },
  { id: 'txn-s03', accountId: 'acc-002', date: '2025-04-01T09:00:00Z', description: 'Interest Earned',            category: 'deposit',   type: 'credit', amount:   33.40, balance: 21833.70, status: 'completed' },
  { id: 'txn-s04', accountId: 'acc-002', date: '2025-01-01T09:00:00Z', description: 'Interest Earned',            category: 'deposit',   type: 'credit', amount:   30.80, balance: 20800.30, status: 'completed' },
  { id: 'txn-s05', accountId: 'acc-002', date: '2024-10-01T09:00:00Z', description: 'Interest Earned',            category: 'deposit',   type: 'credit', amount:   28.50, balance: 19769.50, status: 'completed' },
  { id: 'txn-s06', accountId: 'acc-002', date: '2024-07-01T09:00:00Z', description: 'Interest Earned',            category: 'deposit',   type: 'credit', amount:   26.20, balance: 18741.00, status: 'completed' },
  { id: 'txn-s07', accountId: 'acc-002', date: '2024-04-01T09:00:00Z', description: 'Interest Earned',            category: 'deposit',   type: 'credit', amount:   24.10, balance: 17714.80, status: 'completed' },
  { id: 'txn-s08', accountId: 'acc-002', date: '2024-01-01T09:00:00Z', description: 'Interest Earned',            category: 'deposit',   type: 'credit', amount:   22.00, balance: 16690.70, status: 'completed' },
  { id: 'txn-s09', accountId: 'acc-002', date: '2023-10-01T09:00:00Z', description: 'Interest Earned',            category: 'deposit',   type: 'credit', amount:   18.80, balance: 14668.70, status: 'completed' },
  { id: 'txn-s10', accountId: 'acc-002', date: '2023-07-01T09:00:00Z', description: 'Interest Earned',            category: 'deposit',   type: 'credit', amount:   15.60, balance: 11649.90, status: 'completed' },
  { id: 'txn-s11', accountId: 'acc-002', date: '2023-04-01T09:00:00Z', description: 'Interest Earned',            category: 'deposit',   type: 'credit', amount:   12.30, balance:  8634.30, status: 'completed' },
  { id: 'txn-s12', accountId: 'acc-002', date: '2023-01-20T09:00:00Z', description: 'Account Opening Deposit',    category: 'deposit',   type: 'credit', amount: 5000.00, balance:  5000.00, status: 'completed', reference: 'OPEN-20230115' },

  // ══════════════════════════════════════════════════════════════════════════════
  // Sophie Hartley — acc-003 (Current/Checking, GBP)  |  acc-004 (Savings, GBP)
  // ══════════════════════════════════════════════════════════════════════════════

  // — 2026 —
  { id: 'txn-011', accountId: 'acc-003', date: '2026-04-05T09:00:00Z', description: 'BACS Salary – Hartley & Co',  category: 'salary',    type: 'credit', amount: 2800.00, balance: 12845.00, status: 'completed', reference: 'PAY-20260405' },
  { id: 'txn-012', accountId: 'acc-003', date: '2026-04-04T11:30:00Z', description: 'Tesco Supermarket',           category: 'groceries', type: 'debit',  amount:   67.50, balance: 10045.00, status: 'completed' },
  { id: 'txn-013', accountId: 'acc-003', date: '2026-04-03T08:00:00Z', description: 'BT Broadband',                category: 'utilities', type: 'debit',  amount:   35.00, balance: 10112.50, status: 'completed' },
  { id: 'txn-014', accountId: 'acc-003', date: '2026-04-02T13:00:00Z', description: 'Transfer to Savings',         category: 'transfer',  type: 'debit',  amount:  500.00, balance: 10147.50, status: 'completed', reference: 'TRF-20260402' },
  { id: 'txn-015', accountId: 'acc-003', date: '2026-04-01T15:45:00Z', description: 'Marks & Spencer',             category: 'shopping',  type: 'debit',  amount:   89.99, balance: 10647.50, status: 'completed' },
  { id: 'txn-016', accountId: 'acc-003', date: '2026-03-31T19:00:00Z', description: "Nando's Restaurant",          category: 'dining',    type: 'debit',  amount:   38.50, balance: 10737.49, status: 'pending' },
  { id: 'txn-017', accountId: 'acc-003', date: '2026-03-30T10:00:00Z', description: 'British Gas',                 category: 'utilities', type: 'debit',  amount:  112.00, balance: 10775.99, status: 'completed' },
  { id: 'txn-h01', accountId: 'acc-003', date: '2026-03-05T09:00:00Z', description: 'BACS Salary – Hartley & Co',  category: 'salary',    type: 'credit', amount: 2800.00, balance: 10887.99, status: 'completed', reference: 'PAY-20260305' },
  { id: 'txn-h02', accountId: 'acc-003', date: '2026-03-04T14:00:00Z', description: 'Waitrose Supermarket',        category: 'groceries', type: 'debit',  amount:   72.40, balance:  8087.99, status: 'completed' },
  { id: 'txn-h03', accountId: 'acc-003', date: '2026-02-28T10:00:00Z', description: 'Transfer to Savings',         category: 'transfer',  type: 'debit',  amount:  500.00, balance:  8160.39, status: 'completed', reference: 'TRF-20260228' },
  { id: 'txn-h04', accountId: 'acc-003', date: '2026-02-05T09:00:00Z', description: 'BACS Salary – Hartley & Co',  category: 'salary',    type: 'credit', amount: 2800.00, balance:  8660.39, status: 'completed', reference: 'PAY-20260205' },
  { id: 'txn-h05', accountId: 'acc-003', date: '2026-02-03T09:00:00Z', description: 'Sky TV & Broadband',          category: 'utilities', type: 'debit',  amount:   62.00, balance:  5860.39, status: 'completed' },
  { id: 'txn-h06', accountId: 'acc-003', date: '2026-01-06T09:00:00Z', description: 'BACS Salary – Hartley & Co',  category: 'salary',    type: 'credit', amount: 2800.00, balance:  5922.39, status: 'completed', reference: 'PAY-20260106' },
  { id: 'txn-h07', accountId: 'acc-003', date: '2026-01-04T12:00:00Z', description: 'John Lewis',                  category: 'shopping',  type: 'debit',  amount:  145.00, balance:  3122.39, status: 'completed' },

  // — 2025 —
  { id: 'txn-h08', accountId: 'acc-003', date: '2025-12-05T09:00:00Z', description: 'BACS Salary – Hartley & Co',  category: 'salary',    type: 'credit', amount: 2700.00, balance:  7410.00, status: 'completed', reference: 'PAY-20251205' },
  { id: 'txn-h09', accountId: 'acc-003', date: '2025-12-20T14:00:00Z', description: 'ASOS – Christmas Shopping',   category: 'shopping',  type: 'debit',  amount:  278.00, balance:  4710.00, status: 'completed' },
  { id: 'txn-h10', accountId: 'acc-003', date: '2025-11-05T09:00:00Z', description: 'BACS Salary – Hartley & Co',  category: 'salary',    type: 'credit', amount: 2700.00, balance:  4988.00, status: 'completed', reference: 'PAY-20251105' },
  { id: 'txn-h11', accountId: 'acc-003', date: '2025-10-06T09:00:00Z', description: 'BACS Salary – Hartley & Co',  category: 'salary',    type: 'credit', amount: 2700.00, balance:  4310.20, status: 'completed', reference: 'PAY-20251006' },
  { id: 'txn-h12', accountId: 'acc-003', date: '2025-09-05T09:00:00Z', description: 'BACS Salary – Hartley & Co',  category: 'salary',    type: 'credit', amount: 2700.00, balance:  3780.40, status: 'completed', reference: 'PAY-20250905' },
  { id: 'txn-h13', accountId: 'acc-003', date: '2025-08-05T09:00:00Z', description: 'BACS Salary – Hartley & Co',  category: 'salary',    type: 'credit', amount: 2700.00, balance:  3340.60, status: 'completed', reference: 'PAY-20250805' },
  { id: 'txn-h14', accountId: 'acc-003', date: '2025-07-07T09:00:00Z', description: 'BACS Salary – Hartley & Co',  category: 'salary',    type: 'credit', amount: 2700.00, balance:  2990.80, status: 'completed', reference: 'PAY-20250707' },
  { id: 'txn-h15', accountId: 'acc-003', date: '2025-06-05T09:00:00Z', description: 'BACS Salary – Hartley & Co',  category: 'salary',    type: 'credit', amount: 2700.00, balance:  2660.20, status: 'completed', reference: 'PAY-20250605' },
  { id: 'txn-h16', accountId: 'acc-003', date: '2025-05-06T09:00:00Z', description: 'BACS Salary – Hartley & Co',  category: 'salary',    type: 'credit', amount: 2700.00, balance:  2220.50, status: 'completed', reference: 'PAY-20250506' },
  { id: 'txn-h17', accountId: 'acc-003', date: '2025-04-05T09:00:00Z', description: 'BACS Salary – Hartley & Co',  category: 'salary',    type: 'credit', amount: 2700.00, balance:  1980.90, status: 'completed', reference: 'PAY-20250405' },
  { id: 'txn-h18', accountId: 'acc-003', date: '2025-03-05T09:00:00Z', description: 'BACS Salary – Hartley & Co',  category: 'salary',    type: 'credit', amount: 2700.00, balance:  1740.30, status: 'completed', reference: 'PAY-20250305' },
  { id: 'txn-h19', accountId: 'acc-003', date: '2025-02-05T09:00:00Z', description: 'BACS Salary – Hartley & Co',  category: 'salary',    type: 'credit', amount: 2700.00, balance:  1490.70, status: 'completed', reference: 'PAY-20250205' },
  { id: 'txn-h20', accountId: 'acc-003', date: '2025-01-06T09:00:00Z', description: 'BACS Salary – Hartley & Co',  category: 'salary',    type: 'credit', amount: 2700.00, balance:  1260.10, status: 'completed', reference: 'PAY-20250106' },

  // — 2024 —
  { id: 'txn-h21', accountId: 'acc-003', date: '2024-12-05T09:00:00Z', description: 'BACS Salary – Hartley & Co',  category: 'salary',    type: 'credit', amount: 2600.00, balance:  5180.40, status: 'completed', reference: 'PAY-20241205' },
  { id: 'txn-h22', accountId: 'acc-003', date: '2024-06-05T09:00:00Z', description: 'BACS Salary – Hartley & Co',  category: 'salary',    type: 'credit', amount: 2600.00, balance:  2890.20, status: 'completed', reference: 'PAY-20240605' },
  { id: 'txn-h23', accountId: 'acc-003', date: '2024-01-05T09:00:00Z', description: 'BACS Salary – Hartley & Co',  category: 'salary',    type: 'credit', amount: 2600.00, balance:  1640.10, status: 'completed', reference: 'PAY-20240105' },

  // — 2023 —
  { id: 'txn-h24', accountId: 'acc-003', date: '2023-12-05T09:00:00Z', description: 'BACS Salary – Hartley & Co',  category: 'salary',    type: 'credit', amount: 2400.00, balance:  3820.60, status: 'completed', reference: 'PAY-20231205' },
  { id: 'txn-h25', accountId: 'acc-003', date: '2023-09-05T09:00:00Z', description: 'BACS Salary – Hartley & Co',  category: 'salary',    type: 'credit', amount: 2400.00, balance:  2450.30, status: 'completed', reference: 'PAY-20230905' },
  { id: 'txn-h26', accountId: 'acc-003', date: '2023-06-05T09:00:00Z', description: 'BACS Salary – Hartley & Co',  category: 'salary',    type: 'credit', amount: 2400.00, balance:  1840.10, status: 'completed', reference: 'PAY-20230605' },
  { id: 'txn-h27', accountId: 'acc-003', date: '2023-03-25T09:00:00Z', description: 'Account Opening Deposit',     category: 'deposit',   type: 'credit', amount: 2000.00, balance:  2000.00, status: 'completed', reference: 'OPEN-20230320' },

  // acc-004 (Sophie Savings, GBP)
  { id: 'txn-018', accountId: 'acc-004', date: '2026-04-02T13:00:00Z', description: 'Transfer from Current',       category: 'transfer',  type: 'credit', amount:  500.00, balance: 31200.00, status: 'completed', reference: 'TRF-20260402' },
  { id: 'txn-019', accountId: 'acc-004', date: '2026-01-01T09:00:00Z', description: 'Interest Earned',             category: 'deposit',   type: 'credit', amount:   23.40, balance: 30700.00, status: 'completed' },
  { id: 'txn-p01', accountId: 'acc-004', date: '2025-10-01T09:00:00Z', description: 'Interest Earned',             category: 'deposit',   type: 'credit', amount:   21.80, balance: 29476.60, status: 'completed' },
  { id: 'txn-p02', accountId: 'acc-004', date: '2025-07-01T09:00:00Z', description: 'Interest Earned',             category: 'deposit',   type: 'credit', amount:   20.10, balance: 28254.80, status: 'completed' },
  { id: 'txn-p03', accountId: 'acc-004', date: '2025-04-01T09:00:00Z', description: 'Interest Earned',             category: 'deposit',   type: 'credit', amount:   18.50, balance: 27034.70, status: 'completed' },
  { id: 'txn-p04', accountId: 'acc-004', date: '2025-01-01T09:00:00Z', description: 'Interest Earned',             category: 'deposit',   type: 'credit', amount:   17.00, balance: 25816.20, status: 'completed' },
  { id: 'txn-p05', accountId: 'acc-004', date: '2024-10-01T09:00:00Z', description: 'Interest Earned',             category: 'deposit',   type: 'credit', amount:   15.60, balance: 24599.20, status: 'completed' },
  { id: 'txn-p06', accountId: 'acc-004', date: '2024-07-01T09:00:00Z', description: 'Interest Earned',             category: 'deposit',   type: 'credit', amount:   14.20, balance: 23383.60, status: 'completed' },
  { id: 'txn-p07', accountId: 'acc-004', date: '2024-04-01T09:00:00Z', description: 'Interest Earned',             category: 'deposit',   type: 'credit', amount:   12.90, balance: 22169.40, status: 'completed' },
  { id: 'txn-p08', accountId: 'acc-004', date: '2024-01-01T09:00:00Z', description: 'Interest Earned',             category: 'deposit',   type: 'credit', amount:   11.50, balance: 20956.50, status: 'completed' },
  { id: 'txn-p09', accountId: 'acc-004', date: '2023-10-01T09:00:00Z', description: 'Interest Earned',             category: 'deposit',   type: 'credit', amount:    9.80, balance: 18945.00, status: 'completed' },
  { id: 'txn-p10', accountId: 'acc-004', date: '2023-07-01T09:00:00Z', description: 'Interest Earned',             category: 'deposit',   type: 'credit', amount:    8.20, balance: 15935.20, status: 'completed' },
  { id: 'txn-p11', accountId: 'acc-004', date: '2023-04-05T09:00:00Z', description: 'Account Opening Deposit',     category: 'deposit',   type: 'credit', amount: 12000.00, balance: 12000.00, status: 'completed', reference: 'OPEN-20230320' },

  // ══════════════════════════════════════════════════════════════════════════════
  // Elena Vasquez — acc-005 (Checking, USD)  |  acc-006 (Savings, USD)
  // ══════════════════════════════════════════════════════════════════════════════

  // — 2026 —
  { id: 'txn-021', accountId: 'acc-005', date: '2026-04-05T10:00:00Z', description: 'Direct Deposit – Salary',     category: 'salary',    type: 'credit', amount: 3200.00, balance:  5280.00, status: 'completed', reference: 'PAY-20260405' },
  { id: 'txn-022', accountId: 'acc-005', date: '2026-04-04T14:20:00Z', description: "Trader Joe's",                category: 'groceries', type: 'debit',  amount:   92.30, balance:  2080.00, status: 'completed' },
  { id: 'txn-023', accountId: 'acc-005', date: '2026-04-03T08:00:00Z', description: 'PG&E Utilities',              category: 'utilities', type: 'debit',  amount:  110.00, balance:  2172.30, status: 'completed' },
  { id: 'txn-024', accountId: 'acc-005', date: '2026-04-02T11:00:00Z', description: 'Transfer to Savings',         category: 'transfer',  type: 'debit',  amount:  400.00, balance:  2282.30, status: 'completed', reference: 'TRF-20260402' },
  { id: 'txn-025', accountId: 'acc-005', date: '2026-04-01T16:30:00Z', description: 'Target',                      category: 'shopping',  type: 'debit',  amount:  155.40, balance:  2682.30, status: 'completed' },
  { id: 'txn-026', accountId: 'acc-005', date: '2026-03-31T18:45:00Z', description: 'Cheeseboard Pizza',           category: 'dining',    type: 'debit',  amount:   42.00, balance:  2837.70, status: 'pending' },
  { id: 'txn-027', accountId: 'acc-005', date: '2026-03-30T09:00:00Z', description: 'Comcast Internet',            category: 'utilities', type: 'debit',  amount:   89.99, balance:  2879.70, status: 'completed' },
  { id: 'txn-028', accountId: 'acc-005', date: '2026-03-28T17:00:00Z', description: 'Venmo Payment Received',      category: 'transfer',  type: 'credit', amount:  250.00, balance:  2969.69, status: 'failed',   reference: 'VNM-20260328' },
  { id: 'txn-e01', accountId: 'acc-005', date: '2026-03-05T10:00:00Z', description: 'Direct Deposit – Salary',     category: 'salary',    type: 'credit', amount: 3200.00, balance:  2719.69, status: 'completed', reference: 'PAY-20260305' },
  { id: 'txn-e02', accountId: 'acc-005', date: '2026-03-04T15:00:00Z', description: "Trader Joe's",                category: 'groceries', type: 'debit',  amount:   88.40, balance:  1886.29, status: 'completed' },
  { id: 'txn-e03', accountId: 'acc-005', date: '2026-02-28T10:00:00Z', description: 'Transfer to Savings',         category: 'transfer',  type: 'debit',  amount:  400.00, balance:  1974.69, status: 'completed', reference: 'TRF-20260228' },
  { id: 'txn-e04', accountId: 'acc-005', date: '2026-02-05T10:00:00Z', description: 'Direct Deposit – Salary',     category: 'salary',    type: 'credit', amount: 3200.00, balance:  2374.69, status: 'completed', reference: 'PAY-20260205' },
  { id: 'txn-e05', accountId: 'acc-005', date: '2026-02-03T08:00:00Z', description: 'PG&E Utilities',              category: 'utilities', type: 'debit',  amount:   98.50, balance:  1748.49, status: 'completed' },
  { id: 'txn-e06', accountId: 'acc-005', date: '2026-01-06T10:00:00Z', description: 'Direct Deposit – Salary',     category: 'salary',    type: 'credit', amount: 3200.00, balance:  1846.99, status: 'completed', reference: 'PAY-20260106' },
  { id: 'txn-e07', accountId: 'acc-005', date: '2026-01-04T13:00:00Z', description: 'Apple Store',                 category: 'shopping',  type: 'debit',  amount:  299.00, balance:  1647.99, status: 'completed' },

  // — 2025 —
  { id: 'txn-e08', accountId: 'acc-005', date: '2025-12-05T10:00:00Z', description: 'Direct Deposit – Salary',     category: 'salary',    type: 'credit', amount: 3100.00, balance:  6140.40, status: 'completed', reference: 'PAY-20251205' },
  { id: 'txn-e09', accountId: 'acc-005', date: '2025-12-22T12:00:00Z', description: 'Amazon – Holiday Shopping',   category: 'shopping',  type: 'debit',  amount:  320.80, balance:  2820.40, status: 'completed' },
  { id: 'txn-e10', accountId: 'acc-005', date: '2025-11-05T10:00:00Z', description: 'Direct Deposit – Salary',     category: 'salary',    type: 'credit', amount: 3100.00, balance:  3141.20, status: 'completed', reference: 'PAY-20251105' },
  { id: 'txn-e11', accountId: 'acc-005', date: '2025-10-06T10:00:00Z', description: 'Direct Deposit – Salary',     category: 'salary',    type: 'credit', amount: 3100.00, balance:  2840.60, status: 'completed', reference: 'PAY-20251006' },
  { id: 'txn-e12', accountId: 'acc-005', date: '2025-09-05T10:00:00Z', description: 'Direct Deposit – Salary',     category: 'salary',    type: 'credit', amount: 3100.00, balance:  2600.30, status: 'completed', reference: 'PAY-20250905' },
  { id: 'txn-e13', accountId: 'acc-005', date: '2025-08-05T10:00:00Z', description: 'Direct Deposit – Salary',     category: 'salary',    type: 'credit', amount: 3100.00, balance:  2360.00, status: 'completed', reference: 'PAY-20250805' },
  { id: 'txn-e14', accountId: 'acc-005', date: '2025-07-07T10:00:00Z', description: 'Direct Deposit – Salary',     category: 'salary',    type: 'credit', amount: 3100.00, balance:  2140.70, status: 'completed', reference: 'PAY-20250707' },
  { id: 'txn-e15', accountId: 'acc-005', date: '2025-06-05T10:00:00Z', description: 'Direct Deposit – Salary',     category: 'salary',    type: 'credit', amount: 3100.00, balance:  1930.40, status: 'completed', reference: 'PAY-20250605' },
  { id: 'txn-e16', accountId: 'acc-005', date: '2025-05-05T10:00:00Z', description: 'Direct Deposit – Salary',     category: 'salary',    type: 'credit', amount: 3100.00, balance:  1720.10, status: 'completed', reference: 'PAY-20250505' },
  { id: 'txn-e17', accountId: 'acc-005', date: '2025-04-06T10:00:00Z', description: 'Direct Deposit – Salary',     category: 'salary',    type: 'credit', amount: 3100.00, balance:  1540.80, status: 'completed', reference: 'PAY-20250406' },
  { id: 'txn-e18', accountId: 'acc-005', date: '2025-03-05T10:00:00Z', description: 'Direct Deposit – Salary',     category: 'salary',    type: 'credit', amount: 3100.00, balance:  1360.50, status: 'completed', reference: 'PAY-20250305' },
  { id: 'txn-e19', accountId: 'acc-005', date: '2025-02-05T10:00:00Z', description: 'Direct Deposit – Salary',     category: 'salary',    type: 'credit', amount: 3100.00, balance:  1190.20, status: 'completed', reference: 'PAY-20250205' },
  { id: 'txn-e20', accountId: 'acc-005', date: '2025-01-06T10:00:00Z', description: 'Direct Deposit – Salary',     category: 'salary',    type: 'credit', amount: 3100.00, balance:  1020.40, status: 'completed', reference: 'PAY-20250106' },

  // — 2024 —
  { id: 'txn-e21', accountId: 'acc-005', date: '2024-12-05T10:00:00Z', description: 'Direct Deposit – Salary',     category: 'salary',    type: 'credit', amount: 3000.00, balance:  4810.20, status: 'completed', reference: 'PAY-20241205' },
  { id: 'txn-e22', accountId: 'acc-005', date: '2024-06-05T10:00:00Z', description: 'Direct Deposit – Salary',     category: 'salary',    type: 'credit', amount: 3000.00, balance:  2610.10, status: 'completed', reference: 'PAY-20240605' },
  { id: 'txn-e23', accountId: 'acc-005', date: '2024-01-05T10:00:00Z', description: 'Direct Deposit – Salary',     category: 'salary',    type: 'credit', amount: 3000.00, balance:  1490.30, status: 'completed', reference: 'PAY-20240105' },

  // — 2023 —
  { id: 'txn-e24', accountId: 'acc-005', date: '2023-12-05T10:00:00Z', description: 'Direct Deposit – Salary',     category: 'salary',    type: 'credit', amount: 2800.00, balance:  3210.40, status: 'completed', reference: 'PAY-20231205' },
  { id: 'txn-e25', accountId: 'acc-005', date: '2023-09-05T10:00:00Z', description: 'Direct Deposit – Salary',     category: 'salary',    type: 'credit', amount: 2800.00, balance:  2180.30, status: 'completed', reference: 'PAY-20230905' },
  { id: 'txn-e26', accountId: 'acc-005', date: '2023-06-15T10:00:00Z', description: 'Account Opening Deposit',     category: 'deposit',   type: 'credit', amount: 1500.00, balance:  1500.00, status: 'completed', reference: 'OPEN-20230610' },

  // acc-006 (Elena Savings, USD)
  { id: 'txn-029', accountId: 'acc-006', date: '2026-01-01T09:00:00Z', description: 'Interest Earned',             category: 'deposit',   type: 'credit', amount:   31.60, balance: 18960.00, status: 'completed' },
  { id: 'txn-030', accountId: 'acc-006', date: '2026-04-02T11:00:00Z', description: 'Transfer from Checking',      category: 'transfer',  type: 'credit', amount:  400.00, balance: 18928.40, status: 'completed', reference: 'TRF-20260402' },
  { id: 'txn-q01', accountId: 'acc-006', date: '2025-10-01T09:00:00Z', description: 'Interest Earned',             category: 'deposit',   type: 'credit', amount:   29.20, balance: 17928.40, status: 'completed' },
  { id: 'txn-q02', accountId: 'acc-006', date: '2025-07-01T09:00:00Z', description: 'Interest Earned',             category: 'deposit',   type: 'credit', amount:   27.00, balance: 16899.20, status: 'completed' },
  { id: 'txn-q03', accountId: 'acc-006', date: '2025-04-01T09:00:00Z', description: 'Interest Earned',             category: 'deposit',   type: 'credit', amount:   24.80, balance: 15872.20, status: 'completed' },
  { id: 'txn-q04', accountId: 'acc-006', date: '2025-01-01T09:00:00Z', description: 'Interest Earned',             category: 'deposit',   type: 'credit', amount:   22.60, balance: 14847.40, status: 'completed' },
  { id: 'txn-q05', accountId: 'acc-006', date: '2024-10-01T09:00:00Z', description: 'Interest Earned',             category: 'deposit',   type: 'credit', amount:   20.50, balance: 13824.80, status: 'completed' },
  { id: 'txn-q06', accountId: 'acc-006', date: '2024-07-01T09:00:00Z', description: 'Interest Earned',             category: 'deposit',   type: 'credit', amount:   18.40, balance: 12804.30, status: 'completed' },
  { id: 'txn-q07', accountId: 'acc-006', date: '2024-04-01T09:00:00Z', description: 'Interest Earned',             category: 'deposit',   type: 'credit', amount:   16.30, balance: 11785.90, status: 'completed' },
  { id: 'txn-q08', accountId: 'acc-006', date: '2024-01-01T09:00:00Z', description: 'Interest Earned',             category: 'deposit',   type: 'credit', amount:   14.20, balance: 10769.60, status: 'completed' },
  { id: 'txn-q09', accountId: 'acc-006', date: '2023-10-01T09:00:00Z', description: 'Interest Earned',             category: 'deposit',   type: 'credit', amount:   12.10, balance:  9755.40, status: 'completed' },
  { id: 'txn-q10', accountId: 'acc-006', date: '2023-07-01T09:00:00Z', description: 'Interest Earned',             category: 'deposit',   type: 'credit', amount:   10.00, balance:  8743.30, status: 'completed' },
  { id: 'txn-q11', accountId: 'acc-006', date: '2023-06-15T09:00:00Z', description: 'Account Opening Deposit',     category: 'deposit',   type: 'credit', amount: 6000.00, balance:  6000.00, status: 'completed', reference: 'OPEN-20230610' },
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
  // — Upcoming / Scheduled —
  { id: 'bp-003', billerId: 'blr-003', billerName: 'State Farm',      fromAccountId: 'acc-001', amount: 210.00, scheduledDate: '2026-04-20T00:00:00Z',                                   status: 'scheduled'                                          },
  { id: 'bp-004', billerId: 'blr-006', billerName: 'Verizon',         fromAccountId: 'acc-001', amount:  85.00, scheduledDate: '2026-04-12T00:00:00Z',                                   status: 'scheduled'                                          },
  // — 2026 —
  { id: 'bp-001', billerId: 'blr-001', billerName: 'ConEd Electric',  fromAccountId: 'acc-001', amount: 142.00, scheduledDate: '2026-04-05T00:00:00Z', paidDate: '2026-04-05T08:00:00Z', status: 'paid', confirmationCode: 'CONED-20260405'  },
  { id: 'bp-002', billerId: 'blr-002', billerName: 'Netflix',         fromAccountId: 'acc-001', amount:  15.99, scheduledDate: '2026-04-03T00:00:00Z', paidDate: '2026-04-03T06:00:00Z', status: 'paid', confirmationCode: 'NFL-20260403'    },
  { id: 'bp-005', billerId: 'blr-001', billerName: 'ConEd Electric',  fromAccountId: 'acc-001', amount: 136.00, scheduledDate: '2026-03-05T00:00:00Z', paidDate: '2026-03-05T08:00:00Z', status: 'paid', confirmationCode: 'CONED-20260305'  },
  { id: 'bp-006', billerId: 'blr-004', billerName: 'Chase Sapphire',  fromAccountId: 'acc-001', amount: 450.00, scheduledDate: '2026-03-20T00:00:00Z', paidDate: '2026-03-20T10:00:00Z', status: 'paid', confirmationCode: 'CHASE-20260320'  },
  { id: 'bp-007', billerId: 'blr-005', billerName: 'NYC Water Board', fromAccountId: 'acc-001', amount:  55.00, scheduledDate: '2026-03-15T00:00:00Z', paidDate: '2026-03-15T09:00:00Z', status: 'paid', confirmationCode: 'NYCWB-20260315'  },
  { id: 'bp-008', billerId: 'blr-006', billerName: 'Verizon',         fromAccountId: 'acc-001', amount:  85.00, scheduledDate: '2026-03-12T00:00:00Z', paidDate: '2026-03-12T07:00:00Z', status: 'paid', confirmationCode: 'VZN-20260312'    },
  { id: 'bp-009', billerId: 'blr-002', billerName: 'Netflix',         fromAccountId: 'acc-001', amount:  15.99, scheduledDate: '2026-02-03T00:00:00Z', paidDate: '2026-02-03T06:00:00Z', status: 'paid', confirmationCode: 'NFL-20260203'    },
  { id: 'bp-010', billerId: 'blr-001', billerName: 'ConEd Electric',  fromAccountId: 'acc-001', amount: 128.00, scheduledDate: '2026-02-05T00:00:00Z', paidDate: '2026-02-05T08:00:00Z', status: 'paid', confirmationCode: 'CONED-20260205'  },
  { id: 'bp-011', billerId: 'blr-001', billerName: 'ConEd Electric',  fromAccountId: 'acc-001', amount: 119.00, scheduledDate: '2026-01-05T00:00:00Z', paidDate: '2026-01-05T08:00:00Z', status: 'paid', confirmationCode: 'CONED-20260105'  },
  { id: 'bp-012', billerId: 'blr-006', billerName: 'Verizon',         fromAccountId: 'acc-001', amount:  85.00, scheduledDate: '2026-01-12T00:00:00Z', paidDate: '2026-01-12T07:00:00Z', status: 'paid', confirmationCode: 'VZN-20260112'    },
  // — 2025 —
  { id: 'bp-013', billerId: 'blr-001', billerName: 'ConEd Electric',  fromAccountId: 'acc-001', amount: 165.00, scheduledDate: '2025-12-05T00:00:00Z', paidDate: '2025-12-05T08:00:00Z', status: 'paid', confirmationCode: 'CONED-20251205'  },
  { id: 'bp-014', billerId: 'blr-002', billerName: 'Netflix',         fromAccountId: 'acc-001', amount:  15.99, scheduledDate: '2025-12-03T00:00:00Z', paidDate: '2025-12-03T06:00:00Z', status: 'paid', confirmationCode: 'NFL-20251203'    },
  { id: 'bp-015', billerId: 'blr-003', billerName: 'State Farm',      fromAccountId: 'acc-001', amount: 210.00, scheduledDate: '2025-11-20T00:00:00Z', paidDate: '2025-11-20T10:00:00Z', status: 'paid', confirmationCode: 'SF-20251120'     },
  { id: 'bp-016', billerId: 'blr-001', billerName: 'ConEd Electric',  fromAccountId: 'acc-001', amount: 151.00, scheduledDate: '2025-10-05T00:00:00Z', paidDate: '2025-10-05T08:00:00Z', status: 'paid', confirmationCode: 'CONED-20251005'  },
  { id: 'bp-017', billerId: 'blr-006', billerName: 'Verizon',         fromAccountId: 'acc-001', amount:  82.00, scheduledDate: '2025-09-12T00:00:00Z', paidDate: '2025-09-12T07:00:00Z', status: 'paid', confirmationCode: 'VZN-20250912'    },
  { id: 'bp-018', billerId: 'blr-004', billerName: 'Chase Sapphire',  fromAccountId: 'acc-001', amount: 380.00, scheduledDate: '2025-08-20T00:00:00Z', paidDate: '2025-08-20T10:00:00Z', status: 'paid', confirmationCode: 'CHASE-20250820'  },
  { id: 'bp-019', billerId: 'blr-001', billerName: 'ConEd Electric',  fromAccountId: 'acc-001', amount: 138.00, scheduledDate: '2025-07-07T00:00:00Z', paidDate: '2025-07-07T08:00:00Z', status: 'paid', confirmationCode: 'CONED-20250707'  },
  { id: 'bp-020', billerId: 'blr-005', billerName: 'NYC Water Board', fromAccountId: 'acc-001', amount:  55.00, scheduledDate: '2025-06-15T00:00:00Z', paidDate: '2025-06-15T09:00:00Z', status: 'paid', confirmationCode: 'NYCWB-20250615'  },
  { id: 'bp-021', billerId: 'blr-003', billerName: 'State Farm',      fromAccountId: 'acc-001', amount: 210.00, scheduledDate: '2025-05-20T00:00:00Z', paidDate: '2025-05-20T10:00:00Z', status: 'paid', confirmationCode: 'SF-20250520'     },
  { id: 'bp-022', billerId: 'blr-001', billerName: 'ConEd Electric',  fromAccountId: 'acc-001', amount: 124.00, scheduledDate: '2025-04-07T00:00:00Z', paidDate: '2025-04-07T08:00:00Z', status: 'paid', confirmationCode: 'CONED-20250407'  },
  { id: 'bp-023', billerId: 'blr-001', billerName: 'ConEd Electric',  fromAccountId: 'acc-001', amount: 131.00, scheduledDate: '2025-02-05T00:00:00Z', paidDate: '2025-02-05T08:00:00Z', status: 'paid', confirmationCode: 'CONED-20250205'  },
  { id: 'bp-024', billerId: 'blr-006', billerName: 'Verizon',         fromAccountId: 'acc-001', amount:  80.00, scheduledDate: '2025-01-12T00:00:00Z', paidDate: '2025-01-12T07:00:00Z', status: 'paid', confirmationCode: 'VZN-20250112'    },
  // — 2024 —
  { id: 'bp-025', billerId: 'blr-001', billerName: 'ConEd Electric',  fromAccountId: 'acc-001', amount: 158.00, scheduledDate: '2024-12-05T00:00:00Z', paidDate: '2024-12-05T08:00:00Z', status: 'paid', confirmationCode: 'CONED-20241205'  },
  { id: 'bp-026', billerId: 'blr-003', billerName: 'State Farm',      fromAccountId: 'acc-001', amount: 195.00, scheduledDate: '2024-11-20T00:00:00Z', paidDate: '2024-11-20T10:00:00Z', status: 'paid', confirmationCode: 'SF-20241120'     },
  { id: 'bp-027', billerId: 'blr-004', billerName: 'Chase Sapphire',  fromAccountId: 'acc-001', amount: 520.00, scheduledDate: '2024-09-20T00:00:00Z', paidDate: '2024-09-20T10:00:00Z', status: 'paid', confirmationCode: 'CHASE-20240920'  },
  { id: 'bp-028', billerId: 'blr-001', billerName: 'ConEd Electric',  fromAccountId: 'acc-001', amount: 143.00, scheduledDate: '2024-07-05T00:00:00Z', paidDate: '2024-07-05T08:00:00Z', status: 'paid', confirmationCode: 'CONED-20240705'  },
  { id: 'bp-029', billerId: 'blr-005', billerName: 'NYC Water Board', fromAccountId: 'acc-001', amount:  55.00, scheduledDate: '2024-06-15T00:00:00Z', paidDate: '2024-06-15T09:00:00Z', status: 'paid', confirmationCode: 'NYCWB-20240615'  },
  { id: 'bp-030', billerId: 'blr-006', billerName: 'Verizon',         fromAccountId: 'acc-001', amount:  78.00, scheduledDate: '2024-03-12T00:00:00Z', paidDate: '2024-03-12T07:00:00Z', status: 'paid', confirmationCode: 'VZN-20240312'    },
  // — 2023 —
  { id: 'bp-031', billerId: 'blr-001', billerName: 'ConEd Electric',  fromAccountId: 'acc-001', amount: 172.00, scheduledDate: '2023-12-05T00:00:00Z', paidDate: '2023-12-05T08:00:00Z', status: 'paid', confirmationCode: 'CONED-20231205'  },
  { id: 'bp-032', billerId: 'blr-004', billerName: 'Chase Sapphire',  fromAccountId: 'acc-001', amount: 610.00, scheduledDate: '2023-11-20T00:00:00Z', paidDate: '2023-11-20T10:00:00Z', status: 'paid', confirmationCode: 'CHASE-20231120'  },
  { id: 'bp-033', billerId: 'blr-001', billerName: 'ConEd Electric',  fromAccountId: 'acc-001', amount: 128.00, scheduledDate: '2023-08-07T00:00:00Z', paidDate: '2023-08-07T08:00:00Z', status: 'paid', confirmationCode: 'CONED-20230807'  },
  { id: 'bp-034', billerId: 'blr-006', billerName: 'Verizon',         fromAccountId: 'acc-001', amount:  75.00, scheduledDate: '2023-05-12T00:00:00Z', paidDate: '2023-05-12T07:00:00Z', status: 'paid', confirmationCode: 'VZN-20230512'    },
  { id: 'bp-035', billerId: 'blr-005', billerName: 'NYC Water Board', fromAccountId: 'acc-001', amount:  55.00, scheduledDate: '2023-03-15T00:00:00Z', paidDate: '2023-03-15T09:00:00Z', status: 'paid', confirmationCode: 'NYCWB-20230315'  },
];

// ── Cards ──────────────────────────────────────────────────────────────────────
export const MOCK_CARDS: DebitCard[] = [
  { id: 'card-001', userId: 'user-001', accountId: 'acc-001', last4: '4521', network: 'Visa',       expiryMonth: 9,  expiryYear: 2028, cardholderName: 'MARCUS REYNOLDS', status: 'active', dailyLimit: 2500, atmLimit: 1000, onlineTransactionsEnabled: true,  internationalTransactionsEnabled: false, contactlessEnabled: true,  issuedAt: '2023-01-15T00:00:00Z' },
  { id: 'card-002', userId: 'user-002', accountId: 'acc-003', last4: '2847', network: 'Mastercard', expiryMonth: 6,  expiryYear: 2027, cardholderName: 'SOPHIE HARTLEY',  status: 'active', dailyLimit: 2000, atmLimit: 500,  onlineTransactionsEnabled: true,  internationalTransactionsEnabled: true,  contactlessEnabled: true,  issuedAt: '2023-03-20T00:00:00Z' },
  { id: 'card-003', userId: 'user-003', accountId: 'acc-005', last4: '9034', network: 'Visa',       expiryMonth: 12, expiryYear: 2026, cardholderName: 'ELENA VASQUEZ',   status: 'active', dailyLimit: 1500, atmLimit: 500,  onlineTransactionsEnabled: true,  internationalTransactionsEnabled: false, contactlessEnabled: false, issuedAt: '2023-06-10T00:00:00Z' },
];

// ── Statements ─────────────────────────────────────────────────────────────────
export const MOCK_STATEMENTS: Statement[] = [
  // ── Marcus – Checking (acc-001) ──────────────────────────────────────────────
  { id: 'stmt-001', accountId: 'acc-001', month: 3,  year: 2026, openingBalance:  5200.00, closingBalance:  8432.50, totalCredits: 3700.00, totalDebits:  467.50, transactionCount: 14, generatedAt: '2026-04-01T00:00:00Z', pdfSize: '312 KB' },
  { id: 'stmt-002', accountId: 'acc-001', month: 2,  year: 2026, openingBalance:  4800.00, closingBalance:  5200.00, totalCredits: 3500.00, totalDebits: 3100.00, transactionCount: 18, generatedAt: '2026-03-01T00:00:00Z', pdfSize: '298 KB' },
  { id: 'stmt-003', accountId: 'acc-001', month: 1,  year: 2026, openingBalance:  4200.00, closingBalance:  4800.00, totalCredits: 3500.00, totalDebits: 2900.00, transactionCount: 16, generatedAt: '2026-02-01T00:00:00Z', pdfSize: '284 KB' },
  { id: 'stmt-004', accountId: 'acc-001', month: 12, year: 2025, openingBalance:  3900.00, closingBalance:  4200.00, totalCredits: 3400.00, totalDebits: 3100.00, transactionCount: 22, generatedAt: '2026-01-01T00:00:00Z', pdfSize: '341 KB' },
  { id: 'stmt-005', accountId: 'acc-001', month: 11, year: 2025, openingBalance:  3500.00, closingBalance:  3900.00, totalCredits: 3400.00, totalDebits: 3000.00, transactionCount: 19, generatedAt: '2025-12-01T00:00:00Z', pdfSize: '276 KB' },
  { id: 'stmt-006', accountId: 'acc-001', month: 10, year: 2025, openingBalance:  3100.00, closingBalance:  3500.00, totalCredits: 3400.00, totalDebits: 3000.00, transactionCount: 17, generatedAt: '2025-11-01T00:00:00Z', pdfSize: '261 KB' },
  { id: 'stmt-00a', accountId: 'acc-001', month: 9,  year: 2025, openingBalance:  2800.00, closingBalance:  3100.00, totalCredits: 3400.00, totalDebits: 3100.00, transactionCount: 18, generatedAt: '2025-10-01T00:00:00Z', pdfSize: '254 KB' },
  { id: 'stmt-00b', accountId: 'acc-001', month: 8,  year: 2025, openingBalance:  2500.00, closingBalance:  2800.00, totalCredits: 3400.00, totalDebits: 3100.00, transactionCount: 16, generatedAt: '2025-09-01T00:00:00Z', pdfSize: '248 KB' },
  { id: 'stmt-00c', accountId: 'acc-001', month: 7,  year: 2025, openingBalance:  2200.00, closingBalance:  2500.00, totalCredits: 3400.00, totalDebits: 3100.00, transactionCount: 15, generatedAt: '2025-08-01T00:00:00Z', pdfSize: '242 KB' },
  { id: 'stmt-00d', accountId: 'acc-001', month: 6,  year: 2025, openingBalance:  1900.00, closingBalance:  2200.00, totalCredits: 3400.00, totalDebits: 3100.00, transactionCount: 17, generatedAt: '2025-07-01T00:00:00Z', pdfSize: '239 KB' },
  { id: 'stmt-00e', accountId: 'acc-001', month: 5,  year: 2025, openingBalance:  1700.00, closingBalance:  1900.00, totalCredits: 3400.00, totalDebits: 3200.00, transactionCount: 14, generatedAt: '2025-06-01T00:00:00Z', pdfSize: '231 KB' },
  { id: 'stmt-00f', accountId: 'acc-001', month: 4,  year: 2025, openingBalance:  1500.00, closingBalance:  1700.00, totalCredits: 3400.00, totalDebits: 3200.00, transactionCount: 16, generatedAt: '2025-05-01T00:00:00Z', pdfSize: '228 KB' },
  { id: 'stmt-00g', accountId: 'acc-001', month: 3,  year: 2025, openingBalance:  1300.00, closingBalance:  1500.00, totalCredits: 3400.00, totalDebits: 3200.00, transactionCount: 15, generatedAt: '2025-04-01T00:00:00Z', pdfSize: '224 KB' },
  { id: 'stmt-00h', accountId: 'acc-001', month: 2,  year: 2025, openingBalance:  1100.00, closingBalance:  1300.00, totalCredits: 3400.00, totalDebits: 3200.00, transactionCount: 14, generatedAt: '2025-03-01T00:00:00Z', pdfSize: '221 KB' },
  { id: 'stmt-00i', accountId: 'acc-001', month: 1,  year: 2025, openingBalance:   950.00, closingBalance:  1100.00, totalCredits: 3400.00, totalDebits: 3250.00, transactionCount: 15, generatedAt: '2025-02-01T00:00:00Z', pdfSize: '218 KB' },
  { id: 'stmt-00j', accountId: 'acc-001', month: 12, year: 2024, openingBalance:   800.00, closingBalance:   950.00, totalCredits: 3200.00, totalDebits: 3050.00, transactionCount: 20, generatedAt: '2025-01-01T00:00:00Z', pdfSize: '312 KB' },
  { id: 'stmt-00k', accountId: 'acc-001', month: 11, year: 2024, openingBalance:   700.00, closingBalance:   800.00, totalCredits: 3200.00, totalDebits: 3100.00, transactionCount: 17, generatedAt: '2024-12-01T00:00:00Z', pdfSize: '268 KB' },
  { id: 'stmt-00l', accountId: 'acc-001', month: 10, year: 2024, openingBalance:   620.00, closingBalance:   700.00, totalCredits: 3200.00, totalDebits: 3120.00, transactionCount: 16, generatedAt: '2024-11-01T00:00:00Z', pdfSize: '259 KB' },
  { id: 'stmt-00m', accountId: 'acc-001', month: 6,  year: 2024, openingBalance:   310.00, closingBalance:   450.00, totalCredits: 3200.00, totalDebits: 3060.00, transactionCount: 14, generatedAt: '2024-07-01T00:00:00Z', pdfSize: '241 KB' },
  { id: 'stmt-00n', accountId: 'acc-001', month: 3,  year: 2024, openingBalance:   120.00, closingBalance:   260.00, totalCredits: 3200.00, totalDebits: 3060.00, transactionCount: 13, generatedAt: '2024-04-01T00:00:00Z', pdfSize: '232 KB' },
  { id: 'stmt-00o', accountId: 'acc-001', month: 12, year: 2023, openingBalance:   620.00, closingBalance:   820.00, totalCredits: 2800.00, totalDebits: 2600.00, transactionCount: 19, generatedAt: '2024-01-01T00:00:00Z', pdfSize: '298 KB' },
  { id: 'stmt-00p', accountId: 'acc-001', month: 9,  year: 2023, openingBalance:   210.00, closingBalance:   380.00, totalCredits: 2800.00, totalDebits: 2630.00, transactionCount: 14, generatedAt: '2023-10-01T00:00:00Z', pdfSize: '219 KB' },
  { id: 'stmt-00q', accountId: 'acc-001', month: 6,  year: 2023, openingBalance:     0.00, closingBalance:   180.00, totalCredits: 2800.00, totalDebits: 2620.00, transactionCount: 11, generatedAt: '2023-07-01T00:00:00Z', pdfSize: '198 KB' },

  // ── Marcus – Savings (acc-002) ───────────────────────────────────────────────
  { id: 'stmt-007', accountId: 'acc-002', month: 3,  year: 2026, openingBalance: 23000.00, closingBalance: 24750.00, totalCredits: 2000.00, totalDebits:  250.00, transactionCount:  4, generatedAt: '2026-04-01T00:00:00Z', pdfSize: '189 KB' },
  { id: 'stmt-008', accountId: 'acc-002', month: 2,  year: 2026, openingBalance: 21500.00, closingBalance: 23000.00, totalCredits: 1750.00, totalDebits:  250.00, transactionCount:  3, generatedAt: '2026-03-01T00:00:00Z', pdfSize: '176 KB' },
  { id: 'stmt-00r', accountId: 'acc-002', month: 12, year: 2025, openingBalance: 19200.00, closingBalance: 21500.00, totalCredits: 2400.00, totalDebits:  100.00, transactionCount:  3, generatedAt: '2026-01-01T00:00:00Z', pdfSize: '171 KB' },
  { id: 'stmt-00s', accountId: 'acc-002', month: 6,  year: 2025, openingBalance: 14500.00, closingBalance: 16800.00, totalCredits: 2500.00, totalDebits:  200.00, transactionCount:  3, generatedAt: '2025-07-01T00:00:00Z', pdfSize: '162 KB' },
  { id: 'stmt-00t', accountId: 'acc-002', month: 12, year: 2024, openingBalance: 10200.00, closingBalance: 12100.00, totalCredits: 2000.00, totalDebits:  100.00, transactionCount:  2, generatedAt: '2025-01-01T00:00:00Z', pdfSize: '154 KB' },
  { id: 'stmt-00u', accountId: 'acc-002', month: 6,  year: 2024, openingBalance:  7200.00, closingBalance:  8900.00, totalCredits: 1800.00, totalDebits:  100.00, transactionCount:  2, generatedAt: '2024-07-01T00:00:00Z', pdfSize: '148 KB' },
  { id: 'stmt-00v', accountId: 'acc-002', month: 12, year: 2023, openingBalance:  5200.00, closingBalance:  6400.00, totalCredits: 1300.00, totalDebits:  100.00, transactionCount:  2, generatedAt: '2024-01-01T00:00:00Z', pdfSize: '141 KB' },

  // ── Sophie – Checking (acc-003) ──────────────────────────────────────────────
  { id: 'stmt-009', accountId: 'acc-003', month: 3,  year: 2026, openingBalance:  9800.00, closingBalance: 12845.00, totalCredits: 5600.00, totalDebits: 2555.00, transactionCount: 12, generatedAt: '2026-04-01T00:00:00Z', pdfSize: '304 KB' },
  { id: 'stmt-010', accountId: 'acc-003', month: 12, year: 2025, openingBalance:  5400.00, closingBalance:  7200.00, totalCredits: 2700.00, totalDebits:  900.00, transactionCount: 14, generatedAt: '2026-01-01T00:00:00Z', pdfSize: '289 KB' },
  { id: 'stmt-011', accountId: 'acc-003', month: 6,  year: 2025, openingBalance:  2200.00, closingBalance:  3400.00, totalCredits: 2700.00, totalDebits: 1500.00, transactionCount: 13, generatedAt: '2025-07-01T00:00:00Z', pdfSize: '261 KB' },
  { id: 'stmt-012', accountId: 'acc-003', month: 12, year: 2024, openingBalance:  1200.00, closingBalance:  2800.00, totalCredits: 2600.00, totalDebits: 1000.00, transactionCount: 11, generatedAt: '2025-01-01T00:00:00Z', pdfSize: '248 KB' },
  { id: 'stmt-013', accountId: 'acc-003', month: 6,  year: 2024, openingBalance:   500.00, closingBalance:  1600.00, totalCredits: 2600.00, totalDebits: 1500.00, transactionCount: 10, generatedAt: '2024-07-01T00:00:00Z', pdfSize: '234 KB' },
  { id: 'stmt-014', accountId: 'acc-003', month: 9,  year: 2023, openingBalance:   300.00, closingBalance:   900.00, totalCredits: 2400.00, totalDebits: 1800.00, transactionCount:  9, generatedAt: '2023-10-01T00:00:00Z', pdfSize: '218 KB' },

  // ── Sophie – Savings (acc-004) ───────────────────────────────────────────────
  { id: 'stmt-015', accountId: 'acc-004', month: 3,  year: 2026, openingBalance: 29500.00, closingBalance: 31200.00, totalCredits: 1700.00, totalDebits:    0.00, transactionCount:  3, generatedAt: '2026-04-01T00:00:00Z', pdfSize: '168 KB' },
  { id: 'stmt-016', accountId: 'acc-004', month: 12, year: 2025, openingBalance: 24000.00, closingBalance: 26800.00, totalCredits: 2900.00, totalDebits:  100.00, transactionCount:  4, generatedAt: '2026-01-01T00:00:00Z', pdfSize: '159 KB' },
  { id: 'stmt-017', accountId: 'acc-004', month: 12, year: 2024, openingBalance: 17500.00, closingBalance: 20100.00, totalCredits: 2700.00, totalDebits:  100.00, transactionCount:  3, generatedAt: '2025-01-01T00:00:00Z', pdfSize: '151 KB' },
  { id: 'stmt-018', accountId: 'acc-004', month: 6,  year: 2023, openingBalance: 12000.00, closingBalance: 13200.00, totalCredits: 1300.00, totalDebits:  100.00, transactionCount:  2, generatedAt: '2023-07-01T00:00:00Z', pdfSize: '143 KB' },
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
  { id: 'ben-002', userId: 'user-001', nickname: 'Mom',               type: 'external', recipientName: 'Patricia Reynolds', routingNumber: '021000021', accountNumber: '****5678', bankName: 'Chase Bank',    createdAt: '2023-05-10T00:00:00Z', lastUsed: '2025-12-15T00:00:00Z' },
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
