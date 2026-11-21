/**
 * Strings for UI elements added by the redesign (tab bar, quick actions, map sheet,
 * health chart, history groups). Merged into the main dictionaries in `./index.tsx`.
 * Existing texts are untouched; these keys are new.
 */
type Dictionary = Record<string, string>;

const en: Dictionary = {
  tabHome: 'Home', tabMap: 'Map', tabHealth: 'Health', tabSettings: 'Settings',
  greeting: 'Hi, {{name}}', notifications: 'Notifications', notificationsUnread: 'Notifications, new alerts',
  quickMap: 'Map', quickHealth: 'Health', quickHistory: 'History', quickCall: 'Call',
  onTheWay: 'On the way', sosActive: 'SOS is active', sosHint: 'Sends an alarm to the bracelet after two confirmations',
  pulseShort: 'Pulse', spo2Short: 'SpO₂', batteryShort: 'Battery',
  route: 'Route', call: 'Call', filter: 'Filter', close: 'Close',
  locationSource: 'Source', sourceGps: 'GPS', sourceCell: 'Cell towers', accuracyMeters: '±{{m}} m',
  showSafePlaces: 'Safe places', centerOnWard: 'Center on the person',
  today: 'Today', yesterday: 'Yesterday', earlier: 'Earlier',
  average: 'Average', minimum: 'Min', maximum: 'Max', period: 'Period', chartMetric: 'Chart metric',
  noReadingsChart: 'Not enough readings to draw a chart yet.',
  stepProgress: 'Registration progress',
};

const ru: Dictionary = {
  tabHome: 'Главная', tabMap: 'Карта', tabHealth: 'Здоровье', tabSettings: 'Настройки',
  greeting: 'Привет, {{name}}', notifications: 'Уведомления', notificationsUnread: 'Уведомления, есть новые тревоги',
  quickMap: 'Карта', quickHealth: 'Здоровье', quickHistory: 'История', quickCall: 'Позвонить',
  onTheWay: 'В пути', sosActive: 'SOS активен', sosHint: 'Отправит тревогу на браслет после двух подтверждений',
  pulseShort: 'Пульс', spo2Short: 'SpO₂', batteryShort: 'Заряд',
  route: 'Маршрут', call: 'Позвонить', filter: 'Фильтр', close: 'Закрыть',
  locationSource: 'Источник', sourceGps: 'GPS', sourceCell: 'По вышкам', accuracyMeters: '±{{m}} м',
  showSafePlaces: 'Безопасные места', centerOnWard: 'Показать подопечного',
  today: 'Сегодня', yesterday: 'Вчера', earlier: 'Ранее',
  average: 'Среднее', minimum: 'Мин.', maximum: 'Макс.', period: 'Период', chartMetric: 'Показатель на графике',
  noReadingsChart: 'Пока мало измерений, чтобы построить график.',
  stepProgress: 'Прогресс регистрации',
};

const kk: Dictionary = {
  tabHome: 'Басты бет', tabMap: 'Карта', tabHealth: 'Денсаулық', tabSettings: 'Баптаулар',
  greeting: 'Сәлем, {{name}}', notifications: 'Хабарландырулар', notificationsUnread: 'Хабарландырулар, жаңа дабылдар бар',
  quickMap: 'Карта', quickHealth: 'Денсаулық', quickHistory: 'Тарих', quickCall: 'Қоңырау шалу',
  onTheWay: 'Жолда', sosActive: 'SOS қосулы', sosHint: 'Екі растаудан кейін білезікке дабыл жібереді',
  pulseShort: 'Пульс', spo2Short: 'SpO₂', batteryShort: 'Заряд',
  route: 'Бағыт', call: 'Қоңырау шалу', filter: 'Сүзгі', close: 'Жабу',
  locationSource: 'Дереккөз', sourceGps: 'GPS', sourceCell: 'Мұнаралар бойынша', accuracyMeters: '±{{m}} м',
  showSafePlaces: 'Қауіпсіз орындар', centerOnWard: 'Қамқордағы адамды көрсету',
  today: 'Бүгін', yesterday: 'Кеше', earlier: 'Бұрын',
  average: 'Орташа', minimum: 'Ең аз', maximum: 'Ең көп', period: 'Кезең', chartMetric: 'Графиктегі көрсеткіш',
  noReadingsChart: 'График салу үшін өлшемдер әзірге аз.',
  stepProgress: 'Тіркелу барысы',
};

export const uiDictionaries = { en, ru, kk };
