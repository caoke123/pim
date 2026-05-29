CREATE TABLE IF NOT EXISTS "distributors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"contact" varchar(100),
	"api_token" varchar(100) NOT NULL,
	"allowed_categories" text[],
	"price_type" varchar(20) DEFAULT 'selling',
	"price_markup" numeric(5, 2) DEFAULT '0',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "distributors_api_token_unique" UNIQUE("api_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "export_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" varchar(20) NOT NULL,
	"product_ids" uuid[] NOT NULL,
	"file_name" varchar(200),
	"file_url" varchar(500),
	"exported_by" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_platforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"platform" varchar(20) NOT NULL,
	"platform_title" varchar(300),
	"platform_category" varchar(100),
	"platform_price" numeric(10, 2),
	"platform_attributes" jsonb,
	"export_status" varchar(20) DEFAULT 'draft',
	"last_exported_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_skus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"sku_code" varchar(32) NOT NULL,
	"sku_name" varchar(100) NOT NULL,
	"image_url" varchar(500),
	"original_image" varchar(200),
	"size" varchar(100),
	"weight_g" integer,
	"cost_price" numeric(10, 2),
	"selling_price" numeric(10, 2),
	"stock" integer DEFAULT 0,
	"barcode" varchar(50),
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_no" varchar(32) NOT NULL,
	"title" varchar(200) NOT NULL,
	"short_title" varchar(50),
	"category" varchar(20),
	"description" text,
	"folder_name" varchar(300) NOT NULL,
	"r2_base_path" varchar(500),
	"r2_base_url" varchar(500),
	"r2_synced_at" timestamp with time zone,
	"pim_synced_at" timestamp with time zone,
	"main_image_url" varchar(500),
	"images_json" jsonb,
	"outer_packaging_json" jsonb,
	"tool_version" varchar(20),
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_product_no_unique" UNIQUE("product_no")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trigger" varchar(20) NOT NULL,
	"total_scanned" integer DEFAULT 0,
	"new_count" integer DEFAULT 0,
	"updated_count" integer DEFAULT 0,
	"skipped_count" integer DEFAULT 0,
	"failed_count" integer DEFAULT 0,
	"status" varchar(20) NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_platform_unique" ON "product_platforms" ("product_id","platform");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_platforms" ADD CONSTRAINT "product_platforms_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_skus" ADD CONSTRAINT "product_skus_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
