"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, Marker, Polyline } from "leaflet";
import officialRoutes from "../freiheitsmarsch-routes.json";
import { OfmIcon, type OfmIconName } from "../icons";
import { AdminGate } from "../admin-auth";
import { junctions } from "../junctions";
import { directionArrowPoints } from "../route-arrows";

type Point = { lat: number; lng: number; ele: number; name?: string };
type Route = {
  id: string;
  name: string;
  color: string;
  width: number;
  visible: boolean;
  points: Point[];
  activity: "Wandern" | "Laufen" | "Fahrrad";
  komootId?: string;
  fullName?: string;
  day?: string;
  officialDistance?: number;
  elevationUp?: number;
  sourceUrl?: string;
};
type Message = { role: "ai" | "user"; text: string };

const initialRoutes = officialRoutes as Route[];

function distance(points: Point[]) {
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], r = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    sum += 2 * r * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }
  return sum;
}

function formatTime(hours: number) {
  const h = Math.floor(hours), m = Math.round((hours - h) * 60);
  return h ? `${h} Std. ${m} Min.` : `${m} Min.`;
}

function Icon({ name }: { name: OfmIconName }) {
  return <span className="icon"><OfmIcon name={name} /></span>;
}

export default function Home() {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layersRef = useRef<{ lines: Polyline[]; markers: Marker[] }>({ lines: [], markers: [] });
  const fileRef = useRef<HTMLInputElement>(null);
  const modeRef = useRef<"select" | "add" | "delete">("select");
  const activeIdRef = useRef(initialRoutes[0].id);
  const [routes, setRoutes] = useState<Route[]>(() => initialRoutes.map((r, i) => ({ ...r, visible: i === 0 })));
  const [mapReady, setMapReady] = useState(false);
  const [activeId, setActiveId] = useState(initialRoutes[0].id);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "Moin! Ich habe den Freiheitsmarsch als editierbare Rundstrecke vorbereitet. Was möchtest du ändern?" },
  ]);
  const [mode, setMode] = useState<"select" | "add" | "delete">("select");
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<"chat" | "routes" | "junctions" | "settings">("chat");
  const [junctionPhotos, setJunctionPhotos] = useState<Record<string, string>>({});
  const [junctionBusy, setJunctionBusy] = useState<string | null>(null);
  const [junctionMessage, setJunctionMessage] = useState("");
  const [directionArrows, setDirectionArrows] = useState(true);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [rightOpen, setRightOpen] = useState(true);
  const [aiMode, setAiMode] = useState<"checking" | "openai" | "demo">("checking");
  const [focusMode, setFocusMode] = useState(false);
  const [modules, setModules] = useState({ tools: true, assistant: false, stats: true, elevation: true });
  const active = routes.find(r => r.id === activeId) ?? routes[0];
  const km = useMemo(() => distance(active?.points ?? []), [active]);
  const ascent = useMemo(() => (active?.points ?? []).reduce((s, p, i, arr) => s + (i && p.ele > arr[i - 1].ele ? p.ele - arr[i - 1].ele : 0), 0), [active]);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  useEffect(() => { refreshJunctionPhotos(); }, []);
  useEffect(() => {
    fetch("/api/map-settings", { cache: "no-store" })
      .then(response => response.ok ? response.json() : { directionArrows: true })
      .then(data => setDirectionArrows(data.directionArrows !== false))
      .catch(() => setDirectionArrows(true));
  }, []);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    let alive = true;
    import("leaflet").then(L => {
      if (!alive || !mapEl.current || mapRef.current) return;
      const map = L.map(mapEl.current, { zoomControl: false, attributionControl: true }).setView([53.4646, 7.4771], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap", maxZoom: 19,
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      map.on("click", e => {
        if (modeRef.current === "add") {
          setRoutes(rs => rs.map(r => r.id === activeIdRef.current ? { ...r, points: [...r.points.slice(0, -1), { lat: e.latlng.lat, lng: e.latlng.lng, ele: 6 }, r.points.at(-1)!] } : r));
        }
      });
      mapRef.current = map;
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 100);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    import("leaflet").then(L => {
      layersRef.current.lines.forEach(l => l.remove());
      layersRef.current.markers.forEach(m => m.remove());
      layersRef.current = { lines: [], markers: [] };
      routes.filter(r => r.visible).forEach(r => {
        const line = L.polyline(r.points.map(p => [p.lat, p.lng]), { color: r.color, weight: r.width, opacity: r.id === activeId ? .96 : .68, dashArray: r.id === activeId ? undefined : "8 8" }).addTo(map);
        line.on("click", () => setActiveId(r.id));
        layersRef.current.lines.push(line);
        if (directionArrows) {
          directionArrowPoints(r.points).forEach(arrow => {
            const marker = L.marker([arrow.lat, arrow.lng], {
              interactive: false,
              keyboard: false,
              icon: L.divIcon({
                className: "route-direction-arrow",
                html: `<span style="transform:rotate(${arrow.angle}deg)">➤</span>`,
                iconSize: [22, 22],
                iconAnchor: [11, 11],
              }),
            }).addTo(map);
            layersRef.current.markers.push(marker);
          });
        }
        if (r.id === activeId) {
          const markerStep = Math.max(1, Math.ceil(r.points.length / 36));
          r.points.forEach((p, index) => {
            if (index !== 0 && index !== r.points.length - 1 && index % markerStep !== 0) return;
            const cls = index === 0 ? "waypoint start" : index === r.points.length - 1 ? "waypoint finish" : "waypoint";
            const marker = L.marker([p.lat, p.lng], {
              draggable: true,
              icon: L.divIcon({ className: cls, html: `<span>${index === 0 ? "▶" : index === r.points.length - 1 ? "■" : index}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] }),
            }).addTo(map);
            marker.bindTooltip(p.name ?? `Wegpunkt ${index + 1}`, { direction: "top", offset: [0, -12] });
            marker.on("dragend", e => {
              const pos = e.target.getLatLng();
              setRoutes(rs => rs.map(x => x.id === r.id ? { ...x, points: x.points.map((q, j) => j === index ? { ...q, lat: pos.lat, lng: pos.lng } : q) } : x));
            });
            marker.on("click", () => {
              if (mode === "delete" && r.points.length > 2) setRoutes(rs => rs.map(x => x.id === r.id ? { ...x, points: x.points.filter((_, j) => j !== index) } : x));
            });
            layersRef.current.markers.push(marker);
          });
        }
      });
      junctions.forEach(junction => {
        const photo = junctionPhotos[junction.id];
        const marker = L.marker([junction.lat, junction.lng], {
          icon: L.divIcon({
            className: `admin-junction-marker ${junction.landmark ? "landmark" : ""} ${photo ? "has-photo" : ""}`,
            html: `<span>${photo ? `<img src="${photo}" alt="">` : junction.landmark ? "U" : "+"}</span>`,
            iconSize: junction.landmark ? [40, 46] : [32, 32],
            iconAnchor: junction.landmark ? [20, 44] : [16, 16],
          }),
        }).addTo(map).bindTooltip(junction.title, { direction: "top", offset: [0, -12] });
        marker.on("click", () => {
          setPanel("junctions");
          setJunctionMessage(`${junction.title} ausgewählt.`);
        });
        layersRef.current.markers.push(marker);
      });
    });
  }, [routes, activeId, mode, mapReady, junctionPhotos, directionArrows]);

  async function refreshJunctionPhotos() {
    const response = await fetch("/api/junction-photos", { cache: "no-store" }).catch(() => null);
    const data = response?.ok ? await response.json() : { photos: [] };
    setJunctionPhotos(Object.fromEntries((data.photos ?? []).map((photo: { id: string; url: string }) => [photo.id, photo.url])));
  }

  async function uploadJunctionPhoto(id: string, file?: File) {
    if (!file || junctionBusy) return;
    setJunctionBusy(id);
    setJunctionMessage("");
    const form = new FormData();
    form.set("id", id);
    form.set("photo", file);
    const response = await fetch("/api/junction-photos", { method: "POST", body: form }).catch(() => null);
    const data = response ? await response.json().catch(() => ({})) : {};
    if (response?.ok) {
      setJunctionPhotos(current => ({ ...current, [id]: data.url }));
      setJunctionMessage("Das Foto wurde gespeichert und ist auf der Besucherkarte sichtbar.");
    } else {
      setJunctionMessage(data.error ?? "Das Foto konnte nicht gespeichert werden.");
    }
    setJunctionBusy(null);
  }

  async function removeJunctionPhoto(id: string) {
    if (junctionBusy) return;
    setJunctionBusy(id);
    setJunctionMessage("");
    const response = await fetch(`/api/junction-photos?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);
    if (response?.ok) {
      setJunctionPhotos(current => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setJunctionMessage("Das Knotenpunktfoto wurde entfernt.");
    } else {
      setJunctionMessage("Das Foto konnte nicht entfernt werden.");
    }
    setJunctionBusy(null);
  }

  async function saveDirectionArrows(enabled: boolean) {
    if (settingsBusy) return;
    const previous = directionArrows;
    setDirectionArrows(enabled);
    setSettingsBusy(true);
    setSettingsMessage("");
    const response = await fetch("/api/map-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ directionArrows: enabled }),
    }).catch(() => null);
    if (response?.ok) {
      setSettingsMessage(enabled ? "Weiße Richtungspfeile sind eingeschaltet." : "Richtungspfeile sind ausgeschaltet.");
    } else {
      setDirectionArrows(previous);
      setSettingsMessage("Die Einstellung konnte nicht gespeichert werden.");
    }
    setSettingsBusy(false);
  }

  function updateActive(fn: (r: Route) => Route) {
    setRoutes(rs => rs.map(r => r.id === activeId ? fn(r) : r));
  }

  function selectRoute(id: string) {
    setActiveId(id);
    setRoutes(rs => rs.map(r => ({ ...r, visible: r.id === id })));
    const selected = routes.find(r => r.id === id);
    if (selected) setTimeout(() => mapRef.current?.fitBounds(selected.points.map(p => [p.lat, p.lng]), { padding: [34, 34] }), 30);
  }

  function toggleModule(key: keyof typeof modules) {
    setModules(current => ({ ...current, [key]: !current[key] }));
  }

  async function runAI(raw: string) {
    const command = raw.trim();
    if (!command || busy) return;
    setMessages(m => [...m, { role: "user", text: command }]);
    setInput("");
    setBusy(true);
    let interpreted = command;
    let apiReply = "";
    try {
      const result = await fetch("/api/route-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: command, route: { name: active.name, activity: active.activity, distanceKm: km, points: active.points } }),
      }).then(r => r.json());
      if (result.configured && result.command) {
        interpreted = result.command;
        apiReply = result.reply ?? "";
        setAiMode("openai");
      } else {
        setAiMode("demo");
      }
    } catch {
      setAiMode("demo");
    }
    {
      let response = "Die Route wurde neu berechnet und alle Kennzahlen sind aktuell.";
      const lower = interpreted.toLowerCase();
      if (lower.includes("zweite") || lower.includes("variante")) {
        const clone = { ...active, id: `route-${Date.now()}`, name: `${active.name} · Variante ${routes.length + 1}`, color: "#7557d5", points: active.points.map((p, i) => ({ ...p, lng: p.lng + (i > 0 && i < active.points.length - 1 ? .006 : 0) })) };
        setRoutes(rs => [...rs, clone]); setActiveId(clone.id);
        response = "Ich habe eine zweite, etwas östlichere Variante angelegt.";
      } else if (lower.includes("west")) {
        updateActive(r => ({ ...r, points: r.points.map(p => ({ ...p, lng: p.lng - .0045 })) }));
        response = "Die gesamte Strecke liegt jetzt ungefähr 300 Meter weiter westlich.";
      } else if (lower.includes("familien")) {
        updateActive(r => ({ ...r, name: `${r.name.replace(" · familienfreundlich", "")} · familienfreundlich`, width: 6, points: r.points.filter((_, i) => i % 2 === 0 || i === r.points.length - 1) }));
        response = "Ich habe Steigungen reduziert, die Wegführung vereinfacht und breite, ruhige Wege priorisiert.";
      } else if (lower.includes("aussicht")) {
        const p = { lat: 53.5038, lng: 7.489, ele: 14, name: "Aussichtspunkt Upstalsboom" };
        updateActive(r => ({ ...r, points: [...r.points.slice(0, 4), p, ...r.points.slice(4)] }));
        response = "Der Aussichtspunkt Upstalsboom ist als neuer Wegpunkt eingefügt.";
      } else if (lower.includes("parkplatz")) {
        const p = { lat: 53.4668, lng: 7.4774, ele: 5, name: "Parkplatz Ellernfeld" };
        updateActive(r => ({ ...r, points: [p, ...r.points.slice(1, -1), p] }));
        response = "Start und Ziel liegen jetzt am Parkplatz Ellernfeld.";
      } else {
        const match = lower.match(/(\d+(?:[,.]\d+)?)\s*(?:km|kilometer)/);
        if (match) {
          const target = Number(match[1].replace(",", "."));
          const ratio = Math.max(.35, Math.min(2.2, target / Math.max(km, .1)));
          const c = active.points[0];
          updateActive(r => ({ ...r, name: `${r.name.split(" · ")[0]} · ${target} km`, points: r.points.map(p => ({ ...p, lat: c.lat + (p.lat - c.lat) * ratio, lng: c.lng + (p.lng - c.lng) * ratio })) }));
          response = `Erledigt — ich habe die Rundstrecke auf etwa ${target.toLocaleString("de-DE")} km angepasst.`;
        } else if (lower.includes("wald") || lower.includes("feldweg") || lower.includes("bundesstraße")) {
          updateActive(r => ({ ...r, points: r.points.map((p, i) => i > 1 && i < r.points.length - 2 ? { ...p, lat: p.lat + .003, ele: p.ele + 2 } : p) }));
          response = "Die Route nutzt jetzt stärker Wald- und Feldwege und meidet die größeren Straßen.";
        }
      }
      setMessages(m => [...m, { role: "ai", text: apiReply || response }]);
      setBusy(false);
    }
  }

  function addRoute() {
    const r: Route = { ...active, id: `neu-${Date.now()}`, name: `${active.name} · eigene Variante`, fullName: undefined, sourceUrl: undefined, komootId: undefined, color: "#2b71d6", points: active.points.map(p => ({ ...p, lat: p.lat - .0015, lng: p.lng + .0015 })) };
    setRoutes(rs => [...rs, r]); setActiveId(r.id); setPanel("routes");
  }

  function exportFile(kind: "geojson" | "gpx" | "kml" | "svg") {
    const coords = active.points;
    let body = "", type = "application/xml";
    if (kind === "geojson") {
      body = JSON.stringify({ type: "Feature", properties: { name: active.name }, geometry: { type: "LineString", coordinates: coords.map(p => [p.lng, p.lat, p.ele]) } }, null, 2);
      type = "application/geo+json";
    } else if (kind === "gpx") {
      body = `<?xml version="1.0"?><gpx version="1.1" creator="Marschroute"><trk><name>${active.name}</name><trkseg>${coords.map(p => `<trkpt lat="${p.lat}" lon="${p.lng}"><ele>${p.ele}</ele></trkpt>`).join("")}</trkseg></trk></gpx>`;
    } else if (kind === "kml") {
      body = `<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>${active.name}</name><LineString><coordinates>${coords.map(p => `${p.lng},${p.lat},${p.ele}`).join(" ")}</coordinates></LineString></Placemark></Document></kml>`;
    } else {
      const xs = coords.map(p => p.lng), ys = coords.map(p => p.lat), minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      const pts = coords.map(p => `${20 + (p.lng - minX) / (maxX - minX || 1) * 760},${380 - (p.lat - minY) / (maxY - minY || 1) * 340}`).join(" ");
      body = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420"><rect width="100%" height="100%" fill="#f3f1e9"/><text x="24" y="34" font-family="sans-serif" font-size="20">${active.name}</text><polyline points="${pts}" fill="none" stroke="${active.color}" stroke-width="${active.width}" stroke-linejoin="round"/></svg>`;
      type = "image/svg+xml";
    }
    const url = URL.createObjectURL(new Blob([body], { type }));
    const a = document.createElement("a"); a.href = url; a.download = `${active.name.replace(/\s+/g, "-").toLowerCase()}.${kind}`; a.click(); URL.revokeObjectURL(url);
  }

  function importRoute(file?: File) {
    if (!file) return;
    file.text().then(text => {
      let points: Point[] = [];
      if (file.name.endsWith(".geojson") || file.name.endsWith(".json")) {
        const data = JSON.parse(text); const c = data.geometry?.coordinates ?? data.features?.[0]?.geometry?.coordinates ?? [];
        points = c.map((x: number[]) => ({ lng: x[0], lat: x[1], ele: x[2] ?? 5 }));
      } else {
        const doc = new DOMParser().parseFromString(text, "text/xml");
        const trk = [...doc.querySelectorAll("trkpt")];
        points = trk.length ? trk.map(n => ({ lat: Number(n.getAttribute("lat")), lng: Number(n.getAttribute("lon")), ele: Number(n.querySelector("ele")?.textContent ?? 5) })) :
          [...doc.querySelectorAll("coordinates")][0]?.textContent?.trim().split(/\s+/).map(s => { const [lng, lat, ele] = s.split(",").map(Number); return { lng, lat, ele: ele || 5 }; }) ?? [];
      }
      if (points.length > 1) {
        const r: Route = { id: `import-${Date.now()}`, name: file.name.replace(/\.[^.]+$/, ""), color: "#7557d5", width: 5, visible: true, points, activity: "Wandern" };
        setRoutes(rs => [...rs, r]); setActiveId(r.id);
        setMessages(m => [...m, { role: "ai", text: `${file.name} wurde als editierbare Route importiert.` }]);
      }
    });
  }

  async function logoutAdmin() {
    await fetch("/api/admin-auth", { method: "DELETE" });
    window.location.href = "/admin";
  }

  return (
    <AdminGate>
    <main className={`app-shell ${focusMode ? "focus-mode" : ""} ${focusMode && modules.assistant ? "chat-open" : ""}`}>
      <header>
        <div className="brand"><div className="brand-mark"><OfmIcon name="logo-figure" size={25} title="Freiheitsmarsch" /></div><div><strong>Marschroute</strong><span>Admin-Routenplanung</span></div><b className="admin-badge">ADMIN</b></div>
        <div className="route-title"><span className="status-dot" /><strong>{active.name}</strong><span className="saved">Gespeichert</span></div>
        <div className="header-actions">
          <a className="ghost app-link" href="/ofm-karte" target="_blank" rel="noreferrer"><Icon name="map" /> Besucherkarte</a>
          <button className="ghost" onClick={logoutAdmin}>Abmelden</button>
          <button className="ghost focus-button" onClick={() => { setFocusMode(true); setTimeout(() => mapRef.current?.invalidateSize(), 60); }}><Icon name="expand" /> Kartenmodus</button>
          <button className="ghost" onClick={() => fileRef.current?.click()}><Icon name="upload" /> Import</button>
          <div className="export-wrap"><button className="primary">Export <OfmIcon name="chevron-down" size={14} /></button><div className="export-menu">{(["gpx", "geojson", "kml", "svg"] as const).map(x => <button key={x} onClick={() => exportFile(x)}>{x.toUpperCase()}</button>)}<button onClick={() => window.print()}>PDF / PNG</button></div></div>
          <input ref={fileRef} hidden type="file" accept=".gpx,.kml,.geojson,.json" onChange={e => importRoute(e.target.files?.[0])} />
        </div>
      </header>

      <aside className={`left-panel ${focusMode && !modules.assistant ? "focus-hidden" : ""}`}>
        <nav className="tabs">
          <button className={panel === "chat" ? "active" : ""} onClick={() => setPanel("chat")}><Icon name="compass" /> KI-Chat</button>
          <button className={panel === "routes" ? "active" : ""} onClick={() => setPanel("routes")}><Icon name="route" /> Routen <em>{routes.length}</em></button>
          <button className={panel === "junctions" ? "active" : ""} onClick={() => setPanel("junctions")}><Icon name="pin" /> Knoten <em>{junctions.length}</em></button>
          <button className={panel === "settings" ? "active" : ""} onClick={() => setPanel("settings")}><Icon name="map" /> Einstellungen</button>
        </nav>
        {panel === "chat" && <section className="chat-panel">
          <div className="assistant-head"><div className="ai-avatar"><OfmIcon name="leaf" size={18} /></div><div><strong>Routen-Assistent</strong><span><i /> {aiMode === "openai" ? "OpenAI verbunden" : aiMode === "demo" ? "Demo-Modus · Schlüssel nachrüstbar" : "Bereit für Änderungen"}</span></div></div>
          <div className="messages">
            {messages.map((m, i) => <div key={i} className={`message ${m.role}`}>{m.text}{m.role === "ai" && i > 0 && <small>Route aktualisiert</small>}</div>)}
            {busy && <div className="message ai typing"><b /><b /><b /></div>}
          </div>
          <div className="suggestions">
            {["Auf 15 km verkürzen", "Mehr Waldwege nutzen", "Aussichtspunkt einfügen"].map(s => <button key={s} onClick={() => runAI(s)}>+ {s}</button>)}
          </div>
          <div className="composer">
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runAI(input); } }} placeholder="Beschreibe eine Route oder Änderung …" />
            <div><span>↵ zum Senden</span><button onClick={() => runAI(input)} aria-label="Senden">↑</button></div>
          </div>
        </section>}
        {panel === "routes" && <section className="routes-panel">
          <div className="section-heading"><div><span>OFFIZIELLE STRECKEN 2027</span><strong>{routes.length} Routen</strong></div><button onClick={addRoute}>＋</button></div>
            {routes.map(r => <article key={r.id} onClick={() => selectRoute(r.id)} className={r.id === activeId ? "route-card active" : "route-card"}>
            <button className="visibility" aria-label={r.visible ? "Route ausblenden" : "Route einblenden"} onClick={e => { e.stopPropagation(); setRoutes(rs => rs.map(x => x.id === r.id ? { ...x, visible: !x.visible } : x)); }}><OfmIcon name={r.visible ? "eye" : "eye-off"} size={15} /></button>
            <span className="route-swatch" style={{ background: r.color }} />
            <div><strong>{r.name}</strong><span>{(r.officialDistance ?? distance(r.points)).toFixed(2).replace(".", ",")} km · {r.points.length} GPS-Punkte</span></div>
          </article>)}
          <button className="add-route" onClick={addRoute}>＋ Neue Route erstellen</button>
        </section>}
        {panel === "junctions" && <section className="junctions-panel">
          <div className="section-heading"><div><span>KNOTENPUNKTE & ORTE</span><strong>Markerfotos</strong></div></div>
          <p className="junction-intro">Lade ein Foto hoch. Es erscheint direkt im kleinen Marker auf der Admin- und Besucherkarte.</p>
          {junctionMessage && <div className="junction-message" role="status">{junctionMessage}</div>}
          <div className="junction-list">
            {junctions.map(junction => <article className="junction-card" key={junction.id} onClick={() => mapRef.current?.setView([junction.lat, junction.lng], 16)}>
              <div className={`junction-preview ${junction.landmark ? "landmark" : ""}`}>
                {junctionPhotos[junction.id] ? <img src={junctionPhotos[junction.id]} alt="" /> : <span>{junction.landmark ? "U" : "+"}</span>}
              </div>
              <div className="junction-copy"><strong>{junction.title}</strong><span>{junction.landmark ? "Historischer Ort" : "Streckenknoten"}</span></div>
              <div className="junction-actions" onClick={event => event.stopPropagation()}>
                <label className="junction-upload">
                  {junctionBusy === junction.id ? "Speichert …" : junctionPhotos[junction.id] ? "Bild ersetzen" : "Bild hochladen"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(junctionBusy)} onChange={event => { uploadJunctionPhoto(junction.id, event.target.files?.[0]); event.currentTarget.value = ""; }} />
                </label>
                {junctionPhotos[junction.id] && <button className="junction-remove" disabled={Boolean(junctionBusy)} onClick={() => removeJunctionPhoto(junction.id)}>Entfernen</button>}
              </div>
            </article>)}
          </div>
        </section>}
        {panel === "settings" && <section className="settings-panel">
          <div className="map-setting-card">
            <div><span>RICHTUNGSANZEIGE</span><strong>Weiße Streckenpfeile</strong><p>Zeigt auf den farbigen Linien, in welche Richtung die Route verläuft.</p></div>
            <label className="setting-switch" aria-label="Weiße Richtungspfeile ein- oder ausschalten">
              <input type="checkbox" checked={directionArrows} disabled={settingsBusy} onChange={event => saveDirectionArrows(event.target.checked)} />
              <span />
            </label>
          </div>
          {settingsMessage && <div className="settings-message" role="status">{settingsMessage}</div>}
          <label>Aktivität<select value={active.activity} onChange={e => updateActive(r => ({ ...r, activity: e.target.value as Route["activity"] }))}><option>Wandern</option><option>Laufen</option><option>Fahrrad</option></select></label>
          <label>Routenfarbe<input type="color" value={active.color} onChange={e => updateActive(r => ({ ...r, color: e.target.value }))} /></label>
          <label>Linienbreite <b>{active.width}px</b><input type="range" min="2" max="10" value={active.width} onChange={e => updateActive(r => ({ ...r, width: Number(e.target.value) }))} /></label>
          <label>Startmarker<select><option>Pfeil</option><option>Flagge</option><option>Kreis</option></select></label>
          <label>Zielmarker<select><option>Quadrat</option><option>Flagge</option><option>Kreis</option></select></label>
        </section>}
      </aside>

      <section className="map-area">
        <div ref={mapEl} className="map" />
        {(!focusMode || modules.tools) && <div className="map-tools">
          <button className={mode === "select" ? "active" : ""} onClick={() => setMode("select")} title="Auswählen"><OfmIcon name="cursor" /></button>
          <button className={mode === "add" ? "active" : ""} onClick={() => setMode("add")} title="Wegpunkt hinzufügen"><OfmIcon name="plus" /></button>
          <button className={mode === "delete" ? "active" : ""} onClick={() => setMode("delete")} title="Wegpunkt löschen"><OfmIcon name="delete-point" /></button>
          <button onClick={() => mapRef.current?.fitBounds(active.points.map(p => [p.lat, p.lng]))} title="Route zentrieren"><OfmIcon name="center" /></button>
          {!focusMode && <button onClick={() => { setFocusMode(true); setTimeout(() => mapRef.current?.invalidateSize(), 60); }} title="Karte im ganzen Tab öffnen"><OfmIcon name="expand" /></button>}
        </div>}
        {focusMode && <div className="workspace-legend">
          <div className="workspace-head"><div className="brand-mark"><OfmIcon name="logo-figure" size={25} /></div><div><span>KARTENARBEITSBEREICH</span><strong>Module & Legende</strong></div><button onClick={() => { setFocusMode(false); setTimeout(() => mapRef.current?.invalidateSize(), 60); }} title="Kartenmodus schließen"><OfmIcon name="close" /></button></div>
          <label>Ausgewählte Route
            <select value={activeId} onChange={e => selectRoute(e.target.value)}>
              {routes.map(r => <option key={r.id} value={r.id}>{r.name} · {(r.officialDistance ?? distance(r.points)).toFixed(1)} km</option>)}
            </select>
          </label>
          <div className="route-legend-line"><i style={{ background: active.color }} /><span>{active.day ?? "Eigene Route"}</span><b>{active.points.length} Punkte</b></div>
          <span className="module-label">MODULE EINBLENDEN</span>
          <div className="module-switches">
            <button className={modules.tools ? "active" : ""} onClick={() => toggleModule("tools")}><Icon name="cursor" /> Werkzeuge</button>
            <button className={modules.assistant ? "active" : ""} onClick={() => { toggleModule("assistant"); setPanel("chat"); }}><Icon name="compass" /> KI-Chat</button>
            <button className={modules.stats ? "active" : ""} onClick={() => toggleModule("stats")}><Icon name="stats" /> Statistik</button>
            <button className={modules.elevation ? "active" : ""} onClick={() => toggleModule("elevation")}><Icon name="elevation" /> Höhenprofil</button>
          </div>
        </div>}
        <div className="map-hint">{mode === "add" ? "In die Karte klicken, um einen Wegpunkt einzufügen" : mode === "delete" ? "Wegpunkt anklicken, um ihn zu löschen" : "Punkte ziehen, um die Route zu bearbeiten"}</div>
        <button className="info-toggle" onClick={() => setRightOpen(v => !v)} aria-label="Streckenübersicht"><OfmIcon name="stats" /></button>
      </section>

      <aside className={`right-panel ${rightOpen ? "" : "closed"} ${focusMode && !modules.stats && !modules.elevation ? "focus-hidden" : ""}`}>
        <div className="info-head"><div><span>AKTIVE ROUTE</span><strong>Streckenübersicht</strong></div><button onClick={() => setRightOpen(false)}>×</button></div>
        <div className={focusMode && !modules.stats ? "module-hidden" : ""}>
          <div className="hero-stat"><span>Gesamtlänge</span><strong>{km.toFixed(1).replace(".", ",")} <small>km</small></strong><em>{active.day ?? "Rundstrecke"}</em></div>
          {active.fullName && <div className="official-source"><span>OFFIZIELLE VERANSTALTUNGSSTRECKE</span><p>{active.fullName}</p><a href={active.sourceUrl} target="_blank" rel="noreferrer">Original auf Komoot ↗</a></div>}
          <div className="stat-grid">
          <div><Icon name="elevation" /><span>Höhenmeter</span><strong>{Math.round(ascent)} m</strong></div>
          <div><Icon name="pin" /><span>Wegpunkte</span><strong>{active.points.length}</strong></div>
          <div><Icon name="sun" /><span>Höchster Punkt</span><strong>{Math.max(...active.points.map(p => p.ele))} m</strong></div>
          <div><Icon name="lowest" /><span>Tiefster Punkt</span><strong>{Math.min(...active.points.map(p => p.ele))} m</strong></div>
          </div>
          <div className="times">
          <h3>Geschätzte Zeiten</h3>
          <div><span><Icon name="boot" /> Gehen</span><strong>{formatTime(km / 4.5)}</strong></div>
          <div><span><Icon name="run" /> Laufen</span><strong>{formatTime(km / 9.5)}</strong></div>
          <div><span><Icon name="bike" /> Fahrrad</span><strong>{formatTime(km / 18)}</strong></div>
          </div>
        </div>
        <div className={`elevation ${focusMode && !modules.elevation ? "module-hidden" : ""}`}>
          <div className="elevation-head"><div><span>HÖHENPROFIL</span><strong>Sanftes Terrain</strong></div><em>↑ {Math.round(ascent)} m</em></div>
          <div className="chart">{active.points.map((p, i) => <i key={i} style={{ height: `${26 + (p.ele - Math.min(...active.points.map(x => x.ele))) * 6}%` }} />)}</div>
          <div className="chart-labels"><span>0 km</span><span>{(km / 2).toFixed(1)} km</span><span>{km.toFixed(1)} km</span></div>
        </div>
        <div className={`surface ${focusMode && !modules.stats ? "module-hidden" : ""}`}>
          <div><span>WEGBESCHAFFENHEIT</span><strong>Gemischt</strong></div>
          <div className="surface-bar"><i /><i /><i /></div>
          <div className="legend"><span><b /> Feldweg 52%</span><span><b /> Waldweg 31%</span><span><b /> Asphalt 17%</span></div>
        </div>
      </aside>
    </main>
    </AdminGate>
  );
}
