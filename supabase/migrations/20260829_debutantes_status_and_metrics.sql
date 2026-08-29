-- Migration: Add status and expiration support to debutantes and venues metrics
-- Date: 2026-08-29

-- 1. Debutantes: Add status column ('active' | 'inactive')
ALTER TABLE debutantes 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 2. Venues: Add metrics columns if not present
ALTER TABLE venues
ADD COLUMN IF NOT EXISTS years_in_business INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS events_completed INTEGER DEFAULT 1500,
ADD COLUMN IF NOT EXISTS guests_delighted INTEGER DEFAULT 180000;

-- 3. Guests: Ensure self-registered guests can be inserted cleanly
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS is_self_registered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS confirmed_at TEXT,
ADD COLUMN IF NOT EXISTS sweet_message TEXT;
