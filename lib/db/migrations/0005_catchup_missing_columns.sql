-- Migration 0005: Catch-up migration — safely apply all columns/tables from 0001, 0002, 0003
-- Uses IF NOT EXISTS everywhere to be idempotent (safe to run even if partial schema exists)

-- ── ENUM additions (safe: only runs if value doesn't already exist) ──────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'business_owner' AND enumtypid = 'support_sender_role'::regtype) THEN
    ALTER TYPE "public"."support_sender_role" ADD VALUE 'business_owner';
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rider' AND enumtypid = 'support_sender_role'::regtype) THEN
    ALTER TYPE "public"."support_sender_role" ADD VALUE 'rider';
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'in_progress' AND enumtypid = 'support_status'::regtype) THEN
    ALTER TYPE "public"."support_status" ADD VALUE 'in_progress' BEFORE 'closed';
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'resolved' AND enumtypid = 'support_status'::regtype) THEN
    ALTER TYPE "public"."support_status" ADD VALUE 'resolved' BEFORE 'closed';
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ── New tables from 0001 ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "trade_escrow" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"buyer_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'GHS' NOT NULL,
	"paystack_ref" text,
	"paystack_status" text DEFAULT 'pending' NOT NULL,
	"funded_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trade_escrow_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "trade_escrow_paystack_ref_unique" UNIQUE("paystack_ref")
);

CREATE TABLE IF NOT EXISTS "trade_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "trade_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"quote_id" integer NOT NULL,
	"buyer_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"escrow_status" text DEFAULT 'pending' NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"quantity" integer NOT NULL,
	"product_name" text NOT NULL,
	"supplier_name" text NOT NULL,
	"notes" text,
	"buyer_confirmed_delivery" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "trade_tracking_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"status" text NOT NULL,
	"description" text NOT NULL,
	"location" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "ad_boosts" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"tier" text NOT NULL,
	"duration_days" integer DEFAULT 7 NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'GHS' NOT NULL,
	"payment_ref" text,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"starts_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "flash_sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"discount_percent" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- ── Column additions (all IF NOT EXISTS) ─────────────────────────────────────────────────────

-- users table columns from 0001
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_code" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_expiry" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "loyalty_points" integer DEFAULT 0 NOT NULL;

-- businesses table columns from 0001 (approval_status already in 0004, skip)
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "verification_tier" text DEFAULT 'bronze' NOT NULL;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "kyc_documents" text[] DEFAULT '{}' NOT NULL;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "kyc_notes" text;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "paystack_recipient_code" text;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "settlement_bank" text;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "settlement_account" text;

-- conversations table columns from 0001
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "flagged" boolean DEFAULT false NOT NULL;
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "admin_status" text DEFAULT 'monitoring' NOT NULL;

-- messages table columns from 0001
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "attachment_url" text;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "attachment_type" text;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "reference_id" integer;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "delivered" boolean DEFAULT false NOT NULL;

-- orders table columns from 0001
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "coins_applied" integer DEFAULT 0 NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "is_b2b" boolean DEFAULT false NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "milestones" jsonb DEFAULT '[]'::jsonb NOT NULL;

-- products table columns from 0001
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "approval_status" text DEFAULT 'approved' NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "rejection_reason" text;

-- support_conversations table columns from 0001
ALTER TABLE "support_conversations" ADD COLUMN IF NOT EXISTS "subject" text DEFAULT 'Support Request' NOT NULL;
ALTER TABLE "support_conversations" ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'general' NOT NULL;
ALTER TABLE "support_conversations" ADD COLUMN IF NOT EXISTS "priority" text DEFAULT 'medium' NOT NULL;
ALTER TABLE "support_conversations" ADD COLUMN IF NOT EXISTS "assigned_admin_id" integer;

-- support_messages table columns from 0001
ALTER TABLE "support_messages" ADD COLUMN IF NOT EXISTS "attachment_url" text;
ALTER TABLE "support_messages" ADD COLUMN IF NOT EXISTS "is_internal_note" boolean DEFAULT false NOT NULL;

-- trade_quotes table columns from 0001
ALTER TABLE "trade_quotes" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending' NOT NULL;
ALTER TABLE "trade_quotes" ADD COLUMN IF NOT EXISTS "accepted_at" timestamp with time zone;

-- trade_requests table columns from 0001
ALTER TABLE "trade_requests" ADD COLUMN IF NOT EXISTS "target_port" text;
ALTER TABLE "trade_requests" ADD COLUMN IF NOT EXISTS "required_by_date" text;
ALTER TABLE "trade_requests" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "trade_requests" ADD COLUMN IF NOT EXISTS "images" text[] DEFAULT '{}' NOT NULL;
ALTER TABLE "trade_requests" ADD COLUMN IF NOT EXISTS "requester_role" text DEFAULT 'buyer' NOT NULL;

-- ── Indexes from 0002 ─────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "analytics_business_created_idx" ON "analytics_events" USING btree ("business_id","created_at");
CREATE INDEX IF NOT EXISTS "admin_activity_created_idx" ON "admin_activity" USING btree ("created_at");

-- ── New tables and columns from 0003 ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "product_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"sku" text NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"price" numeric(10, 2),
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku"),
	CONSTRAINT "variant_stock_non_negative" CHECK ("product_variants"."stock" >= 0)
);

-- users table columns from 0003
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_id" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "facebook_id" text;

-- products table columns from 0003
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'General' NOT NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "brand" text;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "model" text;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sku_prefix" text DEFAULT 'NFH-GEN-GEN-GEN' NOT NULL;

-- ── Constraints (safe to run, already catches duplicate constraint errors) ────────────────────
DO $$ BEGIN
  ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "orders" ADD CONSTRAINT "orders_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "products" ADD CONSTRAINT "products_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Indexes from 0003 ─────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "orders_user_id_idx" ON "orders" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "orders_business_id_idx" ON "orders" USING btree ("business_id");
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders" USING btree ("status");
CREATE INDEX IF NOT EXISTS "products_business_id_idx" ON "products" USING btree ("business_id");
CREATE INDEX IF NOT EXISTS "products_collection_id_idx" ON "products" USING btree ("collection_id");
CREATE INDEX IF NOT EXISTS "products_status_idx" ON "products" USING btree ("approval_status");
CREATE INDEX IF NOT EXISTS "variants_product_id_idx" ON "product_variants" USING btree ("product_id");
CREATE INDEX IF NOT EXISTS "variants_sku_idx" ON "product_variants" USING btree ("sku");
