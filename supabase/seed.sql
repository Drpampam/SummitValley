-- Summit Valley Bank — Seed Data
-- Run this in your Supabase SQL Editor AFTER running schema.sql
-- Safe to re-run: uses INSERT ... ON CONFLICT DO NOTHING

-- ── Users ─────────────────────────────────────────────────────────────────────
INSERT INTO users (id, first_name, last_name, email, phone, address, city, state, zip, country, locale, role, must_change_password, managed_user_ids, created_at)
VALUES
  ('user-001', 'Marcus',  'Reynolds', 'svb-marcus-reynolds@mailinator.com', '+1 212 548 3901', '47 Lexington Avenue',        'New York',     'NY',             '10017', 'US', 'en-US', 'user',            false, '{}',                              '2023-01-15T00:00:00Z'),
  ('user-002', 'Sophie',  'Hartley',  'svb-sophie-hartley@mailinator.com',  '+44 20 3892 4715','32 Kensington High Street',  'London',       'Greater London', 'W8 4PT','GB', 'en-GB', 'user',            false, '{}',                              '2023-03-20T00:00:00Z'),
  ('user-003', 'Elena',   'Vasquez',  'svb-elena-vasquez@mailinator.com',   '+1 415 302 8847', '819 Castro Street',          'San Francisco','CA',             '94114', 'US', 'en-US', 'user',            false, '{}',                              '2023-06-10T00:00:00Z'),
  ('mgr-001',  'Daniel',  'Okafor',   'svb-daniel-roland@mailinator.com',   '+1 212 749 6032', '520 Park Avenue',            'New York',     'NY',             '10022', 'US', 'en-US', 'account_manager', false, '{"user-001","user-002","user-003"}','2022-06-01T00:00:00Z'),
  ('admin-001','Rachel',  'Kim',      'svb-rachel-kim@mailinator.com',      '+1 800 427 5193', '1 World Financial Center',   'New York',     'NY',             '10281', 'US', 'en-US', 'admin',           false, '{}',                              '2022-01-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ── Credentials ───────────────────────────────────────────────────────────────
INSERT INTO credentials (email, password)
VALUES
  ('svb-marcus-reynolds@mailinator.com', 'Marcus@1234'),
  ('svb-sophie-hartley@mailinator.com',  'Sophie@4321'),
  ('svb-elena-vasquez@mailinator.com',   'Elena@1234'),
  ('svb-daniel-roland@mailinator.com',   'Daniel@123'),
  ('svb-rachel-kim@mailinator.com',      'Rachel@1234')
ON CONFLICT (email) DO NOTHING;

-- ── Accounts ──────────────────────────────────────────────────────────────────
INSERT INTO accounts (id, user_id, type, account_number, balance, available_balance, currency, created_at)
VALUES
  ('acc-001', 'user-001', 'checking', '****4521',  8432.50,  8200.00,  'USD', '2023-01-15T00:00:00Z'),
  ('acc-002', 'user-001', 'savings',  '****7893', 24750.00, 24750.00,  'USD', '2023-01-15T00:00:00Z'),
  ('acc-003', 'user-002', 'checking', '****2847', 12845.00, 12500.00,  'GBP', '2023-03-20T00:00:00Z'),
  ('acc-004', 'user-002', 'savings',  '****6152', 31200.00, 31200.00,  'GBP', '2023-03-20T00:00:00Z'),
  ('acc-005', 'user-003', 'checking', '****9034',  5280.00,  5100.00,  'USD', '2023-06-10T00:00:00Z'),
  ('acc-006', 'user-003', 'savings',  '****3471', 18960.00, 18960.00,  'USD', '2023-06-10T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ── Default Policy ────────────────────────────────────────────────────────────
INSERT INTO policies (id, name, enabled, rule_type, amount_threshold, target_user_id, denial_message, created_by, created_at)
VALUES
  ('pol-default-001', 'High-Value Transfer Limit', false, 'block_above_amount', 50000, NULL,
   'This transfer exceeds the maximum single-transaction limit. Please contact your account manager to authorise large transfers.',
   'admin-001', NOW())
ON CONFLICT (id) DO NOTHING;
