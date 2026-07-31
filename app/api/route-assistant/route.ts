type RoutePoint = { lat: number; lng: number; ele?: number; name?: string };

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ configured: false }, { status: 200 });
  }

  try {
    const { message, route } = await request.json() as {
      message: string;
      route: { name: string; activity: string; distanceKm: number; points: RoutePoint[] };
    };
    const model = process.env.OPENAI_MODEL || "gpt-5.6-sol";
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: `Du bist der Routenplanungs-Assistent von Marschroute. Interpretiere deutsche, natürlichsprachliche Änderungswünsche für Wander-, Lauf- und Fahrradrouten.
Antworte ausschließlich als kompaktes JSON-Objekt mit:
{"command":"normalisierter deutscher Befehl","reply":"kurze freundliche Antwort auf Deutsch"}
Der normalisierte Befehl muss eines oder mehrere dieser Schlüsselwörter enthalten, damit die Karten-Engine ihn sicher ausführen kann: "km", "west", "zweite Variante", "familienfreundlich", "Aussichtspunkt", "Parkplatz", "Waldwege", "Feldwege" oder "Bundesstraße".
Erfinde keine bereits ausgeführten Änderungen und verwende keine Markdown-Formatierung.`,
        input: `Aktive Route: ${JSON.stringify({
          name: route.name,
          activity: route.activity,
          distanceKm: route.distanceKm,
          waypointCount: route.points.length,
          points: route.points.slice(0, 80),
        })}\n\nNutzerwunsch: ${message}`,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      return Response.json({ configured: true, error: `OpenAI-Anfrage fehlgeschlagen (${status})` }, { status: 502 });
    }
    const data = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
    const text = data.output_text ?? data.output?.flatMap(x => x.content ?? []).map(x => x.text ?? "").join("") ?? "";
    const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
    return Response.json({ configured: true, command: parsed.command, reply: parsed.reply, model });
  } catch {
    return Response.json({ configured: true, error: "Die OpenAI-Antwort konnte nicht verarbeitet werden." }, { status: 502 });
  }
}
