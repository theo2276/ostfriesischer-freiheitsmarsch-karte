import { isAdminAuthorized } from "../../admin-session";
import { readMapState, storageConfigured, updateMapState } from "../../persistent-store";

export async function GET() {
  const state = await readMapState();
  return Response.json({ directionArrows: state.directionArrows, storageConfigured: storageConfigured() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!await isAdminAuthorized(request)) return Response.json({ error: "Nicht autorisiert." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { directionArrows?: unknown };
  if (typeof body.directionArrows !== "boolean") return Response.json({ error: "Ungültige Einstellung." }, { status: 400 });

  await updateMapState(state => { state.directionArrows = body.directionArrows as boolean; });
  return Response.json({ directionArrows: body.directionArrows });
}
