import { diagnosisSummary, emptyGuardianForm, emptyWardForm, guardianToDoc, guardianToForm, wardToDoc, wardToForm, withoutUndefined } from '../profile-mapping';

const address = { cityId: 'almaty', cityOther: 'ignored', street: ' пр.  Абая ', house: '10А', apartment: '' };

describe('guardian mapping', () => {
  it('cleans text, stores E.164 and drops empty optionals', () => {
    const doc = guardianToDoc({
      ...emptyGuardianForm, ...address, lastName: ' Иванова ', firstName: 'Айгерим', workPhone: '+7 (701) 123-45-67', relation: 'daughter', relationOther: 'x',
    });
    expect(doc).toEqual({
      lastName: 'Иванова', firstName: 'Айгерим', workPhone: '+77011234567', relation: 'daughter',
      address: { cityId: 'almaty', street: 'пр. Абая', house: '10А' },
    });
  });
  it('round-trips to the form with formatted phones', () => {
    const form = guardianToForm({ lastName: 'Иванова', workPhone: '+77011234567', address: { cityId: 'other', cityOther: 'Жезказган', street: 'Ленина', house: '1' } });
    expect(form.workPhone).toBe('+7 (701) 123-45-67');
    expect(form.cityOther).toBe('Жезказган');
  });
});

describe('ward mapping', () => {
  const ward = {
    ...emptyWardForm, lastName: 'Иванов', firstName: 'Серик', birthDate: '12.03.1950', diagnoses: ['dementia', 'other'], diagnosisOther: 'Склероз',
    hospitalName: 'Поликлиника №5', hospitalAddress: 'Толе би, 100', hospitalPhone: '',
  };
  const guardianAddress = { cityId: 'astana', street: 'Кенесары', house: '5' };

  it('keeps legacy name and diagnosis filled', () => {
    const doc = wardToDoc(ward, guardianAddress, 'ru');
    expect(doc.name).toBe('Иванов Серик');
    expect(doc.birthDate).toBe('1950-03-12');
    expect(doc.diagnosis).toBe('Деменция / болезнь Альцгеймера, Склероз');
    expect(doc.address).toEqual(guardianAddress);
    expect(doc.addressSameAsGuardian).toBe(true);
    expect(doc.hospital).toEqual({ name: 'Поликлиника №5', address: 'Толе би, 100' });
    expect('middleName' in doc).toBe(false);
  });
  it('uses its own address when not shared', () => {
    const doc = wardToDoc({ ...ward, sameAddress: false, ...address }, guardianAddress, 'en');
    expect(doc.address).toEqual({ cityId: 'almaty', street: 'пр. Абая', house: '10А' });
    expect(doc.addressSameAsGuardian).toBe(false);
  });
  it('round-trips birth date to the input mask', () => {
    expect(wardToForm({ id: 'w', guardianId: 'g', name: 'x', birthDate: '1950-03-12' }).birthDate).toBe('12.03.1950');
  });
  it('summarises diagnoses per language', () => {
    expect(diagnosisSummary(['epilepsy'], '', 'kk')).toBe('Эпилепсия');
    expect(diagnosisSummary(['diabetes'], '', 'en')).toBe('Diabetes');
  });
});

describe('withoutUndefined', () => {
  it('removes undefined deeply but keeps arrays and class instances', () => {
    const date = new Date(0);
    expect(withoutUndefined({ a: undefined, b: { c: undefined, d: 1 }, e: [1], f: date })).toEqual({ b: { d: 1 }, e: [1], f: date });
  });
});
