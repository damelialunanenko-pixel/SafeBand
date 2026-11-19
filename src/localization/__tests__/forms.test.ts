import { formsDictionaries } from '../forms';

describe('form translations', () => {
  const keys = (lang: keyof typeof formsDictionaries) => Object.keys(formsDictionaries[lang]).sort();
  it.each(['ru', 'kk'] as const)('%s has exactly the same keys as en', (lang) => {
    expect(keys(lang)).toEqual(keys('en'));
  });
  it('has no empty strings', () => {
    for (const dict of Object.values(formsDictionaries)) for (const value of Object.values(dict)) expect(value.trim()).not.toBe('');
  });
  it('keeps {{placeholders}} consistent', () => {
    const vars = (s: string) => (s.match(/{{\w+}}/g) ?? []).sort().join();
    for (const key of keys('en')) {
      expect(vars(formsDictionaries.ru[key])).toBe(vars(formsDictionaries.en[key]));
      expect(vars(formsDictionaries.kk[key])).toBe(vars(formsDictionaries.en[key]));
    }
  });
});
