import { env } from "cloudflare:workers";

type D1Result<T> = { results?: T[] };
type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  run<T>(): Promise<D1Result<T>>;
};
type SettingsDatabase = { prepare(sql: string): D1Statement };

export function getSettingsDatabase() {
  const database = (env as unknown as { DB?: SettingsDatabase }).DB;
  if (!database) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  return database;
}

export async function ensureSettingsTable(database: SettingsDatabase) {
  await database.prepare(`
    CREATE TABLE IF NOT EXISTS map_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `).run();
}
