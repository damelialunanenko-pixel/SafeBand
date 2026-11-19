import { ADDRESS_CITY_OPTIONS, DIAGNOSIS_OPTIONS, RELATION_OPTIONS } from '../profile-options';
import { SECURITY_QUESTIONS, areSecurityAnswersComplete, emptySecurityAnswers } from '../security-questions';

describe('security questions config', () => {
  it('has the expected number of options', () => {
    expect(SECURITY_QUESTIONS.map((q) => q.options.length)).toEqual([33, 21, 21, 20]);
  });
  it('uses unique IDs accepted by the Cloud Function (/^[a-z0-9_]{1,40}$/)', () => {
    for (const q of SECURITY_QUESTIONS) {
      const ids = q.options.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id).toMatch(/^[a-z0-9_]{1,40}$/);
    }
  });
  it('labels every option in all languages', () => {
    for (const option of [...SECURITY_QUESTIONS.flatMap((q) => q.options), ...ADDRESS_CITY_OPTIONS, ...RELATION_OPTIONS, ...DIAGNOSIS_OPTIONS]) {
      expect(option.label.ru && option.label.en && option.label.kk).toBeTruthy();
    }
  });
  it('detects complete answers', () => {
    expect(areSecurityAnswersComplete(emptySecurityAnswers())).toBe(false);
    expect(areSecurityAnswersComplete({ friendInitial: 'letter_01', fatherCity: 'abroad', firstCar: 'no_car', favoriteAnimal: 'cat' })).toBe(true);
    expect(areSecurityAnswersComplete({ friendInitial: 'letter_99', fatherCity: 'abroad', firstCar: 'no_car', favoriteAnimal: 'cat' })).toBe(false);
  });
  it('address cities exclude "abroad" and end with "other"', () => {
    expect(ADDRESS_CITY_OPTIONS.some((o) => o.id === 'abroad')).toBe(false);
    expect(ADDRESS_CITY_OPTIONS.at(-1)?.id).toBe('other');
  });
});
