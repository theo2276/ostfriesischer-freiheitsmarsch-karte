import { del, get, put } from "@vercel/blob";
import { junctions as defaultJunctions, type Junction } from "./junctions";

const STATE_PATH = "ofm/map-state.json";

export type MapState = {
  directionArrows: boolean;
  deletedRouteIds: string[];
  junctions: Junction[];
  junctionPhotos: Record<string, string>;
};

function defaultState(): MapState {
  return {
    directionArrows: true,
    deletedRouteIds: [],
    junctions: defaultJunctions.map(junction => ({ ...junction })),
    junctionPhotos: {},
  };
}

function token() {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

export function storageConfigured() {
  return Boolean(token());
}

export async function readMapState(): Promise<MapState> {
  const blobToken = token();
  if (!blobToken) return defaultState();
  const result = await get(STATE_PATH, { access: "private", token: blobToken });
  if (!result || result.statusCode !== 200) return defaultState();
  const stored = await new Response(result.stream).json() as Partial<MapState>;
  return {
    directionArrows: stored.directionArrows !== false,
    deletedRouteIds: Array.isArray(stored.deletedRouteIds) ? stored.deletedRouteIds : [],
    junctions: Array.isArray(stored.junctions) ? stored.junctions : defaultState().junctions,
    junctionPhotos: stored.junctionPhotos && typeof stored.junctionPhotos === "object" ? stored.junctionPhotos : {},
  };
}

export async function writeMapState(state: MapState) {
  const blobToken = token();
  if (!blobToken) throw new Error("Vercel Blob ist nicht konfiguriert.");
  await put(STATE_PATH, JSON.stringify(state), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    token: blobToken,
  });
}

export async function updateMapState(change: (state: MapState) => MapState | void) {
  const state = await readMapState();
  const updated = change(state) ?? state;
  await writeMapState(updated);
  return updated;
}

export async function storeJunctionPhoto(id: string, photo: File) {
  const blobToken = token();
  if (!blobToken) throw new Error("Vercel Blob ist nicht konfiguriert.");
  const extension = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
  const blob = await put(`ofm/junctions/${id}-${Date.now()}.${extension}`, photo, {
    access: "private",
    addRandomSuffix: false,
    contentType: photo.type,
    token: blobToken,
  });
  return blob.pathname;
}

export async function readStoredPhoto(pathname: string) {
  const blobToken = token();
  if (!blobToken) return null;
  return get(pathname, { access: "private", token: blobToken });
}

export async function removeStoredPhoto(url?: string) {
  const blobToken = token();
  if (blobToken && url) await del(url, { token: blobToken });
}
