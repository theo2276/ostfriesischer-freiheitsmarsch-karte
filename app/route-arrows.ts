type RoutePoint = { lat: number; lng: number };

export type DirectionArrowPoint = RoutePoint & { angle: number };

function segmentDistance(a: RoutePoint, b: RoutePoint) {
  const radius = 6371000;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function bearing(a: RoutePoint, b: RoutePoint) {
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return Math.atan2(y, x) * 180 / Math.PI;
}

export function directionArrowPoints(points: RoutePoint[]) {
  if (points.length < 2) return [];
  const segments = points.slice(1).map((point, index) => segmentDistance(points[index], point));
  const total = segments.reduce((sum, length) => sum + length, 0);
  if (!total) return [];

  const spacing = Math.max(450, Math.min(1800, total / 20));
  const arrows: DirectionArrowPoint[] = [];
  let target = spacing / 2;
  let travelled = 0;

  for (let index = 0; index < segments.length && target < total; index++) {
    const length = segments[index];
    const start = points[index];
    const finish = points[index + 1];
    while (target <= travelled + length) {
      const ratio = length ? (target - travelled) / length : 0;
      arrows.push({
        lat: start.lat + (finish.lat - start.lat) * ratio,
        lng: start.lng + (finish.lng - start.lng) * ratio,
        angle: bearing(start, finish),
      });
      target += spacing;
    }
    travelled += length;
  }

  return arrows;
}
