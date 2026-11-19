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

/** City is an ID from src/config/profile-options.ts (`other` → free text in `cityOther`). */
export type Address = { cityId: string; cityOther?: string; street: string; house: string; apartment?: string };

export type Hospital = { name: string; address: string; phone?: string };

export type Ward = {
  id: string;
  guardianId: string;
  /** "Фамилия Имя" — kept filled for older screens that only know `name`. */
  name: string;
  lastName?: string;
  firstName?: string;
  middleName?: string;
  /** ISO date `YYYY-MM-DD`; age is calculated from it, never stored. */
  birthDate?: string;
  /** Diagnosis IDs from DIAGNOSIS_OPTIONS (`other` → `diagnosisOther`). */
  diagnoses?: string[];
  diagnosisOther?: string;
  /** Human-readable summary of `diagnoses` for older screens. */
  diagnosis?: string;
  address?: Address;
  addressSameAsGuardian?: boolean;
  hospital?: Hospital;
  braceletId?: string;
  /** Bracelet SIM number, used by the SMS fallback. */
  braceletPhone?: string;
  safePlaces?: SafePlace[];
  safeRoutes?: SafeRoute[];
  healthThresholds?: HealthThresholds;
  createdAt?: unknown;
};

/** users/{uid} — the caregiver. `securityQuestionsSet` is written only by Cloud Functions. */
export type GuardianProfile = {
  email?: string;
  lastName?: string;
  firstName?: string;
  middleName?: string;
  /** E.164, e.g. +77011234567 */
  workPhone?: string;
  secondPhone?: string;
  /** Phone entered at registration, E.164. */
  phone?: string;
  relation?: string;
  relationOther?: string;
  address?: Address;
  consentAcceptedAt?: unknown;
  profileComplete?: boolean;
  securityQuestionsSet?: boolean;
  fcmToken?: string;
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
