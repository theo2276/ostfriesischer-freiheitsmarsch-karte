import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const mapSettings = sqliteTable("map_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const deletedRoutes = sqliteTable("deleted_routes", {
  routeId: text("route_id").primaryKey(),
  deletedAt: integer("deleted_at").notNull(),
});

export const mapJunctions = sqliteTable("map_junctions", {
  id: text("id").primaryKey(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  routesJson: text("routes_json").notNull(),
  landmark: integer("landmark", { mode: "boolean" }).notNull(),
  locked: integer("locked", { mode: "boolean" }).notNull(),
  custom: integer("custom", { mode: "boolean" }).notNull(),
  updatedAt: integer("updated_at").notNull(),
});
