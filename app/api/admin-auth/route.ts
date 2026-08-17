import { adminCookie, adminSessionToken, isAdminAuthorized, passwordMatches } from "../../admin-session";

export async function GET(request: Request) {
  const authorized = await isAdminAuthorized(request);
  return Response.json({ authorized }, { status: authorized ? 200 : 401, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const expected = await adminSessionToken();
  if (!configuredPassword || !expected) return Response.json({ error: "Admin-Zugang ist nicht konfiguriert." }, { status: 503 });

  const body = await request.json().catch(() => ({})) as { password?: string };
  if (!passwordMatches(body.password ?? "", configuredPassword)) {
    await new Promise(resolve => setTimeout(resolve, 350));
    return Response.json({ error: "Ungültiges Passwort." }, { status: 401 });
  }

  return Response.json({ authorized: true }, {
    headers: {
      "Cache-Control": "no-store",
      "Set-Cookie": adminCookie(expected, request),
    },
  });
}

export async function DELETE(request: Request) {
  return Response.json({ authorized: false }, {
    headers: { "Set-Cookie": adminCookie("", request, 0) },
  });
}
