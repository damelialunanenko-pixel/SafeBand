import { medicationDictionaries } from '../medications';

describe('medication translations', () => {
  const keys = (lang: keyof typeof medicationDictionaries) => Object.keys(medicationDictionaries[lang]).sort();
  it.each(['ru', 'kk'] as const)('%s has exactly the same keys as en', (lang) => {
    expect(keys(lang)).toEqual(keys('en'));
  });
  it('has no empty strings', () => {
    for (const dict of Object.values(medicationDictionaries)) for (const value of Object.values(dict)) expect(value.trim()).not.toBe('');
  });
  it('keeps {{placeholders}} consistent', () => {
    const vars = (s: string) => (s.match(/{{\w+}}/g) ?? []).sort().join();
    for (const key of keys('en')) {
      expect(vars(medicationDictionaries.ru[key])).toBe(vars(medicationDictionaries.en[key]));
      expect(vars(medicationDictionaries.kk[key])).toBe(vars(medicationDictionaries.en[key]));
    }
  });
});
