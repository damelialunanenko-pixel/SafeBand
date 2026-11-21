import { uiDictionaries } from '../ui';

describe('UI translations', () => {
  const keys = (lang: keyof typeof uiDictionaries) => Object.keys(uiDictionaries[lang]).sort();
  it.each(['ru', 'kk'] as const)('%s has exactly the same keys as en', (lang) => {
    expect(keys(lang)).toEqual(keys('en'));
  });
  it('has no empty strings', () => {
    for (const dict of Object.values(uiDictionaries)) for (const value of Object.values(dict)) expect(value.trim()).not.toBe('');
  });
  it('keeps {{placeholders}} consistent', () => {
    const vars = (s: string) => (s.match(/{{\w+}}/g) ?? []).sort().join();
    for (const key of keys('en')) {
      expect(vars(uiDictionaries.ru[key])).toBe(vars(uiDictionaries.en[key]));
      expect(vars(uiDictionaries.kk[key])).toBe(vars(uiDictionaries.en[key]));
    }
  });
});
