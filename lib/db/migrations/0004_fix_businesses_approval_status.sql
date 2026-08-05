ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "approval_status" text DEFAULT 'pending' NOT NULL;
