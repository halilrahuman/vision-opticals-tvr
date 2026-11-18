CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY,
	"appointment_number" text NOT NULL UNIQUE,
	"customer_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"appointment_date" text NOT NULL,
	"time_slot" text NOT NULL,
	"service_type" text NOT NULL,
	"notes" text,
	"status" text DEFAULT 'confirmed',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL UNIQUE,
	"slug" text NOT NULL UNIQUE,
	"logo_url" text,
	"is_featured" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY,
	"slug" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "homepage_sections" (
	"id" serial PRIMARY KEY,
	"section_key" text NOT NULL UNIQUE,
	"title" text,
	"subtitle" text,
	"badge" text,
	"is_enabled" integer DEFAULT 1,
	"display_order" integer DEFAULT 0,
	"config" text
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY,
	"product_id" integer NOT NULL UNIQUE,
	"quantity" integer DEFAULT 10,
	"low_stock_threshold" integer DEFAULT 3,
	"sku" text,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "inventory_logs" (
	"id" serial PRIMARY KEY,
	"product_id" integer NOT NULL,
	"change_amount" integer NOT NULL,
	"final_quantity" integer NOT NULL,
	"reason" text,
	"user_name" text DEFAULT 'Admin',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "modular_components" (
	"id" serial PRIMARY KEY,
	"component_id" text NOT NULL UNIQUE,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"badge" text,
	"display_order" integer DEFAULT 0,
	"is_enabled" integer DEFAULT 1,
	"config_json" text,
	"is_deleted" integer DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"subtitle" text,
	"code" text,
	"discount_type" text DEFAULT 'percentage',
	"discount_value" double precision NOT NULL,
	"applicable_category" text DEFAULT 'all',
	"banner_url" text,
	"start_date" text,
	"end_date" text,
	"is_active" integer DEFAULT 1,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY,
	"order_number" text NOT NULL UNIQUE,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_email" text,
	"shipping_address" text NOT NULL,
	"city" text,
	"state" text,
	"pincode" text,
	"subtotal" double precision NOT NULL,
	"discount" double precision DEFAULT 0,
	"total_amount" double precision NOT NULL,
	"payment_method" text NOT NULL,
	"payment_status" text DEFAULT 'pending',
	"order_status" text DEFAULT 'placed',
	"items_json" text NOT NULL,
	"prescription_file" text,
	"prescription_data" text,
	"tracking_number" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" serial PRIMARY KEY,
	"product_id" integer NOT NULL,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"angle_label" text,
	"sort_order" integer DEFAULT 0,
	"is_primary" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY,
	"slug" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"category_slug" text NOT NULL,
	"brand" text,
	"price" double precision,
	"compare_at_price" double precision,
	"badge" text,
	"description" text,
	"primary_image" text,
	"secondary_image" text,
	"color_family" text,
	"product_tags" text,
	"lens_uv_cut" text,
	"lens_blue_cut" text,
	"lens_transmission" text,
	"gender" text DEFAULT 'Unisex',
	"frame_shape" text,
	"frame_type" text,
	"frame_material" text,
	"lens_width" text,
	"bridge" text,
	"temple_length" text,
	"available_colors" text,
	"available_sizes" text,
	"lens_coatings" text,
	"lens_power_range" text,
	"lens_water_content" text,
	"lens_material" text,
	"lens_duration" text,
	"lens_features" text,
	"wa_message" text,
	"is_published" integer DEFAULT 1,
	"is_featured" integer DEFAULT 0,
	"is_bestseller" integer DEFAULT 0,
	"is_new_arrival" integer DEFAULT 0,
	"is_trending" integer DEFAULT 0,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
	"key" text PRIMARY KEY,
	"value" text,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"username" text NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'admin',
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX "idx_appointments_date" ON "appointments" ("appointment_date");--> statement-breakpoint
CREATE INDEX "idx_modular_components_order" ON "modular_components" ("display_order");--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" ("order_status");--> statement-breakpoint
CREATE INDEX "idx_products_category" ON "products" ("category_slug");--> statement-breakpoint
CREATE INDEX "idx_products_brand" ON "products" ("brand");--> statement-breakpoint
CREATE INDEX "idx_products_published" ON "products" ("is_published");--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;