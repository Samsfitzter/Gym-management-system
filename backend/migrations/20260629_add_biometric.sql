-- Extend members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS biometric_status VARCHAR(50) DEFAULT 'unregistered';
ALTER TABLE members ADD COLUMN IF NOT EXISTS face_enabled BOOLEAN DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS fingerprint_enabled BOOLEAN DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS card_enabled BOOLEAN DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS last_enrolled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE;

-- Add device user id mapping (if it doesn't already exist from older migrations)
ALTER TABLE members ADD COLUMN IF NOT EXISTS device_user_id INTEGER UNIQUE;

-- Extend device_settings table
ALTER TABLE device_settings ADD COLUMN IF NOT EXISTS username VARCHAR(255);
ALTER TABLE device_settings ADD COLUMN IF NOT EXISTS password_encrypted TEXT;
ALTER TABLE device_settings ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;
ALTER TABLE device_settings ADD COLUMN IF NOT EXISTS connection_timeout INTEGER DEFAULT 10000;
ALTER TABLE device_settings ADD COLUMN IF NOT EXISTS sync_page_size INTEGER DEFAULT 1000;
ALTER TABLE device_settings ADD COLUMN IF NOT EXISTS last_successful_sync TIMESTAMP WITH TIME ZONE;
ALTER TABLE device_settings ADD COLUMN IF NOT EXISTS last_event_id VARCHAR(255);

-- Create sync_jobs audit table
CREATE TABLE IF NOT EXISTS sync_jobs (
    id SERIAL PRIMARY KEY,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL, -- 'in_progress', 'completed', 'failed'
    imported INTEGER DEFAULT 0,
    duplicates INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0,
    error_message TEXT,
    last_event_time TIMESTAMP WITH TIME ZONE
);

-- Extend attendance table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS verification_method VARCHAR(50);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS device_name VARCHAR(255);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS device_event_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS checkout_device_log_id VARCHAR(100);

-- Make syncs idempotent based on the device_log_id
-- We must make sure device_log_id is UNIQUE if not null
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_device_log_id'
    ) THEN
        ALTER TABLE attendance ADD CONSTRAINT uq_device_log_id UNIQUE (device_log_id);
    END IF;
END $$;
