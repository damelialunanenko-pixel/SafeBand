/**
 * Pure validation helpers shared by the sign-in, registration and profile screens.
 *
 * Every validator returns `null` when the value is valid, otherwise a localization key
 * (see `src/localization/forms.ts`) that the screen renders under the field.
 * Nothing in this file touches React, Firebase or storage, so it is covered by Jest tests.
 */
import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js/max';

export type ValidationError = string | null;
export type FieldErrors<K extends string> = Partial<Record<K, ValidationError>>;

/** True when no field in the map has an error. */
export const isValid = <K extends string>(errors: FieldErrors<K>) => Object.values(errors).every((e) => !e);

// ---------------------------------------------------------------- email

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

const EMAIL_LOCAL = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i;
const EMAIL_LABEL = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;

export function validateEmail(raw: string): ValidationError {
  const value = normalizeEmail(raw);
  if (!value) return 'errRequired';
  if (/\s/.test(value)) return 'errEmailFormat';
  const at = value.lastIndexOf('@');
  if (at <= 0 || value.indexOf('@') !== at) return 'errEmailFormat';
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (local.length > 64 || value.length > 254) return 'errEmailFormat';
  if (!EMAIL_LOCAL.test(local)) return 'errEmailFormat'; // also rejects leading/trailing/double dots
  const labels = domain.split('.');
  if (labels.length < 2 || labels.some((l) => !EMAIL_LABEL.test(l))) return 'errEmailFormat';
  if (!/^[a-z]{2,}$/i.test(labels[labels.length - 1])) return 'errEmailFormat';
  return null;
}

// ---------------------------------------------------------------- password

export type PasswordRules = { length: boolean; upper: boolean; lower: boolean; digitOrSymbol: boolean };
export const PASSWORD_MIN_LENGTH = 8;

export function passwordRules(value: string): PasswordRules {
  return {
    length: value.length >= PASSWORD_MIN_LENGTH,
    upper: /\p{Lu}/u.test(value),
    lower: /\p{Ll}/u.test(value),
    digitOrSymbol: /[^\p{L}\s]/u.test(value),
  };
}

export function validatePassword(value: string): ValidationError {
  if (!value) return 'errRequired';
  const rules = passwordRules(value);
  return Object.values(rules).every(Boolean) ? null : 'errPasswordWeak';
}

export const validatePasswordConfirm = (password: string, confirm: string): ValidationError =>
  !confirm ? 'errRequired' : password === confirm ? null : 'errPasswordMismatch';

// ---------------------------------------------------------------- phone

export const DEFAULT_PHONE_COUNTRY = 'KZ' as const;

/** Formats Kazakhstan numbers as `+7 (7XX) XXX-XX-XX` while typing; other countries via libphonenumber. */
export function formatPhoneInput(raw: string): string {
  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return trimmed.startsWith('+') ? '+' : '';
  const international = trimmed.startsWith('+');
  if (international && !digits.startsWith('7')) return new AsYouType().input(`+${digits}`);
  if (!international && digits.startsWith('8')) digits = `7${digits.slice(1)}`; // 8 701 … → +7 701 …
  // A pasted national number without the country code (701 123 45 67). While typing, the field already
  // holds "+7 (…", so plain digits only arrive from a paste or the very first keystroke.
  else if (!international && digits.length === 10) digits = `7${digits}`;
  if (!digits.startsWith('7')) digits = `7${digits}`;
  digits = digits.slice(0, 11);
  const n = digits.slice(1);
  let out = '+7';
  if (n.length) out += ` (${n.slice(0, 3)}`;
  if (n.length >= 3) out += ')';
  if (n.length > 3) out += ` ${n.slice(3, 6)}`;
  if (n.length > 6) out += `-${n.slice(6, 8)}`;
  if (n.length > 8) out += `-${n.slice(8, 10)}`;
  return out;
}

/** Returns the number in E.164 (`+77011234567`) or `null` when it is not a valid phone number. */
export function toE164(raw: string): string | null {
  if (!raw.trim()) return null;
  const parsed = parsePhoneNumberFromString(raw, DEFAULT_PHONE_COUNTRY);
  return parsed?.isValid() ? parsed.number : null;
}

export function validatePhone(raw: string, required = true): ValidationError {
  if (!raw.trim() || raw.trim() === '+' || raw.trim() === '+7') return required ? 'errRequired' : null;
  return toE164(raw) ? null : 'errPhone';
}

// ---------------------------------------------------------------- names and text

const NAME_PATTERN = /^\p{L}+([ -]\p{L}+)*$/u;

/** Letters, single spaces or hyphens between them, 2–50 characters. */
export function validateName(raw: string, required = true): ValidationError {
  const value = raw.trim();
  if (!value) return required ? 'errRequired' : null;
  if (value.length < 2 || value.length > 50) return 'errNameLength';
  return NAME_PATTERN.test(value) ? null : 'errNameChars';
}

