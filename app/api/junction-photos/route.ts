import { isAdminAuthorized } from "../../admin-session";
import { readMapState, readStoredPhoto, removeStoredPhoto, storeJunctionPhoto, updateMapState } from "../../persistent-store";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function validId(id: string | null): id is string {
  return Boolean(id && /^[a-z0-9-]{3,80}$/i.test(id));
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  const state = await readMapState();
  if (id) {
    if (!validId(id) || !state.junctionPhotos[id]) return Response.json({ error: "Kein Foto vorhanden." }, { status: 404 });
    const photo = await readStoredPhoto(state.junctionPhotos[id]);
    if (!photo || photo.statusCode !== 200) return Response.json({ error: "Kein Foto vorhanden." }, { status: 404 });
    return new Response(photo.stream, {
      headers: {
        "Content-Type": photo.blob.contentType,
        "Cache-Control": "public, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  const version = Date.now();
  const photos = Object.keys(state.junctionPhotos).map(photoId => ({
    id: photoId,
    url: `/api/junction-photos?id=${encodeURIComponent(photoId)}&v=${version}`,
  }));
  return Response.json({ photos }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!await isAdminAuthorized(request)) return Response.json({ error: "Nicht autorisiert." }, { status: 401 });
  const form = await request.formData();
  const id = form.get("id");
  const photo = form.get("photo");
  if (typeof id !== "string" || !validId(id)) return Response.json({ error: "Unbekannter Knotenpunkt." }, { status: 400 });
  if (!(photo instanceof File) || !ALLOWED_TYPES.has(photo.type)) return Response.json({ error: "Bitte JPG, PNG oder WebP auswählen." }, { status: 400 });
  if (photo.size > MAX_FILE_SIZE) return Response.json({ error: "Das Bild darf höchstens 5 MB groß sein." }, { status: 413 });
  const current = await readMapState();
  if (!current.junctions.some(junction => junction.id === id)) return Response.json({ error: "Unbekannter Knotenpunkt." }, { status: 400 });
  const previousUrl = current.junctionPhotos[id];
  const pathname = await storeJunctionPhoto(id, photo);
  await updateMapState(state => { state.junctionPhotos[id] = pathname; });
  await removeStoredPhoto(previousUrl);
  return Response.json({ id, url: `/api/junction-photos?id=${encodeURIComponent(id)}&v=${Date.now()}` });
}

export async function DELETE(request: Request) {
  if (!await isAdminAuthorized(request)) return Response.json({ error: "Nicht autorisiert." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!validId(id)) return Response.json({ error: "Unbekannter Knotenpunkt." }, { status: 400 });
  const state = await readMapState();
  const url = state.junctionPhotos[id];
  await updateMapState(next => { delete next.junctionPhotos[id]; });
  await removeStoredPhoto(url);
  return Response.json({ deleted: true });
}
