import { isAdminAuthorized } from "../../admin-session";
import { getMediaBucket } from "../../media";

const PREFIX = "junctions/";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function keyFor(id: string) {
  return `${PREFIX}${id}`;
}

function validId(id: string | null): id is string {
  return Boolean(id && /^[a-z0-9-]{3,80}$/i.test(id));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const bucket = getMediaBucket();

  if (id) {
    if (!validId(id)) return Response.json({ error: "Unbekannter Knotenpunkt." }, { status: 404 });
    const object = await bucket.get(keyFor(id));
    if (!object) return Response.json({ error: "Kein Foto vorhanden." }, { status: 404 });
    return new Response(object.body, {
      headers: {
        "Content-Type": object.httpMetadata?.contentType ?? "image/jpeg",
        "Cache-Control": "public, max-age=60",
        "ETag": object.etag,
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const objects = await bucket.list({ prefix: PREFIX });
  const version = Date.now();
  const photos = objects.objects
    .map(object => object.key.slice(PREFIX.length))
    .filter(photoId => validId(photoId))
    .map(photoId => ({ id: photoId, url: `/api/junction-photos?id=${encodeURIComponent(photoId)}&v=${version}` }));
  return Response.json({ photos }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!await isAdminAuthorized(request)) return Response.json({ error: "Nicht autorisiert." }, { status: 401 });
  const form = await request.formData();
  const id = form.get("id");
  const photo = form.get("photo");
  if (typeof id !== "string" || !validId(id)) return Response.json({ error: "Unbekannter Knotenpunkt." }, { status: 400 });
  if (!(photo instanceof File) || !ALLOWED_TYPES.has(photo.type)) {
    return Response.json({ error: "Bitte JPG, PNG oder WebP auswählen." }, { status: 400 });
  }
  if (photo.size > MAX_FILE_SIZE) return Response.json({ error: "Das Bild darf höchstens 5 MB groß sein." }, { status: 413 });

  await getMediaBucket().put(keyFor(id), photo.stream(), { httpMetadata: { contentType: photo.type } });
  return Response.json({ id, url: `/api/junction-photos?id=${encodeURIComponent(id)}&v=${Date.now()}` });
}

export async function DELETE(request: Request) {
  if (!await isAdminAuthorized(request)) return Response.json({ error: "Nicht autorisiert." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!validId(id)) return Response.json({ error: "Unbekannter Knotenpunkt." }, { status: 400 });
  await getMediaBucket().delete(keyFor(id));
  return Response.json({ deleted: true });
}
