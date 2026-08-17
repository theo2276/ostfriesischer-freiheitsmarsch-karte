import { isAdminAuthorized } from "../../admin-session";
import { readMapState, updateMapState } from "../../persistent-store";

function validCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

export async function GET() {
  const state = await readMapState();
  return Response.json({ junctions: state.junctions }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!await isAdminAuthorized(request)) return Response.json({ error: "Nicht autorisiert." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { lat?: unknown; lng?: unknown; routes?: unknown };
  if (!validCoordinate(body.lat, -90, 90) || !validCoordinate(body.lng, -180, 180)) {
    return Response.json({ error: "Ungültige Position." }, { status: 400 });
  }
  const routes = Array.isArray(body.routes) ? body.routes.filter((route): route is string => typeof route === "string") : [];
  const junction = {
    id: `junction-${crypto.randomUUID()}`,
    lat: body.lat,
    lng: body.lng,
    title: "Neuer Knotenpunkt",
    text: "Neu angelegter Streckenknoten. Weitere Informationen können hier ergänzt werden.",
    routes,
    locked: false,
    custom: true,
  };
  await updateMapState(state => { state.junctions.push(junction); });
  return Response.json({ junction });
}

export async function PATCH(request: Request) {
  if (!await isAdminAuthorized(request)) return Response.json({ error: "Nicht autorisiert." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { id?: unknown; lat?: unknown; lng?: unknown; locked?: unknown };
  if (typeof body.id !== "string") return Response.json({ error: "Knotenpunkt fehlt." }, { status: 400 });
  const state = await readMapState();
  const current = state.junctions.find(junction => junction.id === body.id);
  if (!current) return Response.json({ error: "Knotenpunkt nicht gefunden." }, { status: 404 });
  const lat = body.lat === undefined ? current.lat : body.lat;
  const lng = body.lng === undefined ? current.lng : body.lng;
  const locked = body.locked === undefined ? Boolean(current.locked) : body.locked;
  if (!validCoordinate(lat, -90, 90) || !validCoordinate(lng, -180, 180) || typeof locked !== "boolean") {
    return Response.json({ error: "Ungültige Änderung." }, { status: 400 });
  }
  await updateMapState(next => {
    next.junctions = next.junctions.map(junction => junction.id === body.id ? { ...junction, lat, lng, locked } : junction);
  });
  return Response.json({ junction: { ...current, lat, lng, locked } });
}
