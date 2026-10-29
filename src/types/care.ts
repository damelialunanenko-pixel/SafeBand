export type Coordinates = { lat: number; lng: number };

export type SafePlace = {
  id: string;
  name: string;
  address?: string;
  location: Coordinates;
  radius: number;
  schedule?: { start: string; end: string; days?: number[] }[];
};

export type SafeRoute = {
  id: string;
  name: string;
  points: Coordinates[];
  tolerance: number;
  enabled?: boolean;
};

export type Ward = {
  id: string;
  guardianId: string;
  name: string;
  braceletId?: string;
  diagnosis?: string;
  safePlaces?: SafePlace[];
  safeRoutes?: SafeRoute[];
  healthThresholds?: HealthThresholds;
};

export type DeviceData = {
  location?: Coordinates & { updatedAt?: unknown; address?: string };
  braceletLocation?: Coordinates & { updatedAt?: unknown };
  connected?: boolean;
  worn?: boolean;
  battery?: number;
  lastSyncAt?: unknown;
  heartRate?: number;
  spo2?: number;
  fall_detected?: boolean;
  sos?: { active?: boolean; updatedAt?: unknown };
  sos_pressed?: boolean;
};

export type HealthThresholds = { minHeartRate: number; maxHeartRate: number; minSpo2: number };
export type CareEvent = { id: string; wardId: string; category: 'location'|'health'|'bracelet'|'sos'|'alert'; type: string; description: string; severity: 'info'|'warning'|'critical'; createdAt?: unknown; requiresAttention?: boolean };
