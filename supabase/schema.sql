-- Summit Valley Bank — Supabase Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                  TEXT PRIMARY KEY,
  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  email               TEXT UNIQUE NOT NULL,
  phone               TEXT NOT NULL DEFAULT '',
  address             TEXT NOT NULL DEFAULT '',
  city                TEXT NOT NULL DEFAULT '',
  state               TEXT NOT NULL DEFAULT '',
  zip                 TEXT NOT NULL DEFAULT '',
  country             TEXT NOT NULL DEFAULT 'US',
  locale              TEXT NOT NULL DEFAULT 'en-US',
  role                TEXT NOT NULL DEFAULT 'user',
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  managed_user_ids    TEXT[] NOT NULL DEFAULT '{}',
  avatar_url          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Credentials ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credentials (
  email     TEXT PRIMARY KEY,
  password  TEXT NOT NULL
);

-- ── Accounts ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL,
  type              TEXT NOT NULL,
  account_number    TEXT NOT NULL,
  balance           NUMERIC NOT NULL DEFAULT 0,
  available_balance NUMERIC NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'USD',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Transactions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id               TEXT PRIMARY KEY,
  account_id       TEXT NOT NULL,
  date             TIMESTAMPTZ NOT NULL,
  description      TEXT NOT NULL,
  category         TEXT NOT NULL DEFAULT 'other',
  type             TEXT NOT NULL,
  amount           NUMERIC NOT NULL,
  balance          NUMERIC NOT NULL,
  status           TEXT NOT NULL DEFAULT 'completed',
  reference        TEXT,
  transfer_type    TEXT,
  denial_message   TEXT,
  rejection_reason TEXT
);

-- ── Policies ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS policies (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  enabled          BOOLEAN NOT NULL DEFAULT FALSE,
  rule_type        TEXT NOT NULL,
  amount_threshold NUMERIC,
  target_user_id   TEXT,
  denial_message   TEXT NOT NULL DEFAULT '',
  created_by       TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Disable Row Level Security (demo app — no auth layer) ─────────────────────
ALTER TABLE users        DISABLE ROW LEVEL SECURITY;
ALTER TABLE credentials  DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts     DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE policies     DISABLE ROW LEVEL SECURITY;