/** Collapses repeated whitespace; used before saving names. */
export const cleanText = (value: string) => value.trim().replace(/\s+/g, ' ');

export function validateText(raw: string, { required = true, min = 1, max = 100 } = {}): ValidationError {
  const value = raw.trim();
  if (!value) return required ? 'errRequired' : null;
  if (value.length < min) return 'errTooShort';
  if (value.length > max) return 'errTooLong';
  return null;
}

export const validateChoice = (value: string | null | undefined): ValidationError => (value ? null : 'errChoose');

export const validateCheckbox = (value: boolean): ValidationError => (value ? null : 'errConsent');

// ---------------------------------------------------------------- dates

/** Masks digits into `ДД.ММ.ГГГГ` while typing. */
export function formatDateInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
}

/** Parses `ДД.ММ.ГГГГ` into an ISO date `YYYY-MM-DD`, or `null` for impossible dates (31.02 etc.). */
export function parseDateInput(value: string): string | null {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());
  if (!m) return null;
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** `YYYY-MM-DD` → `ДД.ММ.ГГГГ`. */
export const isoToDateInput = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
};

/** Full years between an ISO birth date and `now` (local calendar). */
export function calculateAge(isoBirthDate: string, now: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoBirthDate);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let age = now.getFullYear() - year;
  if (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)) age -= 1;
  return age;
}

export const MAX_AGE_YEARS = 120;

export function validateBirthDate(input: string, now: Date = new Date()): ValidationError {
  if (!input.trim()) return 'errRequired';
  const iso = parseDateInput(input);
  if (!iso) return 'errDateFormat';
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (iso > today) return 'errDateFuture';
  const age = calculateAge(iso, now);
  if (age === null || age > MAX_AGE_YEARS) return 'errDateTooOld';
  return null;
}

// ---------------------------------------------------------------- bracelet

export function validateBraceletId(raw: string): ValidationError {
  const value = raw.trim();
  if (!value) return 'errRequired';
  return /^[A-Za-z0-9][A-Za-z0-9_-]{2,39}$/.test(value) ? null : 'errBraceletId';
}

// ---------------------------------------------------------------- whole steps

export type AccountForm = { email: string; password: string; confirm: string; phone: string; consent: boolean };

export function validateAccountStep(f: AccountForm): FieldErrors<keyof AccountForm> {
  return {
    email: validateEmail(f.email),
    password: validatePassword(f.password),
    confirm: validatePasswordConfirm(f.password, f.confirm),
    phone: validatePhone(f.phone),
    consent: validateCheckbox(f.consent),
  };
}

export type AddressForm = { cityId: string; cityOther: string; street: string; house: string; apartment: string };

export function validateAddress(a: AddressForm): FieldErrors<keyof AddressForm> {
  return {
    cityId: validateChoice(a.cityId),
    cityOther: a.cityId === 'other' ? validateText(a.cityOther, { min: 2, max: 60 }) : null,
    street: validateText(a.street, { min: 2, max: 100 }),
    house: validateText(a.house, { max: 10 }),
    apartment: validateText(a.apartment, { required: false, max: 10 }),
  };
}

export type GuardianForm = {
  lastName: string; firstName: string; middleName: string;
  workPhone: string; secondPhone: string;
  relation: string; relationOther: string;
} & AddressForm;

export function validateGuardianForm(f: GuardianForm): FieldErrors<keyof GuardianForm> {
  return {
    lastName: validateName(f.lastName),
    firstName: validateName(f.firstName),
    middleName: validateName(f.middleName, false),
    workPhone: validatePhone(f.workPhone),
    secondPhone: validatePhone(f.secondPhone, false),
    relation: validateChoice(f.relation),
    relationOther: f.relation === 'other' ? validateText(f.relationOther, { min: 2, max: 50 }) : null,
    ...validateAddress(f),
  };
}

export type WardForm = {
  lastName: string; firstName: string; middleName: string;
  birthDate: string;
  diagnoses: string[]; diagnosisOther: string;
  sameAddress: boolean;
  hospitalName: string; hospitalAddress: string; hospitalPhone: string;
} & AddressForm;

export function validateWardForm(f: WardForm): FieldErrors<keyof WardForm> {
  return {
    lastName: validateName(f.lastName),
    firstName: validateName(f.firstName),
    middleName: validateName(f.middleName, false),
    birthDate: validateBirthDate(f.birthDate),
    diagnoses: f.diagnoses.length ? null : 'errChooseOne',
    diagnosisOther: f.diagnoses.includes('other') ? validateText(f.diagnosisOther, { min: 2, max: 100 }) : null,
    ...(f.sameAddress ? {} : validateAddress(f)),
    hospitalName: validateText(f.hospitalName, { min: 2, max: 100 }),
    hospitalAddress: validateText(f.hospitalAddress, { min: 2, max: 150 }),
    hospitalPhone: validatePhone(f.hospitalPhone, false),
  };
}
