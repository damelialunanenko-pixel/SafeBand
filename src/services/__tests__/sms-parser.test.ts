import { parseBraceletSms, samePhoneNumber } from '../sms-parser';

const SAMPLE = 'latitude: 43.23822021\nlongitude: 76.90017700\nsource: cell\naccuracy_m: 150\ncell0: 401,1,2270,1643,-70';

describe('parseBraceletSms', () => {
  it('parses the documented format', () => {
    expect(parseBraceletSms(SAMPLE)).toEqual({
      lat: 43.23822021, lng: 76.900177, source: 'cell', accuracyM: 150,
      cells: [{ mcc: 401, mnc: 1, lac: 2270, cellId: 1643, rssi: -70 }], extra: {},
    });
  });

  it('accepts any line order, CRLF, extra spaces and upper-case keys', () => {
    const parsed = parseBraceletSms('  SOURCE :  gps \r\nLongitude:76.9\r\n\r\nlatitude:43.2\r\n');
    expect(parsed).toMatchObject({ lat: 43.2, lng: 76.9, source: 'gps', cells: [] });
    expect(parsed?.accuracyM).toBeUndefined();
  });

  it('sorts cells by index and skips malformed ones', () => {
    const parsed = parseBraceletSms(`${SAMPLE}\ncell2: 401,1,3,3,-90\ncell1: 401,1,2,2,-80\ncell3: broken`);
    expect(parsed?.cells.map((c) => c.cellId)).toEqual([1643, 2, 3]);
  });

  it('keeps unknown keys in extra', () => {
    expect(parseBraceletSms(`${SAMPLE}\nbattery: 78\nfw: 1.2.3`)?.extra).toEqual({ battery: '78', fw: '1.2.3' });
  });

  it('accepts a decimal comma', () => {
    expect(parseBraceletSms('latitude: 43,5\nlongitude: 76,25')).toMatchObject({ lat: 43.5, lng: 76.25 });
  });

  it.each([
    ['empty', ''],
    ['no coordinates', 'source: cell\naccuracy_m: 150'],
    ['only latitude', 'latitude: 43.2'],
    ['not a number', 'latitude: abc\nlongitude: 76.9'],
    ['latitude out of range', 'latitude: 91\nlongitude: 76.9'],
    ['longitude out of range', 'latitude: 43\nlongitude: -181'],
    ['0,0 (no fix)', 'latitude: 0.0000\nlongitude: 0.0000'],
    ['plain text', 'Hello, your balance is 500 tg'],
  ])('returns null for %s', (_, text) => {
    expect(parseBraceletSms(text)).toBeNull();
  });

  it('ignores a negative accuracy', () => {
    expect(parseBraceletSms('latitude: 43\nlongitude: 76\naccuracy_m: -5')?.accuracyM).toBeUndefined();
  });
});

describe('samePhoneNumber', () => {
  it('compares the last 10 digits', () => {
    expect(samePhoneNumber('+7 701 123-45-67', '87011234567')).toBe(true);
    expect(samePhoneNumber('+77011234567', '+7 (701) 123-45-67')).toBe(true);
    expect(samePhoneNumber('+77011234567', '+77011234568')).toBe(false);
  });
  it('rejects empty or too short values', () => {
    expect(samePhoneNumber('', '87011234567')).toBe(false);
    expect(samePhoneNumber(null, undefined)).toBe(false);
    expect(samePhoneNumber('1234', '1234')).toBe(false);
  });
});
