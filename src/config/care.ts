import type { HealthThresholds } from '@/types/care';

export const DEFAULT_HEALTH_THRESHOLDS: HealthThresholds = { minHeartRate: 50, maxHeartRate: 120, minSpo2: 92 };
export const DEFAULT_SAFE_RADIUS = 20;
export const MAP_FALLBACK = { lat: 51.1694, lng: 71.4491 };
