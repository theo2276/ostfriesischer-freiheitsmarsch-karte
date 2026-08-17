import officialRoutes from "../../freiheitsmarsch-routes.json";
import { isAdminAuthorized } from "../../admin-session";
import { readMapState, updateMapState } from "../../persistent-store";

const routeIds = new Set((officialRoutes as Array<{ id: string }>).map(route => route.id));

export async function GET() {
  const state = await readMapState();
  return Response.json({ deletedIds: state.deletedRouteIds }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  if (!await isAdminAuthorized(request)) return Response.json({ error: "Nicht autorisiert." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { id?: unknown };
  if (typeof body.id !== "string" || !routeIds.has(body.id)) return Response.json({ error: "Unbekannte Strecke." }, { status: 400 });
  await updateMapState(state => {
    if (!state.deletedRouteIds.includes(body.id as string)) state.deletedRouteIds.push(body.id as string);
  });
  return Response.json({ deleted: true, id: body.id });
}
