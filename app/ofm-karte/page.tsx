"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, Polyline, Marker } from "leaflet";
import routesData from "../freiheitsmarsch-routes.json";
import "./viewer.css";

type Point = { lat: number; lng: number; ele: number; name?: string };
type ViewerRoute = {
  id: string;
  name: string;
  fullName: string;
  day: string;
  color: string;
  officialDistance: number;
  elevationUp: number;
  sourceUrl: string;
  points: Point[];
};

const routes = routesData as ViewerRoute[];

function formatTime(hours: number) {
  const h = Math.floor(hours);
  const minutes = Math.round((hours - h) * 60);
  return h ? `${h} Std. ${minutes} Min.` : `${minutes} Min.`;
}

export default function OfmRouteMap() {
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layers = useRef<{ line?: Polyline; markers: Marker[] }>({ markers: [] });
  const [activeId, setActiveId] = useState(routes[0].id);
  const [day, setDay] = useState<"Samstag" | "Sonntag">("Samstag");
  const [infoOpen, setInfoOpen] = useState(true);
  const active = routes.find(route => route.id === activeId) ?? routes[0];
  const available = useMemo(() => routes.filter(route => route.day === day), [day]);
  const minElevation = Math.min(...active.points.map(point => point.ele));

  useEffect(() => {
    if (!mapNode.current || mapRef.current) return;
    let mounted = true;
    import("leaflet").then(L => {
      if (!mounted || !mapNode.current || mapRef.current) return;
      const map = L.map(mapNode.current, { zoomControl: false, attributionControl: true }).setView([53.4646, 7.4771], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 80);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    import("leaflet").then(L => {
      layers.current.line?.remove();
      layers.current.markers.forEach(marker => marker.remove());
      const line = L.polyline(active.points.map(point => [point.lat, point.lng]), {
        color: active.color,
        weight: 6,
        opacity: .96,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
      const start = active.points[0];
      const finish = active.points.at(-1) ?? start;
      const markerIcon = (label: string, finishMarker = false) => L.divIcon({
        className: `ofm-marker ${finishMarker ? "finish" : ""}`,
        html: `<span>${label}</span>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      const startMarker = L.marker([start.lat, start.lng], { icon: markerIcon("S") }).addTo(map).bindTooltip("Start");
      const finishMarker = L.marker([finish.lat, finish.lng], { icon: markerIcon("Z", true) }).addTo(map).bindTooltip("Ziel");
      layers.current = { line, markers: [startMarker, finishMarker] };
      map.fitBounds(line.getBounds(), { padding: [38, 38] });
    });
  }, [active]);

  function chooseDay(nextDay: "Samstag" | "Sonntag") {
    setDay(nextDay);
    const first = routes.find(route => route.day === nextDay);
    if (first) setActiveId(first.id);
  }

  return (
    <main className="ofm-viewer">
      <div ref={mapNode} className="ofm-map" />

      <section className="ofm-route-picker" aria-label="Streckenauswahl">
        <div className="ofm-picker-head">
          <div className="ofm-monogram">OFM</div>
          <div><span>8. OSTFRIESISCHER FREIHEITSMARSCH</span><strong>Streckenkarte 2026</strong></div>
        </div>
        <div className="ofm-day-switch">
          <button className={day === "Samstag" ? "active" : ""} onClick={() => chooseDay("Samstag")}><span>20. JUNI</span>Samstag</button>
          <button className={day === "Sonntag" ? "active" : ""} onClick={() => chooseDay("Sonntag")}><span>21. JUNI</span>Sonntag</button>
        </div>
        <span className="ofm-label">STRECKE AUSWÄHLEN</span>
        <div className="ofm-distances">
          {available.map(route => (
            <button key={route.id} className={route.id === activeId ? "active" : ""} onClick={() => setActiveId(route.id)}>
              <i style={{ background: route.color }} />
              <strong>{Math.round(route.officialDistance)} km</strong>
              <span>{route.points.length} GPS-Punkte</span>
            </button>
          ))}
        </div>
        <div className="ofm-legend">
          <span><i className="start" /> Start</span>
          <span><i className="finish" /> Ziel</span>
          <span><i className="route" style={{ background: active.color }} /> Strecke</span>
        </div>
      </section>

      <button className="ofm-info-toggle" onClick={() => setInfoOpen(open => !open)} aria-label="Streckeninformationen anzeigen">i</button>
      <aside className={`ofm-info ${infoOpen ? "" : "closed"}`}>
        <button className="ofm-close" onClick={() => setInfoOpen(false)}>×</button>
        <span className="ofm-label">AUSGEWÄHLTE ROUTE</span>
        <h1>{active.name.replace(" · ", " — ")}</h1>
        <div className="ofm-distance">{active.officialDistance.toFixed(2).replace(".", ",")} <small>km</small></div>
        <div className="ofm-stats">
          <div><span>Höhenmeter</span><strong>↑ {active.elevationUp} m</strong></div>
          <div><span>Gehzeit</span><strong>{formatTime(active.officialDistance / 4.5)}</strong></div>
          <div><span>Start</span><strong>{active.fullName.match(/Start: ([\d:]+ Uhr)/)?.[1] ?? "siehe Komoot"}</strong></div>
          <div><span>Profil</span><strong>Leicht · flach</strong></div>
        </div>
        <div className="ofm-profile">
          <div><span>HÖHENPROFIL</span><b>↑ {active.elevationUp} m</b></div>
          <div className="ofm-chart">{active.points.filter((_, i) => i % Math.max(1, Math.ceil(active.points.length / 70)) === 0).map((point, index) => <i key={index} style={{ height: `${28 + (point.ele - minElevation) * 6}%` }} />)}</div>
          <div className="ofm-chart-labels"><span>0 km</span><span>{(active.officialDistance / 2).toFixed(1)} km</span><span>{active.officialDistance.toFixed(1)} km</span></div>
        </div>
        <a href={active.sourceUrl} target="_blank" rel="noreferrer">Streckendetails auf Komoot <span>↗</span></a>
        <p>Die Karte dient der Orientierung. Kurzfristige Änderungen und Markierungen vor Ort haben Vorrang.</p>
      </aside>
    </main>
  );
}
