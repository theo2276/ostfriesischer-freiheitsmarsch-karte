import officialRoutes from "../../freiheitsmarsch-routes.json";
import { isAdminAuthorized } from "../../admin-session";
import { ensureMapDataTables } from "../../map-data-store";
import { getSettingsDatabase } from "../../settings-store";

const routeIds = new Set((officialRoutes as Array<{ id: string }>).map(route => route.id));

export async function GET() {
  const database = getSettingsDatabase();
  await ensureMapDataTables(database);
  const result = await database.prepare("SELECT route_id FROM deleted_routes ORDER BY deleted_at ASC").run<{ route_id: string }>();
  return Response.json({ deletedIds: (result.results ?? []).map(row => row.route_id) }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  if (!await isAdminAuthorized(request)) return Response.json({ error: "Nicht autorisiert." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { id?: unknown };
  if (typeof body.id !== "string" || !routeIds.has(body.id)) return Response.json({ error: "Unbekannte Strecke." }, { status: 400 });
  const database = getSettingsDatabase();
  await ensureMapDataTables(database);
  await database.prepare("INSERT INTO deleted_routes (route_id, deleted_at) VALUES (?, ?) ON CONFLICT(route_id) DO NOTHING")
    .bind(body.id, Date.now()).run();
  return Response.json({ deleted: true, id: body.id });
}
