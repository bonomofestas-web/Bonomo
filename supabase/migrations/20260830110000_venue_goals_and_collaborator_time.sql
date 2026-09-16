-- Migration: Venue Goals and Collaborator Time Tracking
ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS goals JSONB DEFAULT '{
  "revenueTarget": 150000,
  "salesTarget": 12,
  "leadsTarget": 60,
  "responseTimeTargetMinutes": 15,
  "period": "monthly"
}'::jsonb;

-- Table for tracking real active time spent by collaborators in the admin portal
CREATE TABLE IF NOT EXISTS collaborator_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id UUID NOT NULL,
  collaborator_name TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  active_seconds INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_collab_date UNIQUE (collaborator_id, date)
);
