-- Add register_number column to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS register_number VARCHAR(50) UNIQUE;
