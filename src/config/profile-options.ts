import { CITY_OPTIONS, type Option } from './security-questions';

/** Address city list: the security-question cities (without "abroad") plus "Other" with a text field. */
export const ADDRESS_CITY_OPTIONS: Option[] = [
  ...CITY_OPTIONS,
  { id: 'other', label: { ru: 'Другой', en: 'Other', kk: 'Басқа' } },
];

/** Who the caregiver is to the ward. `other` shows a free-text field. */
export const RELATION_OPTIONS: Option[] = [
  { id: 'mother', label: { ru: 'Мать', en: 'Mother', kk: 'Анасы' } },
  { id: 'father', label: { ru: 'Отец', en: 'Father', kk: 'Әкесі' } },
  { id: 'child', label: { ru: 'Сын / дочь', en: 'Son / daughter', kk: 'Ұлы / қызы' } },
  { id: 'spouse', label: { ru: 'Муж / жена', en: 'Husband / wife', kk: 'Күйеуі / әйелі' } },
  { id: 'sibling', label: { ru: 'Брат / сестра', en: 'Brother / sister', kk: 'Ағасы / інісі / әпкесі / сіңлісі' } },
  { id: 'grandchild', label: { ru: 'Внук / внучка', en: 'Grandson / granddaughter', kk: 'Немересі' } },
  { id: 'relative', label: { ru: 'Другой родственник', en: 'Other relative', kk: 'Басқа туысы' } },
  { id: 'caregiver', label: { ru: 'Сиделка / соцработник', en: 'Carer / social worker', kk: 'Күтуші / әлеуметтік қызметкер' } },
  { id: 'friend', label: { ru: 'Друг', en: 'Friend', kk: 'Досы' } },
  { id: 'other', label: { ru: 'Другое', en: 'Other', kk: 'Басқа' } },
];

/** Ward diagnoses (multi-select). `other` shows a free-text field. */
export const DIAGNOSIS_OPTIONS: Option[] = [
  { id: 'dementia', label: { ru: 'Деменция / болезнь Альцгеймера', en: 'Dementia / Alzheimer’s disease', kk: 'Деменция / Альцгеймер ауруы' } },
  { id: 'autism', label: { ru: 'Расстройство аутистического спектра', en: 'Autism spectrum disorder', kk: 'Аутизм спектрінің бұзылысы' } },
  { id: 'down_syndrome', label: { ru: 'Синдром Дауна', en: 'Down syndrome', kk: 'Даун синдромы' } },
  { id: 'epilepsy', label: { ru: 'Эпилепсия', en: 'Epilepsy', kk: 'Эпилепсия' } },
  { id: 'parkinsons', label: { ru: 'Болезнь Паркинсона', en: 'Parkinson’s disease', kk: 'Паркинсон ауруы' } },
  { id: 'intellectual_disability', label: { ru: 'Умственная отсталость', en: 'Intellectual disability', kk: 'Ақыл-ой кемістігі' } },
  { id: 'stroke', label: { ru: 'Последствия инсульта', en: 'After-effects of a stroke', kk: 'Инсульт салдары' } },
  { id: 'diabetes', label: { ru: 'Сахарный диабет', en: 'Diabetes', kk: 'Қант диабеті' } },
  { id: 'cardiovascular', label: { ru: 'Сердечно-сосудистые заболевания', en: 'Cardiovascular disease', kk: 'Жүрек-қан тамырлары аурулары' } },
  { id: 'other', label: { ru: 'Другое', en: 'Other', kk: 'Басқа' } },
];
