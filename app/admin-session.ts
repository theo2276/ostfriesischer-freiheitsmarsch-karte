const COOKIE_NAME = "ofm_admin_session";
const SESSION_VALUE = "ofm-admin-authorized-v1";

function equalText(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index++) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export async function adminSessionToken() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(SESSION_VALUE));
  return btoa(String.fromCharCode(...new Uint8Array(signature))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function cookieValue(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.split(";").map(part => part.trim()).find(part => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1) ?? "";
}

export async function isAdminAuthorized(request: Request) {
  const expected = await adminSessionToken();
  return Boolean(expected && equalText(cookieValue(request), expected));
}

export function passwordMatches(password: string, configuredPassword: string) {
  return equalText(password, configuredPassword);
}

export function adminCookie(value: string, request: Request, maxAge = 43200) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
