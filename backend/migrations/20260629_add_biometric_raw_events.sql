CREATE TABLE IF NOT EXISTS biometric_raw_events (
    id SERIAL PRIMARY KEY,
    device_log_id VARCHAR(100) UNIQUE NOT NULL,
    employee_no VARCHAR(100) NOT NULL,
    event_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processed', 'ignored', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Ensure checkout_device_log_id is UNIQUE, handle gracefully if already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_checkout_device_log_id'
    ) THEN
        ALTER TABLE attendance ADD CONSTRAINT uq_checkout_device_log_id UNIQUE (checkout_device_log_id);
    END IF;
END $$;
