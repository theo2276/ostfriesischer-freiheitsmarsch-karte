type RoutePoint = { lat: number; lng: number; ele?: number; name?: string };

export async function POST(request: Request) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!geminiKey && !openaiKey) {
    return Response.json({ configured: false }, { status: 200 });
  }

  try {
    const { message, route } = await request.json() as {
      message: string;
      route: { name: string; activity: string; distanceKm: number; points: RoutePoint[] };
    };
    const instructions = `Du bist der Routenplanungs-Assistent von Marschroute. Interpretiere deutsche, natürlichsprachliche Änderungswünsche für Wander-, Lauf- und Fahrradrouten.
Antworte ausschließlich als kompaktes JSON-Objekt mit:
{"command":"normalisierter deutscher Befehl","reply":"kurze freundliche Antwort auf Deutsch"}
Der normalisierte Befehl muss eines oder mehrere dieser Schlüsselwörter enthalten, damit die Karten-Engine ihn sicher ausführen kann: "km", "west", "zweite Variante", "familienfreundlich", "Aussichtspunkt", "Parkplatz", "Waldwege", "Feldwege" oder "Bundesstraße".
Erfinde keine bereits ausgeführten Änderungen und verwende keine Markdown-Formatierung.`;
    const input = `Aktive Route: ${JSON.stringify({
      name: route.name,
      activity: route.activity,
      distanceKm: route.distanceKm,
      waypointCount: route.points.length,
      points: route.points.slice(0, 80),
    })}\n\nNutzerwunsch: ${message}`;
    const provider = geminiKey ? "gemini" : "openai";
    const model = geminiKey
      ? process.env.GEMINI_MODEL || "gemini-3.1-flash-lite"
      : process.env.OPENAI_MODEL || "gpt-5.6-sol";
    const response = await fetch(geminiKey
      ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
      : "https://api.openai.com/v1/responses", {
      method: "POST",
      signal: AbortSignal.timeout(20000),
      headers: geminiKey
        ? { "x-goog-api-key": geminiKey, "Content-Type": "application/json" }
        : { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(geminiKey
        ? { systemInstruction: { parts: [{ text: instructions }] }, contents: [{ parts: [{ text: input }] }], generationConfig: { responseMimeType: "application/json" } }
        : { model, instructions, input }),
    });

    if (!response.ok) {
      const status = response.status;
      return Response.json({ configured: true, provider, error: `${provider === "gemini" ? "Gemini" : "OpenAI"}-Anfrage fehlgeschlagen (${status})` }, { status: 502 });
    }
    const data = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }>; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = geminiKey
      ? data.candidates?.[0]?.content?.parts?.map(x => x.text ?? "").join("") ?? ""
      : data.output_text ?? data.output?.flatMap(x => x.content ?? []).map(x => x.text ?? "").join("") ?? "";
    const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
    if (typeof parsed.command !== "string" || typeof parsed.reply !== "string") throw new Error("Invalid assistant response");
    return Response.json({ configured: true, command: parsed.command, reply: parsed.reply, model, provider });
  } catch {
    return Response.json({ configured: true, error: "Die KI-Antwort konnte nicht verarbeitet werden." }, { status: 502 });
  }
}
