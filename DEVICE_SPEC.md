# Device specification — Firestore schema and BLE GATT template

Краткая техническая спецификация для разработчика физического браслета: поля, типы, единицы, поток данных и шаблон GATT для BLE.

## 1. Обзор
- Firestore: основная запись состояния устройства в `devices/{braceletId}` и подробные показания в коллекции `healthReadings`.
- BLE: предлагается GATT с сервисами для телеметрии, управления и информации об устройстве.

## 2. Firestore: `devices/{braceletId}` (топ-level)
| Variable | Type | Unit | Direction | Required | Firestore path | Example |
|---|---:|---|---|---:|---|---|
| deviceId | string | — | device → server | yes | document id `devices/{braceletId}` | `BR-0001` |
| firmwareVersion | string | — | device → server | recommended | `devices/{braceletId}.firmwareVersion` | `v1.2.3` |
| hardwareVersion | string | — | device → server | optional | `devices/{braceletId}.hardwareVersion` | `HW-1` |
| connected | boolean | — | device → server | yes (state) | `devices/{braceletId}.connected` | `true` |
| worn | boolean | — | device → server | recommended | `devices/{braceletId}.worn` | `true` |
| battery | number | % | device → server | yes | `devices/{braceletId}.battery` | `78` |
| lastSyncAt | timestamp | ISO / Firestore Timestamp | device → server | recommended | `devices/{braceletId}.lastSyncAt` | `2026-08-24T...Z` |
| location.lat | number | degrees | device → server | optional | `devices/{braceletId}.location.lat` | `51.1694` |
| location.lng | number | degrees | device → server | optional | `devices/{braceletId}.location.lng` | `71.4491` |
| location.updatedAt | timestamp | ISO | device → server | recommended with location | `devices/{braceletId}.location.updatedAt` | `Timestamp` |
| heartRate | number | bpm | device → server | recommended | `devices/{braceletId}.heartRate` (also `healthReadings`) | `72` |
| spo2 | number | % | device → server | recommended | `devices/{braceletId}.spo2` (also `healthReadings`) | `98` |
| fall_detected | boolean | — | device → server | recommended | `devices/{braceletId}.fall_detected` | `true` |
| sos_pressed | boolean | — | device → server | recommended | `devices/{braceletId}.sos_pressed` | `true` |
| measurementQuality | number / enum | — | device → server | recommended | `devices/{braceletId}.measurementQuality` | `85` |
| commands | object | — | app → device | required for remote commands | `devices/{braceletId}.commands` | `{alarm: "sos_on", updatedAt: Timestamp}` |

### healthReadings collection (per-reading)
Document fields (recommended):
- `deviceId` (string) — id устройства
- `type` (string) — `heartRate`, `spo2`, `battery`, `location`, etc.
- `value` (number | object) — основное значение (для location — object {lat,lng})
- `unit` (string) — `bpm`, `%`, `%`, `deg`
- `recordedAt` (timestamp) — время снятия показания (device time or server time)
- `meta` (object) — необязательные поля: `quality`, `sensorId`

Пример: `healthReadings/{autoId}` = { deviceId: "BR-0001", type: "heartRate", value: 72, unit: "bpm", recordedAt: Timestamp }

## 3. Commands schema (app → device)
Поле `devices/{braceletId}.commands` (объект):
- `action` (string) — `sos_on`, `sos_off`, `vibrate`, `request_sync`
- `params` (object) — дополнительные параметры
- `updatedAt` (timestamp) — метка времени для детекта изменений
- `id` (string) — идентификатор команды (опционально)

Device должен опрашивать/подписываться на изменения `commands` и сбрасывать/подтверждать их после выполнения (например, записав `commands.lastAckAt`).

## 4. BLE GATT шаблон (рекомендуемый)
Используй собственные UUID в формате RFC-4122. Ниже — пример с заполнительными UUID.

Services:
- Device Information Service: `0000180a-0000-1000-8000-00805f9b34fb` (стандартный)
- Telemetry Service (custom): `0000fd00-0000-1000-8000-00805f9b34fb`
- Command Service (custom): `0000fd01-0000-1000-8000-00805f9b34fb`

Characteristics (within Telemetry Service):
- Heart Rate Characteristic
  - UUID: `00002a37-0000-1000-8000-00805f9b34fb` (or custom)
  - Properties: Notify, Read
  - Format: uint8 (BPM)
  - Scale: 1
  - Timestamp: send separate `ts` field via characteristic or include in healthReadings when syncing
  - Example bytes: `0x48` = 72 bpm

