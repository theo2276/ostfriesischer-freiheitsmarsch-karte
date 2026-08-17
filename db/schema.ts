import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const mapSettings = sqliteTable("map_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
