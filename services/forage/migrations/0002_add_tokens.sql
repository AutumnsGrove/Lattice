-- Add token tracking columns to job_index
ALTER TABLE job_index ADD COLUMN input_tokens INTEGER DEFAULT 0;
ALTER TABLE job_index ADD COLUMN output_tokens INTEGER DEFAULT 0;
