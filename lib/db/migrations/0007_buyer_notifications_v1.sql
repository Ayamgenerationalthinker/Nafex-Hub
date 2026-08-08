-- ============================================================
-- Migration: 0007_buyer_notifications_v1.sql
-- Purpose  : Support production-grade buyer notifications
-- Strategy : Additive migration. Since notifications.type is text,
--            new buyer types are supported at DB level automatically.
-- ============================================================

-- Ensure composite index exists for hot unread & paginated queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, read_at, created_at DESC);

-- Verify migration setup
DO $$
BEGIN
  RAISE NOTICE 'Migration 0007_buyer_notifications_v1 applied successfully';
END
$$;
