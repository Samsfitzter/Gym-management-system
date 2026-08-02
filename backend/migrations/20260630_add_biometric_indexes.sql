-- Add performance indexes for biometric syncing
CREATE INDEX IF NOT EXISTS idx_biometric_raw_events_status_time 
ON biometric_raw_events(status, event_time);
