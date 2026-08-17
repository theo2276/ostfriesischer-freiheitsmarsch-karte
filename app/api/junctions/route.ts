import { isAdminAuthorized } from "../../admin-session";
import { ensureMapDataTables, junctionFromRow } from "../../map-data-store";
import { getSettingsDatabase } from "../../settings-store";

type JunctionRow = Parameters<typeof junctionFromRow>[0];

function validCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

export async function GET() {
  const database = getSettingsDatabase();
  await ensureMapDataTables(database);
  const result = await database.prepare("SELECT * FROM map_junctions ORDER BY custom ASC, updated_at ASC").run<JunctionRow>();
  return Response.json({ junctions: (result.results ?? []).map(junctionFromRow) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!await isAdminAuthorized(request)) return Response.json({ error: "Nicht autorisiert." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { lat?: unknown; lng?: unknown; routes?: unknown };
  if (!validCoordinate(body.lat, -90, 90) || !validCoordinate(body.lng, -180, 180)) {
    return Response.json({ error: "Ungültige Position." }, { status: 400 });
  }
  const routes = Array.isArray(body.routes) ? body.routes.filter((route): route is string => typeof route === "string") : [];
  const id = `junction-${crypto.randomUUID()}`;
  const database = getSettingsDatabase();
  await ensureMapDataTables(database);
  await database.prepare(`
    INSERT INTO map_junctions (id, lat, lng, title, description, routes_json, landmark, locked, custom, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, 0, 1, ?)
  `).bind(id, body.lat, body.lng, "Neuer Knotenpunkt", "Neu angelegter Streckenknoten. Weitere Informationen können hier ergänzt werden.", JSON.stringify(routes), Date.now()).run();
  return Response.json({ junction: { id, lat: body.lat, lng: body.lng, title: "Neuer Knotenpunkt", text: "Neu angelegter Streckenknoten. Weitere Informationen können hier ergänzt werden.", routes, locked: false, custom: true } });
}

export async function PATCH(request: Request) {
  if (!await isAdminAuthorized(request)) return Response.json({ error: "Nicht autorisiert." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { id?: unknown; lat?: unknown; lng?: unknown; locked?: unknown };
  if (typeof body.id !== "string") return Response.json({ error: "Knotenpunkt fehlt." }, { status: 400 });
  const database = getSettingsDatabase();
  await ensureMapDataTables(database);
  const current = await database.prepare("SELECT * FROM map_junctions WHERE id = ?").bind(body.id).first<JunctionRow>();
  if (!current) return Response.json({ error: "Knotenpunkt nicht gefunden." }, { status: 404 });
  const lat = body.lat === undefined ? current.lat : body.lat;
  const lng = body.lng === undefined ? current.lng : body.lng;
  const locked = body.locked === undefined ? Boolean(current.locked) : body.locked;
  if (!validCoordinate(lat, -90, 90) || !validCoordinate(lng, -180, 180) || typeof locked !== "boolean") {
    return Response.json({ error: "Ungültige Änderung." }, { status: 400 });
  }
  await database.prepare("UPDATE map_junctions SET lat = ?, lng = ?, locked = ?, updated_at = ? WHERE id = ?")
    .bind(lat, lng, locked ? 1 : 0, Date.now(), body.id).run();
  return Response.json({ junction: { ...junctionFromRow(current), lat, lng, locked } });
}
