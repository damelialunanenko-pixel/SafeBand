import {
  calculateAge, formatDateInput, formatPhoneInput, isValid, normalizeEmail, parseDateInput, passwordRules,
  toE164, validateAccountStep, validateAddress, validateBirthDate, validateBraceletId, validateEmail,
  validateGuardianForm, validateName, validatePassword, validatePasswordConfirm, validatePhone, validateWardForm,
} from '../validation';

describe('email', () => {
  it('normalizes case and whitespace', () => {
    expect(normalizeEmail('  Aigerim.S@Mail.KZ ')).toBe('aigerim.s@mail.kz');
  });
  it.each(['user@gmail.com', 'a.b-c+tag@sub.domain.kz', 'IVANOVA@YANDEX.RU', '  x@y.co  '])('accepts %s', (v) => {
    expect(validateEmail(v)).toBeNull();
  });
  it.each([
    ['', 'errRequired'],
    ['userexample.com', 'errEmailFormat'],
    ['user@localhost', 'errEmailFormat'],
    ['us er@mail.ru', 'errEmailFormat'],
    ['user..name@mail.ru', 'errEmailFormat'],
    ['.user@mail.ru', 'errEmailFormat'],
    ['user.@mail.ru', 'errEmailFormat'],
    ['user@mail..ru', 'errEmailFormat'],
    ['user@@mail.ru', 'errEmailFormat'],
    ['user@-mail.ru', 'errEmailFormat'],
    ['user@mail.r', 'errEmailFormat'],
  ])('rejects %p', (v, error) => {
    expect(validateEmail(v)).toBe(error);
  });
});

describe('password', () => {
  it('reports each rule separately', () => {
    expect(passwordRules('abc')).toEqual({ length: false, upper: false, lower: true, digitOrSymbol: false });
    expect(passwordRules('Abcdefgh')).toEqual({ length: true, upper: true, lower: true, digitOrSymbol: false });
    expect(passwordRules('Abcdefg1')).toEqual({ length: true, upper: true, lower: true, digitOrSymbol: true });
    expect(passwordRules('Abcdefg!').digitOrSymbol).toBe(true);
  });
  it('supports Cyrillic letters', () => {
    expect(validatePassword('Пароль12')).toBeNull();
  });
  it.each(['', 'short1A', 'alllowercase1', 'ALLUPPERCASE1', 'NoDigitsHere'])('rejects %p', (v) => {
    expect(validatePassword(v)).not.toBeNull();
  });
  it('checks confirmation', () => {
    expect(validatePasswordConfirm('Secret123', 'Secret123')).toBeNull();
    expect(validatePasswordConfirm('Secret123', 'Secret124')).toBe('errPasswordMismatch');
    expect(validatePasswordConfirm('Secret123', '')).toBe('errRequired');
  });
});

describe('phone', () => {
  it('formats KZ numbers progressively', () => {
    expect(formatPhoneInput('7')).toBe('+7');
    expect(formatPhoneInput('770')).toBe('+7 (70');
    expect(formatPhoneInput('7701')).toBe('+7 (701)');
    expect(formatPhoneInput('77011234567')).toBe('+7 (701) 123-45-67');
    expect(formatPhoneInput('87011234567')).toBe('+7 (701) 123-45-67');
    expect(formatPhoneInput('7011234567')).toBe('+7 (701) 123-45-67');
    expect(formatPhoneInput('+7 (701) 123-45-678999')).toBe('+7 (701) 123-45-67');
    expect(formatPhoneInput('')).toBe('');
  });
  it('stores E.164', () => {
    expect(toE164('+7 (701) 123-45-67')).toBe('+77011234567');
    expect(toE164('8 701 123 45 67')).toBe('+77011234567');
    expect(toE164('+7 (727) 250-12-34')).toBe('+77272501234');
    expect(toE164('+7 (701) 123')).toBeNull();
  });
  it('validates required and optional phones', () => {
    expect(validatePhone('')).toBe('errRequired');
    expect(validatePhone('+7')).toBe('errRequired');
    expect(validatePhone('', false)).toBeNull();
    expect(validatePhone('+7 (123) 456-78-90')).toBe('errPhone');
    expect(validatePhone('+7 (701) 123-45-67')).toBeNull();
  });
});

