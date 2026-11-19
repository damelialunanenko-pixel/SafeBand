import type { Language } from '@/localization';

/**
 * Security questions and their answer options.
 *
 * Only option IDs are sent to the server and hashed there, never the visible text, so switching
 * the app language (or fixing a translation) does not change what a user's answers are.
 * Never rename or reuse an existing ID: that would silently invalidate stored answers.
 */
export type LocalizedLabel = Record<Language, string>;
export type Option = { id: string; label: LocalizedLabel };
export type SecurityQuestionId = 'friendInitial' | 'fatherCity' | 'firstCar' | 'favoriteAnimal';
export type SecurityQuestion = { id: SecurityQuestionId; label: LocalizedLabel; options: Option[] };
export type SecurityAnswers = Record<SecurityQuestionId, string>;

const same = (text: string): LocalizedLabel => ({ ru: text, en: text, kk: text });

const RUSSIAN_ALPHABET = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('');
export const LETTER_OPTIONS: Option[] = RUSSIAN_ALPHABET.map((letter, i) => ({
  id: `letter_${String(i + 1).padStart(2, '0')}`,
  label: same(letter),
}));

/** Cities of Kazakhstan (also reused by the address forms, without `abroad`). */
export const CITY_OPTIONS: Option[] = [
  { id: 'almaty', label: { ru: 'Алматы', en: 'Almaty', kk: 'Алматы' } },
  { id: 'astana', label: { ru: 'Астана', en: 'Astana', kk: 'Астана' } },
  { id: 'shymkent', label: { ru: 'Шымкент', en: 'Shymkent', kk: 'Шымкент' } },
  { id: 'karaganda', label: { ru: 'Караганда', en: 'Karaganda', kk: 'Қарағанды' } },
  { id: 'aktobe', label: { ru: 'Актобе', en: 'Aktobe', kk: 'Ақтөбе' } },
  { id: 'taraz', label: { ru: 'Тараз', en: 'Taraz', kk: 'Тараз' } },
  { id: 'pavlodar', label: { ru: 'Павлодар', en: 'Pavlodar', kk: 'Павлодар' } },
  { id: 'ust_kamenogorsk', label: { ru: 'Усть-Каменогорск', en: 'Ust-Kamenogorsk', kk: 'Өскемен' } },
  { id: 'semey', label: { ru: 'Семей', en: 'Semey', kk: 'Семей' } },
  { id: 'atyrau', label: { ru: 'Атырау', en: 'Atyrau', kk: 'Атырау' } },
  { id: 'kostanay', label: { ru: 'Костанай', en: 'Kostanay', kk: 'Қостанай' } },
  { id: 'kyzylorda', label: { ru: 'Кызылорда', en: 'Kyzylorda', kk: 'Қызылорда' } },
  { id: 'uralsk', label: { ru: 'Уральск', en: 'Uralsk', kk: 'Орал' } },
  { id: 'petropavl', label: { ru: 'Петропавловск', en: 'Petropavl', kk: 'Петропавл' } },
  { id: 'aktau', label: { ru: 'Актау', en: 'Aktau', kk: 'Ақтау' } },
  { id: 'temirtau', label: { ru: 'Темиртау', en: 'Temirtau', kk: 'Теміртау' } },
  { id: 'turkistan', label: { ru: 'Туркестан', en: 'Turkistan', kk: 'Түркістан' } },
  { id: 'kokshetau', label: { ru: 'Кокшетау', en: 'Kokshetau', kk: 'Көкшетау' } },
  { id: 'taldykorgan', label: { ru: 'Талдыкорган', en: 'Taldykorgan', kk: 'Талдықорған' } },
  { id: 'ekibastuz', label: { ru: 'Экибастуз', en: 'Ekibastuz', kk: 'Екібастұз' } },
];

const CAR_OPTIONS: Option[] = [
  { id: 'toyota', label: same('Toyota') },
  { id: 'lada', label: { ru: 'Lada (ВАЗ)', en: 'Lada (VAZ)', kk: 'Lada (ВАЗ)' } },
  { id: 'hyundai', label: same('Hyundai') },
  { id: 'kia', label: same('Kia') },
  { id: 'volkswagen', label: same('Volkswagen') },
  { id: 'mercedes', label: same('Mercedes-Benz') },
  { id: 'bmw', label: same('BMW') },
  { id: 'audi', label: same('Audi') },
  { id: 'nissan', label: same('Nissan') },
  { id: 'honda', label: same('Honda') },
  { id: 'mitsubishi', label: same('Mitsubishi') },
  { id: 'chevrolet', label: same('Chevrolet') },
  { id: 'daewoo', label: same('Daewoo') },
  { id: 'lexus', label: same('Lexus') },
  { id: 'mazda', label: same('Mazda') },
  { id: 'subaru', label: same('Subaru') },
  { id: 'ford', label: same('Ford') },
  { id: 'opel', label: same('Opel') },
  { id: 'gaz', label: { ru: 'ГАЗ (Волга)', en: 'GAZ (Volga)', kk: 'ГАЗ (Волга)' } },
  { id: 'moskvich', label: { ru: 'Москвич', en: 'Moskvich', kk: 'Москвич' } },
  { id: 'no_car', label: { ru: 'Не было машины', en: 'We had no car', kk: 'Көлік болмаған' } },
];