- SpO2 Characteristic
  - UUID: `0000fd10-0000-1000-8000-00805f9b34fb` (custom)
  - Properties: Notify, Read
  - Format: uint8 (%)
  - Example bytes: `0x62` = 98

- Battery Characteristic
  - UUID: `00002a19-0000-1000-8000-00805f9b34fb` (standard)
  - Properties: Notify, Read
  - Format: uint8 (0-100)

- Fall Detection / Event Characteristic
  - UUID: `0000fd11-0000-1000-8000-00805f9b34fb` (custom)
  - Properties: Notify
  - Format: bitfield or small struct: `{eventType:uint8, flags:uint8}`
  - eventType examples: 1=fall, 2=sos

- Location Characteristic (optional)
  - UUID: `0000fd12-0000-1000-8000-00805f9b34fb`
  - Properties: Notify, Read
  - Format: { lat:int32 (1e7 scaled), lng:int32 (1e7 scaled), accuracy:uint16, ts:int64 (ms since epoch) }
  - Byte order: little-endian

Command Service (from app to device):
- Commands Characteristic (write / write-with-response)
  - UUID: `0000fd20-0000-1000-8000-00805f9b34fb`
  - Properties: Write, WriteWithoutResponse
  - Payload: JSON string or compact TLV. Recommended minimal JSON: `{ "action": "vibrate", "params": {"pattern":1}, "id":"cmd-123", "ts":168... }`

- Command Ack Characteristic (notify)
  - UUID: `0000fd21-0000-1000-8000-00805f9b34fb`
  - Properties: Notify
  - Payload: `{ "id":"cmd-123", "status":"ok", "ts":... }`

Device Information (standard):
- Model, Serial Number, Firmware Revision characteristics — fill `deviceId`, `firmwareVersion`, `hardwareVersion`.

## 5. Byte formats и timestamp
- Для компактности: используйте little-endian integer fields.
- Timestamp: предпочтительно `int64` ms since epoch (UTC). Если устройство отправляет ISO-8601 строку, при синке преобразовать на сервере в Firestore Timestamp.

## 6. Sampling rates / требования по энергопотреблению
- Heart Rate: 1 Hz (можно адаптировать в зависимости от режима).
- SpO2: 0.2–1 Hz (при необходимости энергосбережения — реже).
- Location: 1/min (или при движении); высокочастотный трекинг отключать для энергосбережения.
- Fall/SOS: события — немедленное уведомление (push/notify) при срабатывании.

## 7. Синхронизация с Firestore
- Offline-first: устройство хранит буфер показаний и при наличии соединения отправляет пакет в `healthReadings` (batch insert) и обновляет `devices/{id}` полями `battery`, `lastSyncAt`, `connected`.
- Для подтверждения команд: после выполнения устройство должно записать ack в `devices/{id}.commandsAck` или через `commands.lastAckAt`.

## 8. Безопасность и pairing
- Pairing: BLE Secure Connection (LE Secure) рекомендован.
- pairingKey / authToken: минимум 128-битный ключ для аутентификации при первом связывании.
- При регистрации на сервере записывать `deviceId` и `publicKey` / fingerprint для проверки пакетов.

## 9. Firestore write patterns (рекомендация)
- Periodic/state fields: write to `devices/{id}` (small object) — lightweight.
- High-frequency samples: append to `healthReadings` with `deviceId`, `type`, `value`, `recordedAt`.
- Commands from app: write `devices/{id}.commands` (single object). Device should clear/ack.

## 10. Минимальный JSON пример (для отправки при sync)
{
  "deviceId": "BR-0001",
  "battery": 78,
  "connected": true,
  "worn": true,
  "lastSyncAt": "2026-08-24T12:00:00Z",
  "heartRate": 72,
  "spo2": 98,
  "location": { "lat": 51.1694, "lng": 71.4491, "updatedAt": "2026-08-24T11:59:00Z" }
}

---

Если нужно, могу:
- создать отдельную вкладку с готовым CSV/Markdown-таблицей для печати;
- сформировать конкретные UUID и точный байтовый протокол для каждой характеристики (compact binary spec);
- добавить пример кода прошивки (псевдо-C/Arduino/ESP32) для отправки в Firestore через шлюз (HTTP) или по BLE.

Готов продолжать: что сделать дальше?