-- Migration: Add contact fields and metrics to venues table
ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS years_in_business INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS events_completed INTEGER DEFAULT 500,
ADD COLUMN IF NOT EXISTS guests_delighted INTEGER DEFAULT 80000;

-- Optional metadata for global goals
CREATE TABLE IF NOT EXISTS system_goals (
  id TEXT PRIMARY KEY DEFAULT 'default_lead_goal',
  target_leads INTEGER DEFAULT 30,
  deadline_date TEXT,
  title TEXT DEFAULT 'Meta Mensal de Leads',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