const ANIMAL_OPTIONS: Option[] = [
  { id: 'cat', label: { ru: 'Кошка', en: 'Cat', kk: 'Мысық' } },
  { id: 'dog', label: { ru: 'Собака', en: 'Dog', kk: 'Ит' } },
  { id: 'horse', label: { ru: 'Лошадь', en: 'Horse', kk: 'Жылқы' } },
  { id: 'eagle', label: { ru: 'Орёл', en: 'Eagle', kk: 'Бүркіт' } },
  { id: 'wolf', label: { ru: 'Волк', en: 'Wolf', kk: 'Қасқыр' } },
  { id: 'fox', label: { ru: 'Лиса', en: 'Fox', kk: 'Түлкі' } },
  { id: 'bear', label: { ru: 'Медведь', en: 'Bear', kk: 'Аю' } },
  { id: 'dolphin', label: { ru: 'Дельфин', en: 'Dolphin', kk: 'Дельфин' } },
  { id: 'owl', label: { ru: 'Сова', en: 'Owl', kk: 'Үкі' } },
  { id: 'camel', label: { ru: 'Верблюд', en: 'Camel', kk: 'Түйе' } },
  { id: 'tiger', label: { ru: 'Тигр', en: 'Tiger', kk: 'Жолбарыс' } },
  { id: 'lion', label: { ru: 'Лев', en: 'Lion', kk: 'Арыстан' } },
  { id: 'snow_leopard', label: { ru: 'Барс', en: 'Snow leopard', kk: 'Барыс' } },
  { id: 'hare', label: { ru: 'Заяц', en: 'Hare', kk: 'Қоян' } },
  { id: 'parrot', label: { ru: 'Попугай', en: 'Parrot', kk: 'Тотықұс' } },
  { id: 'turtle', label: { ru: 'Черепаха', en: 'Turtle', kk: 'Тасбақа' } },
  { id: 'panda', label: { ru: 'Панда', en: 'Panda', kk: 'Панда' } },
  { id: 'elephant', label: { ru: 'Слон', en: 'Elephant', kk: 'Піл' } },
  { id: 'giraffe', label: { ru: 'Жираф', en: 'Giraffe', kk: 'Керік' } },
  { id: 'penguin', label: { ru: 'Пингвин', en: 'Penguin', kk: 'Пингвин' } },
];

export const SECURITY_QUESTIONS: SecurityQuestion[] = [
  {
    id: 'friendInitial',
    label: { ru: 'Первая буква имени вашего первого друга', en: 'First letter of your first friend’s name', kk: 'Алғашқы досыңыздың атының бірінші әрпі' },
    options: LETTER_OPTIONS,
  },
  {
    id: 'fatherCity',
    label: { ru: 'В каком городе родился ваш отец', en: 'City where your father was born', kk: 'Әкеңіз қай қалада туған' },
    options: [...CITY_OPTIONS, { id: 'abroad', label: { ru: 'Другой город / за границей', en: 'Another city / abroad', kk: 'Басқа қала / шетелде' } }],
  },
  {
    id: 'firstCar',
    label: { ru: 'Марка вашей первой машины (своей или семьи)', en: 'Make of your first car (yours or your family’s)', kk: 'Алғашқы көлігіңіздің маркасы (өзіңіздің не отбасыңыздың)' },
    options: CAR_OPTIONS,
  },
  {
    id: 'favoriteAnimal',
    label: { ru: 'Ваше любимое животное', en: 'Your favourite animal', kk: 'Сүйікті жануарыңыз' },
    options: ANIMAL_OPTIONS,
  },
];

export const emptySecurityAnswers = (): SecurityAnswers => ({ friendInitial: '', fatherCity: '', firstCar: '', favoriteAnimal: '' });

export const areSecurityAnswersComplete = (a: SecurityAnswers) =>
  SECURITY_QUESTIONS.every((q) => q.options.some((o) => o.id === a[q.id]));

export const optionLabel = (options: Option[], id: string | undefined, language: Language) =>
  options.find((o) => o.id === id)?.label[language] ?? '';
