import type { Coordinates, DeviceData, HealthThresholds, SafePlace, SafeRoute } from '@/types/care';

const radians = (v: number) => v * Math.PI / 180;
export const distanceMeters = (a: Coordinates, b: Coordinates) => {
  const R = 6371000, dLat = radians(b.lat - a.lat), dLng = radians(b.lng - a.lng);
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
};
const pointSegmentDistance = (p: Coordinates, a: Coordinates, b: Coordinates) => {
  const scale = 111320;
  const x = (p.lng - a.lng) * scale * Math.cos(radians(a.lat)), y = (p.lat - a.lat) * scale;
  const bx = (b.lng - a.lng) * scale * Math.cos(radians(a.lat)), by = (b.lat - a.lat) * scale;
  const t = Math.max(0, Math.min(1, (x * bx + y * by) / (bx * bx + by * by || 1)));
  return Math.hypot(x - bx * t, y - by * t);
};
export const routeContains = (location: Coordinates, route: SafeRoute) => route.points.slice(1).some((p, i) => pointSegmentDistance(location, route.points[i], p) <= route.tolerance);
export type LocationAssessment = { status: string; safe: boolean; matchedPlace?: SafePlace; expectedPlace?: SafePlace };
export const assessLocation = (location: Coordinates | undefined, places: SafePlace[] = [], routes: SafeRoute[] = []): LocationAssessment => {
  if (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)) return { status: 'Location unavailable', safe: false };
  const matchedPlace = places.find((place) => distanceMeters(location, place.location) <= place.radius);
  const now = new Date(); const minutes = now.getHours() * 60 + now.getMinutes(); const day = now.getDay();
  const expectedPlace = places.find((place) => place.schedule?.some(s => {
    const [sh, sm] = s.start.split(':').map(Number), [eh, em] = s.end.split(':').map(Number);
    return (!s.days || s.days.includes(day)) && minutes >= sh * 60 + sm && minutes <= eh * 60 + em;
  }));
  if (expectedPlace && matchedPlace?.id !== expectedPlace.id) return { status: `Expected at ${expectedPlace.name}`, safe: false, matchedPlace, expectedPlace };
  if (matchedPlace) return { status: `At ${matchedPlace.name}`, safe: true, matchedPlace, expectedPlace };
  if (routes.some(r => r.enabled !== false && routeContains(location, r))) return { status: 'On safe route', safe: true, expectedPlace };
  if (routes.some(r => r.enabled !== false)) return { status: 'Outside safe route', safe: false, expectedPlace };
  return { status: 'Outside safe area', safe: false, expectedPlace };
};
export const healthStatus = (device: DeviceData | undefined, thresholds: HealthThresholds) => {
  if (device?.heartRate == null && device?.spo2 == null) return { label: 'No data', severity: 'info' as const, issues: [] as string[] };
  const issues: string[] = [];
  if (device?.heartRate != null && (device.heartRate < thresholds.minHeartRate || device.heartRate > thresholds.maxHeartRate)) issues.push('heart_rate');
  if (device?.spo2 != null && device.spo2 < thresholds.minSpo2) issues.push('spo2');
  return { label: issues.length ? 'Critical' : 'Normal', severity: issues.length ? 'critical' as const : 'info' as const, issues };
};
