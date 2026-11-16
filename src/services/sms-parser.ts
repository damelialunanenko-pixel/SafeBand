/**
 * Parser for the location SMS sent by the bracelet, e.g.:
 *
 *   latitude: 43.23822021
 *   longitude: 76.90017700
 *   source: cell
 *   accuracy_m: 150
 *   cell0: 401,1,2270,1643,-70
 *
 * `cellN` = "MCC,MNC,LAC,CellID,RSSI(dBm)". Lines may come in any order,
 * with extra spaces or \r\n. Pure function — no React Native / Firebase imports.
 */

import type { CellTower } from '../types/care';

export type { CellTower };

export type ParsedBraceletSms = {
  lat: number;
  lng: number;
  source?: string;
  accuracyM?: number;
  cells: CellTower[];
  /** Any other `key: value` lines, kept for debugging / future fields. */
  extra: Record<string, string>;
};

const toNumber = (value: string | undefined) => {
  if (value === undefined || value.trim() === '') return undefined;
  const n = Number(value.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

function parseCell(value: string): CellTower | null {
  const parts = value.split(',').map(p => Number(p.trim()));
  if (parts.length < 5 || parts.slice(0, 5).some(n => !Number.isFinite(n))) return null;
  const [mcc, mnc, lac, cellId, rssi] = parts;
  return { mcc, mnc, lac, cellId, rssi };
}

export function parseBraceletSms(text: string): ParsedBraceletSms | null {
  if (!text) return null;
  const fields: Record<string, string> = {};
  const cells: { index: number; cell: CellTower }[] = [];

  for (const rawLine of text.split(/\r?\n|\r/)) {
    const separator = rawLine.indexOf(':');
    if (separator <= 0) continue;
    const key = rawLine.slice(0, separator).trim().toLowerCase();
    const value = rawLine.slice(separator + 1).trim();
    if (!key) continue;
    const cellMatch = /^cell(\d+)$/.exec(key);
    if (cellMatch) {
      const cell = parseCell(value);
      if (cell) cells.push({ index: Number(cellMatch[1]), cell });
      continue;
    }
    fields[key] = value;
  }

  const lat = toNumber(fields.latitude ?? fields.lat);
  const lng = toNumber(fields.longitude ?? fields.lng ?? fields.lon);
  if (lat === undefined || lng === undefined) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  // 0,0 is what modems typically report when they have no fix.
  if (lat === 0 && lng === 0) return null;

  const accuracyM = toNumber(fields.accuracy_m ?? fields.accuracy);
  const known = new Set(['latitude', 'lat', 'longitude', 'lng', 'lon', 'source', 'accuracy_m', 'accuracy']);
  const extra = Object.fromEntries(Object.entries(fields).filter(([key]) => !known.has(key)));

  return {
    lat,
    lng,
    source: fields.source || undefined,
    accuracyM: accuracyM !== undefined && accuracyM >= 0 ? accuracyM : undefined,
    cells: cells.sort((a, b) => a.index - b.index).map(c => c.cell),
    extra,
  };
}

/** Keeps only digits and compares the last 10 — so "+7 701 123-45-67" matches "87011234567". */
export function samePhoneNumber(a?: string | null, b?: string | null): boolean {
  const digits = (value?: string | null) => (value ?? '').replace(/\D/g, '');
  const x = digits(a);
  const y = digits(b);
  if (x.length < 5 || y.length < 5) return false;
  return x.slice(-10) === y.slice(-10);
}
