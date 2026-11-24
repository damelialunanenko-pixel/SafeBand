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
  /** Phone number of the SIM card in the bracelet — used to recognise its SMS (Android). */
  braceletPhone?: string;
  safePlaces?: SafePlace[];
  safeRoutes?: SafeRoute[];
  healthThresholds?: HealthThresholds;
  createdAt?: unknown;
};

/** users/{uid} — the caregiver. */
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
  fcmToken?: string;
};

export type LocationSource = 'cell' | 'gps' | 'wifi' | string;
export type CellTower = { mcc: number; mnc: number; lac: number; cellId: number; rssi: number };

export type DeviceData = {
  /**
   * `accuracyM` (metres, written by the SMS bridge) / legacy `accuracy` and `source` are optional:
   * shown on the map only when the device reports them.
   */
  location?: Coordinates & { updatedAt?: unknown; address?: string; accuracyM?: number; accuracy?: number; source?: LocationSource };
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
  /** Cell towers reported in the last location SMS: MCC, MNC, LAC, CellID, RSSI (dBm). */
  cells?: CellTower[];
  lastSms?: { receivedAt?: unknown; via?: string; extra?: Record<string, string> };
};

export type HealthThresholds = { minHeartRate: number; maxHeartRate: number; minSpo2: number };
export type CareEvent = { id: string; wardId: string; category: 'location'|'health'|'bracelet'|'sos'|'alert'; type: string; description: string; severity: 'info'|'warning'|'critical'; createdAt?: unknown; requiresAttention?: boolean };

// ---- medications: wards/{wardId}/medications/{id}, wards/{wardId}/medicationLogs/{id} ----

export type MedicationForm = 'tablet' | 'capsule' | 'drops' | 'syrup' | 'injection' | 'ointment' | 'inhaler' | 'other';
export type MealRelation = 'before' | 'with' | 'after' | 'any';

export type Medication = {
  id: string;
  /** e.g. "Мемантин", 2–60 characters */
  name: string;
  /** e.g. "10 мг", "1 таблетка" */
  dose?: string;
  form: MedicationForm;
  /** Local times "HH:mm", sorted, unique. */
  times: string[];
  /** JS weekdays: 0 = Sunday … 6 = Saturday. All seven = every day. */
  days: number[];
  /** ISO dates "YYYY-MM-DD"; `endDate` = "course until …". */
  startDate?: string | null;
  endDate?: string | null;
  mealRelation: MealRelation;
  note?: string;
  /** Pills left; a "buy more" reminder appears at ≤ 5. */
  stock?: number | null;
  /** Off = kept, but no doses and no reminders. */
  enabled: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type MedicationLogStatus = 'taken' | 'skipped' | 'missed';

/** Document ID = doseKey(medicationId, scheduledAt), so a dose has at most one log. */
export type MedicationLog = {
  id: string;
  medicationId: string;
  /** Firestore Timestamp of the planned dose time. */
  scheduledAt: unknown;
  status: MedicationLogStatus;
  /** When it was marked. */
  at: unknown;
  byUid: string;
};
