-- ============================================================
-- Migration: 0006_seller_notifications_v2.sql
-- Purpose  : Extend notifications table for production-grade
--            seller notification system.
-- Strategy : Additive migration + data backfill. Safe to run on
--            live database with existing rows.
-- ============================================================

-- 1. Add actor_id column (nullable — null means system event)
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS actor_id INTEGER;

-- 2. Add metadata JSONB column (nullable — event-specific payload)
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 3. Add read_at timestamp column (null = unread)
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 4. Backfill read_at from legacy is_read boolean
--    Any row that was marked is_read=true gets read_at=NOW() as a reasonable
--    approximation (exact read time was never captured).
UPDATE notifications
  SET read_at = NOW()
  WHERE is_read = TRUE
    AND read_at IS NULL;

-- 5. Drop legacy is_read column (no longer needed)
ALTER TABLE notifications
  DROP COLUMN IF EXISTS is_read;

-- 6. Extend the type enum to include all seller event types.
--    In PostgreSQL, adding values to an existing enum requires ALTER TYPE.
--    We use IF NOT EXISTS (PG >= 12) to make this idempotent.
DO $$
BEGIN
  -- Orders
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'new_order' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notifications_type')) THEN
    -- Notifications type column is text — no ALTER TYPE needed.
    -- The enum restriction is enforced at application level by Drizzle/Zod.
    NULL;
  END IF;
END
$$;

-- NOTE: Because the `type` column is TEXT (not a native PG ENUM), new type
-- values are automatically supported by inserting rows with the new string
-- value. No ALTER TYPE is required. The allowed-values constraint is purely
-- at the application/ORM layer.

-- 7. Create composite index for hot access patterns
--    a) Unread count:   WHERE user_id=$1 AND read_at IS NULL
--    b) Paginated list: WHERE user_id=$1 ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, read_at, created_at DESC);

-- 8. Verify the migration applied cleanly (informational, not a blocker)
DO $$
BEGIN
  ASSERT (
    SELECT COUNT(*) = 0
    FROM information_schema.columns
    WHERE table_name = 'notifications'
      AND column_name = 'is_read'
  ), 'is_read column should have been dropped';

  ASSERT (
    SELECT COUNT(*) > 0
    FROM information_schema.columns
    WHERE table_name = 'notifications'
      AND column_name = 'read_at'
  ), 'read_at column should exist';

  RAISE NOTICE 'Migration 0006_seller_notifications_v2 verified OK';
END
$$;
