import { isAdminAuthorized } from "../../admin-session";
import { ensureSettingsTable, getSettingsDatabase } from "../../settings-store";

const DIRECTION_KEY = "direction_arrows";

export async function GET() {
  const database = getSettingsDatabase();
  await ensureSettingsTable(database);
  const row = await database.prepare("SELECT value FROM map_settings WHERE key = ?").bind(DIRECTION_KEY).first<{ value: string }>();
  return Response.json({ directionArrows: row?.value !== "false" }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!await isAdminAuthorized(request)) return Response.json({ error: "Nicht autorisiert." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { directionArrows?: unknown };
  if (typeof body.directionArrows !== "boolean") return Response.json({ error: "Ungültige Einstellung." }, { status: 400 });

  const database = getSettingsDatabase();
  await ensureSettingsTable(database);
  await database.prepare(`
    INSERT INTO map_settings (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).bind(DIRECTION_KEY, String(body.directionArrows), Date.now()).run();
  return Response.json({ directionArrows: body.directionArrows });
}
