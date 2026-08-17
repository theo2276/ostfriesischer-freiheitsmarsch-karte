import { getSettingsDatabase } from "./settings-store";
import { junctions as defaultJunctions, type Junction } from "./junctions";

type D1Database = ReturnType<typeof getSettingsDatabase>;

export async function ensureMapDataTables(database: D1Database) {
  await database.prepare(`
    CREATE TABLE IF NOT EXISTS deleted_routes (
      route_id TEXT PRIMARY KEY NOT NULL,
      deleted_at INTEGER NOT NULL
    )
  `).run();
  await database.prepare(`
    CREATE TABLE IF NOT EXISTS map_junctions (
      id TEXT PRIMARY KEY NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      routes_json TEXT NOT NULL,
      landmark INTEGER NOT NULL DEFAULT 0,
      locked INTEGER NOT NULL DEFAULT 0,
      custom INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    )
  `).run();

  for (const junction of defaultJunctions) {
    await database.prepare(`
      INSERT INTO map_junctions (id, lat, lng, title, description, routes_json, landmark, locked, custom, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      ON CONFLICT(id) DO NOTHING
    `).bind(
      junction.id,
      junction.lat,
      junction.lng,
      junction.title,
      junction.text,
      JSON.stringify(junction.routes),
      junction.landmark ? 1 : 0,
      junction.locked ? 1 : 0,
      Date.now(),
    ).run();
  }
}

type JunctionRow = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  routes_json: string;
  landmark: number;
  locked: number;
  custom: number;
};

export function junctionFromRow(row: JunctionRow): Junction {
  return {
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    title: row.title,
    text: row.description,
    routes: JSON.parse(row.routes_json) as string[],
    landmark: Boolean(row.landmark),
    locked: Boolean(row.locked),
    custom: Boolean(row.custom),
  };
}
