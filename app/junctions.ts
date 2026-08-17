import routesData from "./freiheitsmarsch-routes.json";

type RouteSummary = { name: string };

export type Junction = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  text: string;
  routes: string[];
  landmark?: boolean;
};

const routeNames = (routesData as RouteSummary[]).map(route => route.name);

export const junctions: Junction[] = [
  {
    id: "start-ziel",
    lat: 53.464499,
    lng: 7.476757,
    title: "Zentraler Streckenknoten",
    text: "Hier treffen alle acht Veranstaltungsstrecken im Start- und Zielbereich zusammen. Achte auf die farbige Beschilderung deiner gewählten Distanz.",
    routes: routeNames,
  },
  {
    id: "kurze-strecken",
    lat: 53.461027,
    lng: 7.467637,
    title: "Abzweig der kurzen Strecken",
    text: "An diesem Knoten teilen und vereinigen sich mehrere 5- und 10-km-Führungen mit den längeren Sonntagsstrecken. Folge hier besonders aufmerksam den Distanzschildern.",
    routes: ["Samstag · 5 km", "Sonntag · 5 km", "Sonntag · 10 km", "Sonntag · 24 km", "Sonntag · 42 km"],
  },
  {
    id: "suedwest",
    lat: 53.456487,
    lng: 7.460242,
    title: "Gemeinsamer Südwest-Abschnitt",
    text: "Mehrere Routen nutzen diesen Abschnitt gemeinsam, bevor sie wieder unterschiedliche Richtungen einschlagen. Gegenverkehr anderer Marschgruppen ist möglich.",
    routes: ["Samstag · 5 km", "Sonntag · 5 km", "Sonntag · 10 km", "Sonntag · 24 km", "Sonntag · 42 km"],
  },
  {
    id: "lange-routen",
    lat: 53.461955,
    lng: 7.476587,
    title: "Kreuzung der langen Routen",
    text: "Hier kreuzen sich die 10-km-Samstagsstrecke und beide 42-km-Strecken. Prüfe die Streckenfarbe, bevor du den nächsten Abschnitt beginnst.",
    routes: ["Samstag · 10 km", "Samstag · 42 km", "Sonntag · 42 km"],
  },
  {
    id: "ost-knoten",
    lat: 53.453393,
    lng: 7.50193,
    title: "Östlicher Streckenknoten",
    text: "Die 10-km-Samstagsrunde sowie die beiden 42-km-Routen treffen hier aufeinander. Die längeren Distanzen führen von diesem Punkt weiter.",
    routes: ["Samstag · 10 km", "Samstag · 42 km", "Sonntag · 42 km"],
  },
  {
    id: "upstalsboom",
    lat: 53.45402,
    lng: 7.43116,
    title: "Upstalsboom · Friesische Freiheit",
    text: "Der Upstalsboom war im Mittelalter Versammlungsort der Abgesandten der friesischen Landesgemeinden und gilt bis heute als Symbol der Friesischen Freiheit. Hier verlaufen die Sonntagsstrecken über 10, 24 und 42 km gemeinsam.",
    routes: ["Sonntag · 10 km", "Sonntag · 24 km", "Sonntag · 42 km"],
    landmark: true,
  },
  {
    id: "abzweig-10-24-42",
    lat: 53.450675,
    lng: 7.451423,
    title: "Abzweig 10 / 24 / 42 km",
    text: "Wichtiger Abzweig der längeren Sonntagsrouten. Orientiere dich an der Ausschilderung für 10, 24 beziehungsweise 42 km.",
    routes: ["Sonntag · 10 km", "Sonntag · 24 km", "Sonntag · 42 km"],
  },
];

export const junctionIds = new Set(junctions.map(junction => junction.id));
