import { env } from "cloudflare:workers";

type StoredMedia = {
  body: ReadableStream;
  etag: string;
  httpMetadata?: { contentType?: string };
};

type MediaBucket = {
  get(key: string): Promise<StoredMedia | null>;
  put(key: string, value: ReadableStream, options: { httpMetadata: { contentType: string } }): Promise<unknown>;
  delete(key: string): Promise<void>;
  list(options: { prefix: string }): Promise<{ objects: Array<{ key: string }> }>;
};

export function getMediaBucket() {
  const bucket = (env as unknown as { MEDIA?: MediaBucket }).MEDIA;
  if (!bucket) throw new Error("Cloudflare R2 binding `MEDIA` is unavailable.");
  return bucket;
}
