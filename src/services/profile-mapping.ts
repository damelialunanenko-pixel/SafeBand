import { DIAGNOSIS_OPTIONS } from '@/config/profile-options';
import type { Address, GuardianProfile, Hospital, Ward } from '@/types/care';
import { cleanText, formatPhoneInput, isoToDateInput, parseDateInput, toE164, type AddressForm, type GuardianForm, type WardForm } from './validation';

/** Converts between form state (strings) and Firestore documents. Pure, covered by tests. */

const optional = (value: string) => (cleanText(value) ? cleanText(value) : undefined);

/** Firestore rejects `undefined` field values; drop them. */
export function withoutUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined).map(([k, v]) => [k, v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype ? withoutUndefined(v) : v])) as T;
}

export const emptyAddress: AddressForm = { cityId: '', cityOther: '', street: '', house: '', apartment: '' };

export const addressToDoc = (a: AddressForm): Address => withoutUndefined({
  cityId: a.cityId,
  cityOther: a.cityId === 'other' ? cleanText(a.cityOther) : undefined,
  street: cleanText(a.street),
  house: cleanText(a.house),
  apartment: optional(a.apartment),
});

export const addressToForm = (a?: Address): AddressForm => ({
  cityId: a?.cityId ?? '', cityOther: a?.cityOther ?? '', street: a?.street ?? '', house: a?.house ?? '', apartment: a?.apartment ?? '',
});

export const emptyGuardianForm: GuardianForm = {
  lastName: '', firstName: '', middleName: '', workPhone: '', secondPhone: '', relation: '', relationOther: '', ...emptyAddress,
};

export function guardianToDoc(f: GuardianForm): GuardianProfile {
  return withoutUndefined({
    lastName: cleanText(f.lastName),
    firstName: cleanText(f.firstName),
    middleName: optional(f.middleName),
    workPhone: toE164(f.workPhone) ?? undefined,
    secondPhone: toE164(f.secondPhone) ?? undefined,
    relation: f.relation,
    relationOther: f.relation === 'other' ? cleanText(f.relationOther) : undefined,
    address: addressToDoc(f),
  });
}

export const guardianToForm = (p: GuardianProfile): Partial<GuardianForm> => ({
  lastName: p.lastName ?? '', firstName: p.firstName ?? '', middleName: p.middleName ?? '',
  workPhone: formatPhoneInput(p.workPhone ?? p.phone ?? ''), secondPhone: formatPhoneInput(p.secondPhone ?? ''), relation: p.relation ?? '', relationOther: p.relationOther ?? '',
  ...addressToForm(p.address),
});

export const emptyWardForm: WardForm = {
  lastName: '', firstName: '', middleName: '', birthDate: '', diagnoses: [], diagnosisOther: '', sameAddress: true,
  hospitalName: '', hospitalAddress: '', hospitalPhone: '', ...emptyAddress,
};

/** Human-readable diagnosis text kept in `Ward.diagnosis` for screens that only show a string. */
export function diagnosisSummary(ids: string[], other: string, language: 'ru' | 'en' | 'kk'): string {
  return ids
    .map((id) => (id === 'other' ? cleanText(other) : DIAGNOSIS_OPTIONS.find((o) => o.id === id)?.label[language] ?? id))
    .filter(Boolean)
    .join(', ');
}

type WardDoc = Omit<Ward, 'id' | 'guardianId' | 'safePlaces' | 'safeRoutes' | 'healthThresholds' | 'braceletId' | 'braceletPhone' | 'createdAt'>;

export function wardToDoc(f: WardForm, guardianAddress: Address | undefined, language: 'ru' | 'en' | 'kk'): WardDoc {
  const lastName = cleanText(f.lastName);
  const firstName = cleanText(f.firstName);
  const hospital: Hospital = withoutUndefined({
    name: cleanText(f.hospitalName),
    address: cleanText(f.hospitalAddress),
    phone: toE164(f.hospitalPhone) ?? undefined,
  });
  const sameAddress = f.sameAddress && Boolean(guardianAddress);
  return withoutUndefined({
    name: `${lastName} ${firstName}`,
    lastName,
    firstName,
    middleName: optional(f.middleName),
    birthDate: parseDateInput(f.birthDate) ?? undefined,
    diagnoses: f.diagnoses,
    diagnosisOther: f.diagnoses.includes('other') ? cleanText(f.diagnosisOther) : undefined,
    diagnosis: diagnosisSummary(f.diagnoses, f.diagnosisOther, language),
    addressSameAsGuardian: sameAddress,
    address: sameAddress ? guardianAddress : addressToDoc(f),
    hospital,
  });
}

export const wardToForm = (w: Ward): Partial<WardForm> => ({
  lastName: w.lastName ?? '', firstName: w.firstName ?? '', middleName: w.middleName ?? '',
  birthDate: w.birthDate ? isoToDateInput(w.birthDate) : '',
  diagnoses: w.diagnoses ?? [], diagnosisOther: w.diagnosisOther ?? '',
  sameAddress: w.addressSameAsGuardian ?? true,
  hospitalName: w.hospital?.name ?? '', hospitalAddress: w.hospital?.address ?? '', hospitalPhone: formatPhoneInput(w.hospital?.phone ?? ''),
  ...addressToForm(w.address),
});