describe('names', () => {
  it.each(['Иванова', 'Айгерим', 'Жұмабек', 'Мамин-Сибиряк', 'Ван Дер', 'Smith'])('accepts %s', (v) => {
    expect(validateName(v)).toBeNull();
  });
  it.each([
    ['', 'errRequired'], ['А', 'errNameLength'], ['А'.repeat(51), 'errNameLength'],
    ['Иван1', 'errNameChars'], ['Иван--Петров', 'errNameChars'], ['-Иван', 'errNameChars'], ['Ivan!', 'errNameChars'],
  ])('rejects %p', (v, error) => {
    expect(validateName(v)).toBe(error);
  });
  it('allows an empty optional middle name', () => {
    expect(validateName('  ', false)).toBeNull();
  });
});

describe('dates', () => {
  const now = new Date(2026, 10, 19); // 19 Nov 2026
  it('masks input', () => {
    expect(formatDateInput('1')).toBe('1');
    expect(formatDateInput('1203')).toBe('12.03');
    expect(formatDateInput('12031950')).toBe('12.03.1950');
    expect(formatDateInput('12.03.19501')).toBe('12.03.1950');
  });
  it('parses real dates only', () => {
    expect(parseDateInput('12.03.1950')).toBe('1950-03-12');
    expect(parseDateInput('29.02.2024')).toBe('2024-02-29');
    expect(parseDateInput('29.02.2023')).toBeNull();
    expect(parseDateInput('31.04.2000')).toBeNull();
    expect(parseDateInput('1.1.2000')).toBeNull();
  });
  it('calculates age around the birthday', () => {
    expect(calculateAge('1950-11-19', now)).toBe(76);
    expect(calculateAge('1950-11-20', now)).toBe(75);
    expect(calculateAge('2000-01-01', now)).toBe(26);
  });
  it('validates birth date bounds', () => {
    expect(validateBirthDate('', now)).toBe('errRequired');
    expect(validateBirthDate('31.02.1950', now)).toBe('errDateFormat');
    expect(validateBirthDate('20.11.2026', now)).toBe('errDateFuture');
    expect(validateBirthDate('19.11.2026', now)).toBeNull();
    expect(validateBirthDate('19.11.1906', now)).toBeNull();
    expect(validateBirthDate('18.11.1905', now)).toBe('errDateTooOld');
  });
});

describe('bracelet id', () => {
  it('accepts simple ids and rejects others', () => {
    expect(validateBraceletId('CB-001')).toBeNull();
    expect(validateBraceletId('')).toBe('errRequired');
    expect(validateBraceletId('a b')).toBe('errBraceletId');
    expect(validateBraceletId('x/y')).toBe('errBraceletId');
  });
});

describe('steps', () => {
  const account = { email: 'user@mail.kz', password: 'Secret123', confirm: 'Secret123', phone: '+7 (701) 123-45-67', consent: true };
  it('account step is valid only when everything is filled', () => {
    expect(isValid(validateAccountStep(account))).toBe(true);
    expect(validateAccountStep({ ...account, consent: false }).consent).toBe('errConsent');
    expect(isValid(validateAccountStep({ ...account, confirm: 'x' }))).toBe(false);
  });

  const address = { cityId: 'almaty', cityOther: '', street: 'Абая', house: '10', apartment: '' };
  it('address requires other-city text only for "other"', () => {
    expect(isValid(validateAddress(address))).toBe(true);
    expect(validateAddress({ ...address, cityId: 'other' }).cityOther).toBe('errRequired');
    expect(validateAddress({ ...address, cityId: '' }).cityId).toBe('errChoose');
  });

  it('guardian form', () => {
    const guardian = { lastName: 'Иванова', firstName: 'Айгерим', middleName: '', workPhone: '+77011234567', secondPhone: '', relation: 'daughter', relationOther: '', ...address };
    expect(isValid(validateGuardianForm(guardian))).toBe(true);
    expect(validateGuardianForm({ ...guardian, relation: 'other' }).relationOther).toBe('errRequired');
    expect(validateGuardianForm({ ...guardian, secondPhone: '123' }).secondPhone).toBe('errPhone');
  });

  it('ward form skips address when it matches the guardian', () => {
    const ward = {
      lastName: 'Иванов', firstName: 'Серик', middleName: '', birthDate: '12.03.1950', diagnoses: ['dementia'], diagnosisOther: '',
      sameAddress: true, cityId: '', cityOther: '', street: '', house: '', apartment: '',
      hospitalName: 'Поликлиника №5', hospitalAddress: 'ул. Абая, 1', hospitalPhone: '',
    };
    expect(isValid(validateWardForm(ward))).toBe(true);
    expect(isValid(validateWardForm({ ...ward, sameAddress: false }))).toBe(false);
    expect(validateWardForm({ ...ward, diagnoses: [] }).diagnoses).toBe('errChooseOne');
    expect(validateWardForm({ ...ward, diagnoses: ['other'] }).diagnosisOther).toBe('errRequired');
  });
});
