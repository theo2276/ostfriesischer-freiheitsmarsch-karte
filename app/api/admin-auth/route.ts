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

async function sessionToken() {
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

export async function GET(request: Request) {
  const expected = await sessionToken();
  const authorized = Boolean(expected && equalText(cookieValue(request), expected));
  return Response.json({ authorized }, { status: authorized ? 200 : 401, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const expected = await sessionToken();
  if (!configuredPassword || !expected) return Response.json({ error: "Admin-Zugang ist nicht konfiguriert." }, { status: 503 });

  const body = await request.json().catch(() => ({})) as { password?: string };
  if (!equalText(body.password ?? "", configuredPassword)) {
    await new Promise(resolve => setTimeout(resolve, 350));
    return Response.json({ error: "Ungültiges Passwort." }, { status: 401 });
  }

  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return Response.json({ authorized: true }, {
    headers: {
      "Cache-Control": "no-store",
      "Set-Cookie": `${COOKIE_NAME}=${expected}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200${secure}`,
    },
  });
}

export async function DELETE(request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return Response.json({ authorized: false }, {
    headers: { "Set-Cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}` },
  });
}
