// Vision Opticals — Netlify Database (Postgres) schema.
// Boolean-like flags are stored as integers (0/1) to stay compatible with the
// existing route SQL that was originally written for SQLite.
import {
  pgTable, serial, text, integer, doublePrecision, timestamp, index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";


export const users = pgTable("users", {
  id: serial().primaryKey(),
  username: text().notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text().notNull(),
  role: text().default("admin"),
  createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
});

export const categories = pgTable("categories", {
  id: serial().primaryKey(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  description: text(),
  icon: text(),
  sortOrder: integer("sort_order").default(0),
});

export const brands = pgTable("brands", {
  id: serial().primaryKey(),
  name: text().notNull().unique(),
  slug: text().notNull().unique(),
  logoUrl: text("logo_url"),
  isFeatured: integer("is_featured").default(0),
});

export const products = pgTable("products", {
  id: serial().primaryKey(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  categorySlug: text("category_slug").notNull(),
  brand: text(),
  price: doublePrecision(),
  compareAtPrice: doublePrecision("compare_at_price"),
  badge: text(),
  description: text(),
  primaryImage: text("primary_image"),
  secondaryImage: text("secondary_image"),
  colorFamily: text("color_family"),
  productTags: text("product_tags"),
  lensUvCut: text("lens_uv_cut"),
  lensBlueCut: text("lens_blue_cut"),
  lensTransmission: text("lens_transmission"),
  gender: text().default("Unisex"),
  frameShape: text("frame_shape"),
  frameType: text("frame_type"),
  frameMaterial: text("frame_material"),
  lensWidth: text("lens_width"),
  bridge: text(),
  templeLength: text("temple_length"),
  availableColors: text("available_colors"),
  availableSizes: text("available_sizes"),
  lensCoatings: text("lens_coatings"),
  lensPowerRange: text("lens_power_range"),
  lensWaterContent: text("lens_water_content"),
  lensMaterial: text("lens_material"),
  lensDuration: text("lens_duration"),
  lensFeatures: text("lens_features"),
  waMessage: text("wa_message"),
  isPublished: integer("is_published").default(1),
  isFeatured: integer("is_featured").default(0),
  isBestseller: integer("is_bestseller").default(0),
  isNewArrival: integer("is_new_arrival").default(0),
  isTrending: integer("is_trending").default(0),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
}, (t) => [
  index("idx_products_category").on(t.categorySlug),
  index("idx_products_brand").on(t.brand),
  index("idx_products_published").on(t.isPublished),
]);

export const productImages = pgTable("product_images", {
  id: serial().primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  url: text().notNull(),
  thumbnailUrl: text("thumbnail_url"),
  angleLabel: text("angle_label"),
  sortOrder: integer("sort_order").default(0),
  isPrimary: integer("is_primary").default(0),
});

export const inventory = pgTable("inventory", {
  id: serial().primaryKey(),
  productId: integer("product_id").notNull().unique().references(() => products.id, { onDelete: "cascade" }),
  quantity: integer().default(10),
  lowStockThreshold: integer("low_stock_threshold").default(3),
  sku: text(),
  updatedAt: timestamp("updated_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
});

export const inventoryLogs = pgTable("inventory_logs", {
  id: serial().primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  changeAmount: integer("change_amount").notNull(),
  finalQuantity: integer("final_quantity").notNull(),
  reason: text(),
  userName: text("user_name").default("Admin"),
  createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
});

export const offers = pgTable("offers", {
  id: serial().primaryKey(),
  title: text().notNull(),
  subtitle: text(),
  code: text(),
  discountType: text("discount_type").default("percentage"),
  discountValue: doublePrecision("discount_value").notNull(),
  applicableCategory: text("applicable_category").default("all"),
  bannerUrl: text("banner_url"),
  // Stored as ISO-8601 text (as sent by the admin dashboard).
  startDate: text("start_date"),
  endDate: text("end_date"),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
});

export const homepageSections = pgTable("homepage_sections", {
  id: serial().primaryKey(),
  sectionKey: text("section_key").notNull().unique(),
  title: text(),
  subtitle: text(),
  badge: text(),
  isEnabled: integer("is_enabled").default(1),
  displayOrder: integer("display_order").default(0),
  config: text(),
});

export const storeSettings = pgTable("store_settings", {
  key: text().primaryKey(),
  value: text(),
  updatedAt: timestamp("updated_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
});

export const appointments = pgTable("appointments", {
  id: serial().primaryKey(),
  appointmentNumber: text("appointment_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  phone: text().notNull(),
  email: text(),
  appointmentDate: text("appointment_date").notNull(),
  timeSlot: text("time_slot").notNull(),
  serviceType: text("service_type").notNull(),
  notes: text(),
  status: text().default("confirmed"),
  createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
}, (t) => [index("idx_appointments_date").on(t.appointmentDate)]);

export const orders = pgTable("orders", {
  id: serial().primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  shippingAddress: text("shipping_address").notNull(),
  city: text(),
  state: text(),
  pincode: text(),
  subtotal: doublePrecision().notNull(),
  discount: doublePrecision().default(0),
  totalAmount: doublePrecision("total_amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  paymentStatus: text("payment_status").default("pending"),
  orderStatus: text("order_status").default("placed"),
  itemsJson: text("items_json").notNull(),
  prescriptionFile: text("prescription_file"),
  prescriptionData: text("prescription_data"),
  trackingNumber: text("tracking_number"),
  createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
}, (t) => [index("idx_orders_status").on(t.orderStatus)]);

export const modularComponents = pgTable("modular_components", {
  id: serial().primaryKey(),
  componentId: text("component_id").notNull().unique(),
  type: text().notNull(),
  title: text().notNull(),
  subtitle: text(),
  badge: text(),
  displayOrder: integer("display_order").default(0),
  isEnabled: integer("is_enabled").default(1),
  configJson: text("config_json"),
  isDeleted: integer("is_deleted").default(0),
  createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`),
}, (t) => [index("idx_modular_components_order").on(t.displayOrder)]);
