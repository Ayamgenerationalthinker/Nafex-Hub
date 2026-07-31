ALTER TYPE "public"."support_sender_role" ADD VALUE 'business_owner';--> statement-breakpoint
ALTER TYPE "public"."support_sender_role" ADD VALUE 'rider';--> statement-breakpoint
ALTER TYPE "public"."support_status" ADD VALUE 'in_progress' BEFORE 'closed';--> statement-breakpoint
ALTER TYPE "public"."support_status" ADD VALUE 'resolved' BEFORE 'closed';--> statement-breakpoint
CREATE TABLE "trade_escrow" (
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
--> statement-breakpoint
CREATE TABLE "trade_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_orders" (
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
--> statement-breakpoint
CREATE TABLE "trade_tracking_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"status" text NOT NULL,
	"description" text NOT NULL,
	"location" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_boosts" (
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
--> statement-breakpoint
CREATE TABLE "flash_sales" (
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
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_expiry" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "loyalty_points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "verification_tier" text DEFAULT 'bronze' NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "kyc_documents" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "kyc_notes" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "paystack_recipient_code" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "settlement_bank" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "settlement_account" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "flagged" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "admin_status" text DEFAULT 'monitoring' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "attachment_url" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "attachment_type" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "reference_id" integer;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "delivered" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "coins_applied" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "is_b2b" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "milestones" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "approval_status" text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "support_conversations" ADD COLUMN "subject" text DEFAULT 'Support Request' NOT NULL;--> statement-breakpoint
ALTER TABLE "support_conversations" ADD COLUMN "category" text DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "support_conversations" ADD COLUMN "priority" text DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "support_conversations" ADD COLUMN "assigned_admin_id" integer;--> statement-breakpoint
ALTER TABLE "support_messages" ADD COLUMN "attachment_url" text;--> statement-breakpoint
ALTER TABLE "support_messages" ADD COLUMN "is_internal_note" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "trade_quotes" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "trade_quotes" ADD COLUMN "accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "trade_requests" ADD COLUMN "target_port" text;--> statement-breakpoint
ALTER TABLE "trade_requests" ADD COLUMN "required_by_date" text;--> statement-breakpoint
ALTER TABLE "trade_requests" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "trade_requests" ADD COLUMN "images" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "trade_requests" ADD COLUMN "requester_role" text DEFAULT 'buyer' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_user_id_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_business_id_idx" ON "orders" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_business_id_idx" ON "products" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "products_collection_id_idx" ON "products" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX "trade_requests_user_id_idx" ON "trade_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trade_requests_status_idx" ON "trade_requests" USING btree ("status");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_price_non_negative" CHECK ("orders"."total_price" >= 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "stock_non_negative" CHECK ("products"."stock" >= 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "price_non_negative" CHECK ("products"."price" >= 0);--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_amount_non_negative" CHECK ("transactions"."amount" >= 0);