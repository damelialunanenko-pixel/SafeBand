/*
 * SafeBand v2 — полная прошивка
 *   ESP32-C3 Super Mini + SIM800L + NEO-6M + MPU6050 + MAX30102 + INMP441
 *   + вибромотор + буззер + кнопка SOS
 *
 * Что делает:
 *   1. Статус по SMS каждые REPORT_INTERVAL_MIN минут: координаты (GPS -> GSM -> последнее место),
 *      пульс, SpO2, надет ли браслет, батарея, время.
 *   2. Падение (MPU6050): буззер + вибрация, CANCEL_WINDOW_SEC секунд на отмену кнопкой
 *      ("я в порядке"). Не отменили -> SMS "type: fall". После SMS нажатие кнопки -> SMS "type: ok".
 *   3. Кнопка SOS: удержание 2 с -> SMS "type: sos".
 *   4. Пульсометр MAX30102: пульс (bpm) и SpO2 (%), определение "браслет снят".
 *      Пульс вне HR_LOW..HR_HIGH дольше HR_ALERT_SEC -> SMS "type: hr".
 *      Браслет снят дольше REMOVED_ALERT_MIN -> SMS "type: removed".
 *   5. Микрофон INMP441: громкий звук -> короткая вибрация; долгий громкий звук
 *      (сирена, будильник, крик) -> серия из 3 вибраций. Для слабослышащих.
 *   6. SMS-команды с номеров из PHONES: LOC, INT <мин>, FIND (пищать), STOP (выключить тревогу).
 *
 * Arduino IDE:
 *   - Плата: "ESP32C3 Dev Module" (или "Nologo ESP32C3 Super Mini")
 *   - Ядро esp32 by Espressif версии 3.x
 *   - Tools -> USB CDC On Boot: "Enabled"
 *   - Библиотеки: TinyGPSPlus (Mikal Hart),
 *                 SparkFun MAX3010x Pulse and Proximity Sensor Library
 *   - Serial Monitor: 115200
 */

#include <Arduino.h>
#include <Wire.h>
#include <TinyGPSPlus.h>
#include <ESP_I2S.h>
#include "MAX30105.h"
#include "heartRate.h"
#include "spo2_algorithm.h"
#include <time.h>
#include <algorithm>
#include <sys/time.h>

#if ESP_ARDUINO_VERSION_MAJOR < 3
#error "Нужно ядро esp32 версии 3.x (Tools -> Board -> Boards Manager -> esp32 by Espressif)"
#endif
#if !ARDUINO_USB_CDC_ON_BOOT
#error "Включите Tools -> USB CDC On Boot: Enabled (UART0 занят под SIM800L)"
#endif

// ============================================================================
//                              НАСТРОЙКИ
// ============================================================================
#define DEVICE_ID "SB-001"            // id браслета (= braceletId в приложении)
#define FW_VERSION "2.0.0"

// Номера, куда слать SMS (телефон с приложением, родственники). Формат +7XXXXXXXXXX
const char *PHONES[] = {
  "+77000000000",
};
const int PHONE_COUNT = sizeof(PHONES) / sizeof(PHONES[0]);

uint32_t REPORT_INTERVAL_MIN = 10;     // период отправки статуса (можно менять SMS "INT 5")
const char *APN = "internet";          // APN оператора (для GSM-позиционирования)
const bool USE_GSM_LOCATION = true;    // пытаться AT+CIPGSMLOC, если нет GPS
const bool SEND_BOOT_SMS = true;       // SMS "type: on" при включении
const uint32_t GPS_FRESH_SEC = 180;    // GPS-фикс считается свежим, если ему меньше N секунд

// ---- Пины (как на схеме) ----
#define PIN_SDA     0    // I2C SDA (MPU6050 + MAX30102)
#define PIN_SCL     1    // I2C SCL (MPU6050 + MAX30102)
#define PIN_MIC_SCK 2    // INMP441 SCK
#define PIN_MIC_WS  3    // INMP441 WS
#define PIN_MIC_SD  4    // INMP441 SD
#define PIN_GSM_RX  5    // ESP RX  <- SIM800L TXD
#define PIN_GSM_TX  6    // ESP TX  -> делитель 10k/20k -> SIM800L RXD
#define PIN_GPS_RX  7    // ESP RX  <- GPS TX
#define PIN_LED     8    // синий LED на плате (горит при LOW)
#define PIN_BUZZER  10   // буззер (+)
#define PIN_BUTTON  20   // кнопка SOS -> GND
#define PIN_VIBRO   21   // база NPN-ключа вибромотора (через 1 кОм)

#define BUZZER_IS_ACTIVE 0    // 1 = активный буззер (пищит сам от +), 0 = пассивный (нужен ШИМ)
const uint16_t BUZZER_FREQ = 2700;

// ---- Тревога ----
const uint32_t CANCEL_WINDOW_SEC = 10;  // сколько секунд можно отменить падение кнопкой (0 = сразу SMS)
const uint32_t ALARM_SOUND_SEC   = 60;  // сколько пищать после отправки SMS
const uint32_t SOS_HOLD_MS       = 2000;

// ---- Пульс ----
const uint32_t WORN_IR_THRESHOLD = 50000; // IR выше — датчик прижат к коже
const int HR_LOW = 40, HR_HIGH = 150;     // границы тревоги по пульсу
const uint32_t HR_ALERT_SEC      = 120;   // пульс вне границ дольше N секунд -> SMS
const uint32_t REMOVED_ALERT_MIN = 5;     // браслет снят дольше N минут -> SMS (0 = выкл)

// ---- Микрофон ----
const float SOUND_ABS_MIN_DBFS   = -50.0f; // порог ~70 дБ SPL (меньше = чувствительнее)
const float SOUND_OVER_NOISE_DB  = 15.0f;  // насколько громче фонового шума
const uint32_t SOUND_LONG_MS     = 1500;   // звук дольше -> серия вибраций
const uint32_t SOUND_COOLDOWN_MS = 2000;
#define MIC_SLOT I2S_STD_SLOT_LEFT         // L/R микрофона на GND = LEFT (на 3V3 = RIGHT)

// ---- Детектор падения (подбирается на испытаниях) ----
const float FF_THRESHOLD_G     = 0.45f;  // |a| ниже — свободное падение
const uint32_t FF_MIN_MS       = 60;     // мин. длительность свободного падения
const float IMPACT_G           = 2.2f;   // удар после свободного падения
const float HARD_IMPACT_G      = 3.5f;   // очень сильный удар (без свободного падения)
const uint32_t IMPACT_WAIT_MS  = 800;    // сколько ждать удара после свободного падения
const uint32_t SETTLE_MS       = 1500;   // пауза после удара
const uint32_t STILL_WINDOW_MS = 2000;   // окно проверки неподвижности
const float STILL_STD_G        = 0.15f;  // разброс |a| ниже — человек лежит неподвижно
const float ORIENT_CHANGE_DEG  = 35.0f;  // поворот руки после падения

// ============================================================================

#define LOG(...) Serial.printf(__VA_ARGS__)

HardwareSerial &gsm = Serial0;     // UART0 -> SIM800L
HardwareSerial &gpsUart = Serial1; // UART1 -> NEO-6M
TinyGPSPlus gps;

// ---------------- общее состояние (между задачами) ----------------
portMUX_TYPE stateMux = portMUX_INITIALIZER_UNLOCKED;

struct Location {
  bool valid = false;
  double lat = 0, lng = 0;
  float accM = 0;          // примерная точность, м
  time_t epoch = 0;        // когда получено (UTC), 0 если время неизвестно
  uint32_t ms = 0;         // millis() в момент получения
  char src[6] = "NONE";
};

Location gpsFix;      // последний GPS-фикс (пишет sensorTask)
Location lastKnown;   // последнее известное место из любого источника (пишет loop)

volatile bool fallEvent = false;
volatile time_t fallEpoch = 0;
volatile bool mpuOk = false;
volatile bool timeKnown = false;

// пульсометр
volatile bool maxOk = false;
volatile int heartRate = 0;     // bpm, 0 = нет данных
volatile int spo2 = 0;          // %, 0 = нет данных
volatile bool worn = false;     // датчик прижат к коже

// кнопка (события выставляет sensorTask, сбрасывает loop)
volatile bool btnShort = false;
volatile bool btnLong = false;

// ============================================================================
//                 БУЗЗЕР И ВИБРОМОТОР (отдельная задача, не блокируется)
// ============================================================================
// Шаблон = массив длительностей мс: вкл, выкл, вкл, выкл...
const uint16_t PAT_ALARM[]    = {400, 200};
const uint16_t PAT_BEEP[]     = {120, 100};
const uint16_t PAT_CONFIRM[]  = {80, 80, 80, 300};
const uint16_t PAT_VIB_SHORT[] = {250, 50};
const uint16_t PAT_VIB_LONG[]  = {400, 250, 400, 250, 400, 250};
const uint16_t PAT_VIB_ALARM[] = {700, 300};

struct Player {
  const uint16_t *steps = nullptr;
  uint8_t len = 0, idx = 0, prio = 0;
  int16_t repeats = 0;          // сколько ещё раз повторить, -1 = бесконечно
  uint32_t stepStart = 0;
  bool on = false;
};
Player buzzP, vibP;
portMUX_TYPE fxMux = portMUX_INITIALIZER_UNLOCKED;
volatile uint32_t fxQuietUntil = 0;  // до этого момента микрофон игнорирует звук (свой шум)

static void playerStart(Player &p, const uint16_t *steps, uint8_t len, int16_t repeats, uint8_t prio) {
  portENTER_CRITICAL(&fxMux);
  if (!p.steps || prio >= p.prio) {
    p.steps = steps; p.len = len; p.idx = 0; p.repeats = repeats; p.prio = prio; p.stepStart = millis();
  }
  portEXIT_CRITICAL(&fxMux);
}
static void playerStop(Player &p) {
  portENTER_CRITICAL(&fxMux);
  p.steps = nullptr; p.prio = 0;
  portEXIT_CRITICAL(&fxMux);
}
#define BUZZ(pat, rep, prio) playerStart(buzzP, pat, sizeof(pat) / 2, rep, prio)
#define VIBE(pat, rep, prio) playerStart(vibP, pat, sizeof(pat) / 2, rep, prio)

static void buzzerOut(bool on) {
#if BUZZER_IS_ACTIVE
  digitalWrite(PIN_BUZZER, on);
#else
  ledcWriteTone(PIN_BUZZER, on ? BUZZER_FREQ : 0);
#endif
}
static void vibroOut(bool on) { digitalWrite(PIN_VIBRO, on); }

static void playerTick(Player &p, void (*out)(bool), uint32_t now) {
  bool want = false;
  portENTER_CRITICAL(&fxMux);
  if (p.steps) {
    while (p.steps && now - p.stepStart >= p.steps[p.idx]) {
      p.stepStart += p.steps[p.idx];
      if (++p.idx >= p.len) {
        p.idx = 0;
        if (p.repeats == 0) { p.steps = nullptr; p.prio = 0; }
        else if (p.repeats > 0) p.repeats--;
      }
    }
    want = p.steps && (p.idx % 2 == 0);
  }
  portEXIT_CRITICAL(&fxMux);
  if (want != p.on) { p.on = want; out(want); }
}

void fxTask(void *) {
  for (;;) {
    uint32_t now = millis();
    playerTick(buzzP, buzzerOut, now);
    playerTick(vibP, vibroOut, now);
    if (buzzP.on || vibP.on) fxQuietUntil = now + 400;
    vTaskDelay(pdMS_TO_TICKS(10));
  }
}

// ============================================================================
//                                ВРЕМЯ
// ============================================================================
static int64_t daysFromCivil(int y, unsigned m, unsigned d) {
  y -= m <= 2;
  const int era = (y >= 0 ? y : y - 399) / 400;
  const unsigned yoe = (unsigned)(y - era * 400);
  const unsigned doy = (153 * (m > 2 ? m - 3 : m + 9) + 2) / 5 + d - 1;
  const unsigned doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
  return (int64_t)era * 146097 + (int64_t)doe - 719468;
}

static time_t makeEpoch(int y, int mo, int d, int h, int mi, int s) {
  return (time_t)(daysFromCivil(y, mo, d) * 86400LL + h * 3600 + mi * 60 + s);
}

static void setClock(time_t epoch) {
  struct timeval tv = {epoch, 0};
  settimeofday(&tv, nullptr);
  timeKnown = true;
}

static time_t nowEpoch() { return timeKnown ? time(nullptr) : 0; }

static void fmtTime(time_t e, char *out, size_t n) {
  if (!e) { snprintf(out, n, "-"); return; }
  struct tm tm;
  gmtime_r(&e, &tm);
  strftime(out, n, "%Y-%m-%dT%H:%M:%SZ", &tm);
}

// ============================================================================
//                               MPU6050
// ============================================================================
#define MPU_ADDR 0x68

static bool mpuWrite(uint8_t reg, uint8_t val) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.write(val);
  return Wire.endTransmission() == 0;
}

static bool mpuInit() {
  if (!mpuWrite(0x6B, 0x80)) return false;  // reset
  delay(100);
  bool ok = mpuWrite(0x6B, 0x01)            // wake, PLL clock
         && mpuWrite(0x1A, 0x03)            // DLPF ~44 Hz
         && mpuWrite(0x19, 0x09)            // 100 Hz
         && mpuWrite(0x1C, 0x10)            // accel ±8g
         && mpuWrite(0x1B, 0x08);           // gyro ±500 °/s
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x75);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 1);
  uint8_t who = Wire.available() ? Wire.read() : 0;
  LOG("[MPU] WHO_AM_I=0x%02X %s\n", who, ok ? "ok" : "FAIL");
  return ok;
}

static bool mpuReadAccel(float &ax, float &ay, float &az) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom(MPU_ADDR, 6) != 6) return false;
  int16_t x = (Wire.read() << 8) | Wire.read();
  int16_t y = (Wire.read() << 8) | Wire.read();
  int16_t z = (Wire.read() << 8) | Wire.read();
  ax = x / 4096.0f; ay = y / 4096.0f; az = z / 4096.0f;  // ±8g -> 4096 LSB/g
  return true;
}

// ---------------- детектор падения ----------------
enum FallState { FS_IDLE, FS_FREEFALL, FS_WAIT_IMPACT, FS_SETTLE, FS_STILL };

struct FallDetector {
  FallState st = FS_IDLE;
  uint32_t t0 = 0;
  float gx = 0, gy = 0, gz = 1;       // сглаженный вектор гравитации
  float refX = 0, refY = 0, refZ = 1; // ориентация до падения
  float peak = 0;
  // статистика окна неподвижности
  float sum = 0, sum2 = 0, sx = 0, sy = 0, sz = 0;
  uint32_t n = 0;

  void reset() { st = FS_IDLE; }

  // возвращает true, если подтверждено падение
  bool update(float ax, float ay, float az, uint32_t now) {
    float mag = sqrtf(ax * ax + ay * ay + az * az);
    switch (st) {
      case FS_IDLE:
        gx += (ax - gx) * 0.05f; gy += (ay - gy) * 0.05f; gz += (az - gz) * 0.05f;
        if (mag < FF_THRESHOLD_G) {
          st = FS_FREEFALL; t0 = now; refX = gx; refY = gy; refZ = gz;
        } else if (mag > HARD_IMPACT_G) {
          refX = gx; refY = gy; refZ = gz; peak = mag;
          st = FS_SETTLE; t0 = now;
          LOG("[FALL] сильный удар %.1fg\n", mag);
        }
        break;
      case FS_FREEFALL:
        if (mag >= FF_THRESHOLD_G) {
          if (now - t0 < FF_MIN_MS) { st = FS_IDLE; break; }
          peak = mag;
          if (mag > IMPACT_G) {  // удар пришёл сразу, тем же отсчётом
            st = FS_SETTLE; t0 = now;
            LOG("[FALL] своб.падение + удар %.1fg\n", mag);
          } else { st = FS_WAIT_IMPACT; t0 = now; }
        }
        break;
      case FS_WAIT_IMPACT:
        if (mag > peak) peak = mag;
        if (mag > IMPACT_G) { st = FS_SETTLE; t0 = now; LOG("[FALL] своб.падение + удар %.1fg\n", mag); }
        else if (now - t0 > IMPACT_WAIT_MS) st = FS_IDLE;
        break;
      case FS_SETTLE:
        if (mag > peak) peak = mag;
        if (now - t0 > SETTLE_MS) { st = FS_STILL; t0 = now; sum = sum2 = sx = sy = sz = 0; n = 0; }
        break;
      case FS_STILL:
        sum += mag; sum2 += mag * mag; sx += ax; sy += ay; sz += az; n++;
        if (now - t0 >= STILL_WINDOW_MS && n > 10) {
          float mean = sum / n;
          float sd = sqrtf(fmaxf(0, sum2 / n - mean * mean));
          float mx = sx / n, my = sy / n, mz = sz / n;
          float dot = (mx * refX + my * refY + mz * refZ) /
                      (sqrtf(mx * mx + my * my + mz * mz) * sqrtf(refX * refX + refY * refY + refZ * refZ) + 1e-6f);
          float angle = acosf(fminf(1.0f, fmaxf(-1.0f, dot))) * 57.2958f;
          bool still = sd < STILL_STD_G;
          bool confirmed = still && (angle > ORIENT_CHANGE_DEG || peak > 3.0f);
          LOG("[FALL] проверка: sd=%.3f угол=%.0f° пик=%.1fg -> %s\n", sd, angle, peak,
              confirmed ? "ПАДЕНИЕ" : "ложное");
          st = FS_IDLE;
          gx = mx; gy = my; gz = mz;
          return confirmed;
        }
        break;
    }
    return false;
  }
} fall;

// ============================================================================
//                               MAX30102
// ============================================================================
MAX30105 pox;

static bool maxInit() {
  if (!pox.begin(Wire, I2C_SPEED_FAST)) { LOG("[MAX] не найден\n"); return false; }
  // яркость LED, усреднение 4, режим Red+IR, 400 Гц (-> 100 Гц после усреднения), 411 мкс, 16384
  pox.setup(0x24, 4, 2, 400, 411, 16384);
  LOG("[MAX] ok\n");
  return true;
}

struct PulseProc {
  // пульс по биениям (100 Гц)
  uint32_t sampleNo = 0, lastBeatSample = 0;
  int beats[6] = {0};
  uint8_t beatIdx = 0, beatCnt = 0;
  uint32_t lastBeatMs = 0, lastWornMs = 0;
  // SpO2 (алгоритм Maxim, 25 Гц, окно 100 отсчётов)
  uint32_t irBuf[100], redBuf[100];
  uint8_t bufN = 0, decim = 0;
  int spo2Smooth = 0;

  void resetAll() {
    beatCnt = beatIdx = 0; bufN = 0; spo2Smooth = 0;
    heartRate = 0; spo2 = 0;
  }

  void sample(uint32_t red, uint32_t ir, uint32_t now) {
    sampleNo++;
    if (ir < WORN_IR_THRESHOLD) {
      if (worn && now - lastWornMs > 3000) { worn = false; resetAll(); LOG("[MAX] браслет снят\n"); }
      return;
    }
    lastWornMs = now;
    if (!worn) { worn = true; LOG("[MAX] браслет на руке\n"); }

    if (checkForBeat(ir)) {
      uint32_t dt = (sampleNo - lastBeatSample) * 10;  // мс (100 Гц)
      lastBeatSample = sampleNo;
      int bpm = dt ? 60000 / dt : 0;
      if (bpm >= 30 && bpm <= 220) {
        beats[beatIdx] = bpm; beatIdx = (beatIdx + 1) % 6;
        if (beatCnt < 6) beatCnt++;
        lastBeatMs = now;
        if (beatCnt >= 3) {
          // медиана — устойчиво к пропущенным/лишним ударам
          int t[6]; memcpy(t, beats, sizeof t);
          std::sort(t, t + beatCnt);
          heartRate = t[beatCnt / 2];
        }
      }
    }
    if (now - lastBeatMs > 8000) { heartRate = 0; beatCnt = 0; }

    if (++decim >= 4) {  // 100 Гц -> 25 Гц
      decim = 0;
      irBuf[bufN] = ir; redBuf[bufN] = red; bufN++;
      if (bufN == 100) {
        int32_t sp, hr; int8_t spValid, hrValid;
        maxim_heart_rate_and_oxygen_saturation(irBuf, 100, redBuf, &sp, &spValid, &hr, &hrValid);
        if (spValid && sp >= 70 && sp <= 100) {
          spo2Smooth = spo2Smooth ? (spo2Smooth * 3 + sp) / 4 : sp;
          spo2 = spo2Smooth;
        }
        // сдвиг окна на 1 секунду
        memmove(irBuf, irBuf + 25, 75 * sizeof(uint32_t));
        memmove(redBuf, redBuf + 25, 75 * sizeof(uint32_t));
        bufN = 75;
      }
    }
  }
} pulse;

// ============================================================================
//            ЗАДАЧА ДАТЧИКОВ (работает даже пока модем шлёт SMS)
// ============================================================================
void sensorTask(void *) {
  uint32_t lastMpuRetry = 0, lastClockSync = 0, lastMaxRetry = 0;
  uint32_t btnDownAt = 0;
  bool btnWasDown = false, longFired = false;
  TickType_t wake = xTaskGetTickCount();
  for (;;) {
    uint32_t now = millis();

    // --- MPU6050, 100 Гц ---
    if (mpuOk) {
      float ax, ay, az;
      if (mpuReadAccel(ax, ay, az)) {
        if (fall.update(ax, ay, az, now)) {
          fallEpoch = nowEpoch();
          fallEvent = true;
        }
      } else {
        mpuOk = false;
        LOG("[MPU] ошибка чтения\n");
      }
    } else if (now - lastMpuRetry > 5000) {
      lastMpuRetry = now;
      mpuOk = mpuInit();
    }

    // --- MAX30102 ---
    if (maxOk) {
      pox.check();
      while (pox.available()) {
        pulse.sample(pox.getFIFORed(), pox.getFIFOIR(), now);
        pox.nextSample();
      }
    } else if (now - lastMaxRetry > 10000) {
      lastMaxRetry = now;
      maxOk = maxInit();
    }

    // --- кнопка: короткое нажатие / удержание ---
    bool down = digitalRead(PIN_BUTTON) == LOW;
    if (down && !btnWasDown) { btnDownAt = now; longFired = false; }
    if (down && !longFired && now - btnDownAt >= SOS_HOLD_MS) { longFired = true; btnLong = true; }
    if (!down && btnWasDown && !longFired && now - btnDownAt > 40) btnShort = true;
    btnWasDown = down;

    // --- GPS ---
    while (gpsUart.available()) gps.encode(gpsUart.read());
    if (gps.location.isUpdated() && gps.location.isValid()) {
      Location f;
      f.valid = true;
      f.lat = gps.location.lat();
      f.lng = gps.location.lng();
      f.accM = gps.hdop.isValid() ? gps.hdop.hdop() * 5.0f : 10.0f;
      f.ms = now;
      strcpy(f.src, "GPS");
      if (gps.date.isValid() && gps.time.isValid() && gps.date.year() >= 2024) {
        f.epoch = makeEpoch(gps.date.year(), gps.date.month(), gps.date.day(),
                            gps.time.hour(), gps.time.minute(), gps.time.second());
        if (!timeKnown || now - lastClockSync > 600000) { setClock(f.epoch); lastClockSync = now; }
      } else {
        f.epoch = nowEpoch();
      }
      portENTER_CRITICAL(&stateMux);
      gpsFix = f;
      portEXIT_CRITICAL(&stateMux);
    }

    vTaskDelayUntil(&wake, pdMS_TO_TICKS(10));
  }
}

// ============================================================================
//                  МИКРОФОН INMP441 -> ВИБРАЦИЯ ПРИ ЗВУКЕ
// ============================================================================
I2SClass i2s;
volatile bool micOk = false;
volatile bool alarmBusy = false;  // во время тревоги вибро не перебиваем
volatile float micLevelDb = -120, micFloorDb = -70;

void audioTask(void *) {
  i2s.setPins(PIN_MIC_SCK, PIN_MIC_WS, -1, PIN_MIC_SD);
  if (!i2s.begin(I2S_MODE_STD, 16000, I2S_DATA_BIT_WIDTH_32BIT, I2S_SLOT_MODE_MONO, MIC_SLOT)) {
    LOG("[MIC] ошибка I2S\n");
    vTaskDelete(nullptr);
  }
  micOk = true;
  LOG("[MIC] ok\n");

  static int32_t buf[256];  // 16 мс при 16 кГц
  float floorDb = -70, prevX = 0, hp = 0;
  uint32_t loudSince = 0, lastFire = 0;
  bool loud = false, longFired = false;

  for (;;) {
    size_t got = i2s.readBytes((char *)buf, sizeof buf);
    int n = got / 4;
    if (n <= 0) { vTaskDelay(1); continue; }
    double acc = 0;
    for (int i = 0; i < n; i++) {
      float x = (float)(buf[i] >> 8);      // 24-битный отсчёт
      hp = 0.995f * (hp + x - prevX);      // убрать постоянную составляющую
      prevX = x;
      acc += (double)hp * hp;
    }
    float rms = sqrt(acc / n);
    float db = 20.0f * log10f(rms / 8388608.0f + 1e-9f);
    micLevelDb = db;
    uint32_t now = millis();

    if ((int32_t)(now - fxQuietUntil) < 0) { loud = false; continue; }  // своя вибрация/буззер

    bool isLoud = db > SOUND_ABS_MIN_DBFS && db > floorDb + SOUND_OVER_NOISE_DB;
    if (!isLoud) {
      // фон: быстро вниз, медленно вверх
      floorDb += (db - floorDb) * (db < floorDb ? 0.05f : 0.002f);
      if (floorDb < -90) floorDb = -90;
      micFloorDb = floorDb;
      loud = false;
      continue;
    }
    if (!loud) { loud = true; loudSince = now; longFired = false; }
    if (alarmBusy) continue;

    if (!longFired && now - loudSince >= SOUND_LONG_MS) {
      longFired = true; lastFire = now;
      LOG("[MIC] долгий громкий звук %.0f dBFS\n", db);
      VIBE(PAT_VIB_LONG, 0, 1);
    } else if (now - loudSince < 100 && now - lastFire > SOUND_COOLDOWN_MS) {
      lastFire = now;
      LOG("[MIC] звук %.0f dBFS (фон %.0f)\n", db, floorDb);
      VIBE(PAT_VIB_SHORT, 0, 1);
    }
  }
}

// ============================================================================
//                               SIM800L
// ============================================================================
static char mbuf[768];
bool modemOk = false;

static void drainModem() {
  while (gsm.available()) gsm.read();
}

// Отправить AT-команду и ждать `expect` (или ERROR / таймаут). Ответ в mbuf.
static bool at(const char *cmd, uint32_t timeoutMs = 2000, const char *expect = "OK") {
  if (cmd) {
    drainModem();
    gsm.print(cmd);
    gsm.print("\r");
  }
  size_t n = 0;
  mbuf[0] = 0;
  uint32_t t0 = millis();
  while (millis() - t0 < timeoutMs) {
    while (gsm.available()) {
      char c = gsm.read();
      if (n < sizeof(mbuf) - 1) { mbuf[n++] = c; mbuf[n] = 0; }
      if (strstr(mbuf, expect)) {
        // дочитать хвост ответа до паузы 60 мс
        uint32_t last = millis();
        while (millis() - last < 60) {
          if (gsm.available()) {
            char d = gsm.read();
            if (n < sizeof(mbuf) - 1) { mbuf[n++] = d; mbuf[n] = 0; }
            last = millis();
          } else delay(2);
        }
        return true;
      }
      if (strstr(mbuf, "ERROR")) return false;
    }
    delay(5);
  }
  return false;
}

static bool networkReady() {
  if (!at("AT+CREG?")) return false;
  const char *p = strstr(mbuf, "+CREG:");
  if (!p) return false;
  int mode = 0, stat = 0;
  sscanf(p, "+CREG: %d,%d", &mode, &stat);
  return stat == 1 || stat == 5;  // 1 = домашняя сеть, 5 = роуминг
}

// Время сети (если оператор передаёт его): +CCLK: "26/11/22,14:05:00+20"
static void syncClockFromModem() {
  if (timeKnown || !at("AT+CCLK?")) return;
  const char *p = strstr(mbuf, "+CCLK:");
  int yy, mo, d, h, mi, s, tzq = 0;
  if (!p || sscanf(p, "+CCLK: \"%d/%d/%d,%d:%d:%d%d", &yy, &mo, &d, &h, &mi, &s, &tzq) < 6) return;
  if (yy < 24 || yy > 80) return;  // время не пришло из сети
  setClock(makeEpoch(2000 + yy, mo, d, h, mi, s) - tzq * 15 * 60);
  LOG("[GSM] время из сети установлено\n");
}

static bool modemInit() {
  LOG("[GSM] инициализация...\n");
  bool alive = false;
  for (int i = 0; i < 15 && !alive; i++) alive = at("AT", 500);
  if (!alive) { LOG("[GSM] модем не отвечает (питание? RX/TX?)\n"); return false; }
  at("ATE0");
  at("AT+CMEE=2");
  at("AT+CMGF=1");             // текстовый режим SMS
  at("AT+CSCS=\"GSM\"");
  at("AT+CNMI=0,0,0,0,0");     // входящие SMS не выталкивать, читаем сами
  at("AT+CREG=2");             // CREG? будет возвращать LAC и CellID
  at("AT+COPS=3,2");           // оператор в цифровом виде (MCC+MNC)
  if (at("AT+CLTS?") && strstr(mbuf, "+CLTS: 0")) {
    at("AT+CLTS=1"); at("AT&W");  // синхронизация времени с сетью (заработает после перезапуска модема)
  }
  if (at("AT+CPIN?") && !strstr(mbuf, "READY")) { LOG("[GSM] SIM-карта не готова: %s\n", mbuf); }

  uint32_t t0 = millis();
  while (!networkReady() && millis() - t0 < 60000) delay(1000);
  if (!networkReady()) { LOG("[GSM] нет регистрации в сети\n"); return false; }
  if (at("AT+CSQ")) LOG("[GSM] сигнал: %s", strstr(mbuf, "+CSQ") ? strstr(mbuf, "+CSQ") : "?\n");
  at("AT+CMGD=1,4", 5000);     // очистить память SMS
  syncClockFromModem();
  LOG("[GSM] готов\n");
  return true;
}

static bool sendSms(const char *phone, const char *text) {
  char cmd[48];
  snprintf(cmd, sizeof cmd, "AT+CMGS=\"%s\"", phone);
  if (!at(cmd, 5000, ">")) { gsm.write(27); return false; }
  gsm.print(text);
  gsm.write(26);  // Ctrl+Z
  bool ok = at(nullptr, 60000, "+CMGS:");
  LOG("[SMS] -> %s : %s\n", phone, ok ? "отправлено" : "ОШИБКА");
  return ok;
}

// Напряжение батареи с пина VCC SIM800L (он питается прямо от аккумулятора)
static int readBatteryPercent(int *mvOut = nullptr) {
  if (!at("AT+CBC")) return -1;
  const char *p = strstr(mbuf, "+CBC:");
  int st, pct, mv;
  if (!p || sscanf(p, "+CBC: %d,%d,%d", &st, &pct, &mv) != 3) return -1;
  if (mvOut) *mvOut = mv;
  // кривая разряда Li-Po
  const int tbl[][2] = {{4200, 100}, {4100, 90}, {4000, 80}, {3900, 65}, {3800, 50},
                        {3750, 40}, {3700, 30}, {3650, 20}, {3600, 12}, {3500, 5}, {3300, 0}};
  if (mv >= 4200) return 100;
  for (int i = 1; i < 11; i++)
    if (mv >= tbl[i][0])
      return tbl[i][1] + (mv - tbl[i][0]) * (tbl[i - 1][1] - tbl[i][1]) / (tbl[i - 1][0] - tbl[i][0]);
  return 0;
}

struct CellInfo { bool valid = false; int mcc = 0, mnc = 0; unsigned lac = 0, cid = 0; };

static CellInfo readCell() {
  CellInfo c;
  if (at("AT+CREG?")) {
    const char *p = strstr(mbuf, "+CREG:");
    int mode, stat;
    if (p && sscanf(p, "+CREG: %d,%d,\"%x\",\"%x\"", &mode, &stat, &c.lac, &c.cid) == 4) c.valid = true;
  }
  if (c.valid && at("AT+COPS?")) {
    const char *p = strstr(mbuf, "+COPS:");
    char op[8] = {0};
    int a, b;
    if (p && sscanf(p, "+COPS: %d,%d,\"%7[0-9]\"", &a, &b, op) == 3 && strlen(op) >= 5) {
      char mcc[4] = {op[0], op[1], op[2], 0};
      c.mcc = atoi(mcc);
      c.mnc = atoi(op + 3);
    } else c.valid = false;
  }
  return c;
}

// GSM-позиционирование SIM800L. Нужен мобильный интернет на SIM. Работает не у всех операторов.
static bool gsmLocate(Location &out) {
  char cmd[64];
  at("AT+SAPBR=3,1,\"Contype\",\"GPRS\"");
  snprintf(cmd, sizeof cmd, "AT+SAPBR=3,1,\"APN\",\"%s\"", APN);
  at(cmd);
  at("AT+SAPBR=1,1", 30000);  // может ответить ERROR, если уже открыто — это нормально
  bool ok = false;
  if (at("AT+CIPGSMLOC=1,1", 45000)) {
    const char *p = strstr(mbuf, "+CIPGSMLOC:");
    int code = -1;
    double lng = 0, lat = 0;
    if (p && sscanf(p, "+CIPGSMLOC: %d,%lf,%lf", &code, &lng, &lat) == 3 && code == 0 && (lat != 0 || lng != 0)) {
      out.valid = true; out.lat = lat; out.lng = lng; out.accM = 1000;
      out.ms = millis(); out.epoch = nowEpoch(); strcpy(out.src, "GSM");
      ok = true;
    }
  }
  at("AT+SAPBR=0,1", 10000);
  LOG("[GSM] позиционирование: %s\n", ok ? "ok" : "не удалось");
  return ok;
}

// ============================================================================
//                              ФОРМИРОВАНИЕ SMS
// ============================================================================
struct Sms {
  char b[161];
  size_t n = 0;
  Sms() { b[0] = 0; }
  // строка "ключ: значение"; если не влезает в 160 символов — пропускается
  void add(const char *key, const char *val) {
    char line[72];
    int len = snprintf(line, sizeof line, n ? "\n%s: %s" : "%s: %s", key, val);
    if (len > 0 && n + len <= 160) { memcpy(b + n, line, len + 1); n += len; }
  }
  void addRaw(const char *s) {
    size_t len = strlen(s);
    if (n + len <= 160) { memcpy(b + n, s, len + 1); n += len; }
  }
};

// Определить местоположение. slow=true — разрешено GSM-позиционирование (до ~40 с)
static Location resolveLocation(bool slow) {
  Location g;
  portENTER_CRITICAL(&stateMux);
  g = gpsFix;
  portEXIT_CRITICAL(&stateMux);

  if (g.valid && millis() - g.ms < GPS_FRESH_SEC * 1000UL) { lastKnown = g; return g; }
  if (slow && USE_GSM_LOCATION && modemOk) {
    Location l;
    if (gsmLocate(l)) { lastKnown = l; return l; }
  }
  // самое свежее из известного
  if (g.valid && (!lastKnown.valid || g.ms > lastKnown.ms)) lastKnown = g;
  Location l = lastKnown;
  if (l.valid) strcpy(l.src, "LAST");
  return l;
}

static void buildMessage(Sms &m, const char *type, time_t eventEpoch, const Location &loc, int bat,
                         const CellInfo &cell) {
  char v[48];
  m.addRaw("SafeBand");
  m.add("type", type);
  m.add("id", DEVICE_ID);
  if (loc.valid) {
    snprintf(v, sizeof v, "%.6f", loc.lat); m.add("lat", v);
    snprintf(v, sizeof v, "%.6f", loc.lng); m.add("lng", v);
  }
  m.add("src", loc.valid ? loc.src : "NONE");
  fmtTime(eventEpoch ? eventEpoch : nowEpoch(), v, sizeof v);
  m.add("time", v);
  if (loc.valid && strcmp(loc.src, "LAST") == 0) {
    snprintf(v, sizeof v, "%lu", (unsigned long)((millis() - loc.ms) / 60000)); m.add("age", v);
  }
  if (loc.valid && strcmp(loc.src, "LAST") != 0) { snprintf(v, sizeof v, "%.0f", loc.accM); m.add("acc", v); }
  if (bat >= 0) { snprintf(v, sizeof v, "%d", bat); m.add("bat", v); }
  if (cell.valid && (!loc.valid || strcmp(loc.src, "GPS") != 0)) {
    snprintf(v, sizeof v, "%d,%d,%u,%u", cell.mcc, cell.mnc, cell.lac, cell.cid); m.add("cell", v);
  }
  if (heartRate > 0) { snprintf(v, sizeof v, "%d", (int)heartRate); m.add("hr", v); }
  if (spo2 > 0) { snprintf(v, sizeof v, "%d", (int)spo2); m.add("spo2", v); }
  if (maxOk) m.add("worn", worn ? "1" : "0");
  if (loc.valid) { snprintf(v, sizeof v, "maps.google.com/?q=%.5f,%.5f", loc.lat, loc.lng); m.add("map", v); }
}

// Отправить сообщение всем номерам. Возвращает true, если ушло хотя бы на один.
static bool sendToAll(const char *type, time_t eventEpoch, bool slowLocation, const char *onlyPhone = nullptr) {
  if (!modemOk) return false;
  Location loc = resolveLocation(slowLocation);
  int bat = readBatteryPercent();
  CellInfo cell;
  if (!loc.valid || strcmp(loc.src, "GPS") != 0) cell = readCell();
  Sms m;
  buildMessage(m, type, eventEpoch, loc, bat, cell);
  LOG("[SMS] текст (%u симв.):\n%s\n", (unsigned)m.n, m.b);
  bool any = false;
  if (onlyPhone) return sendSms(onlyPhone, m.b);
  for (int i = 0; i < PHONE_COUNT; i++) any |= sendSms(PHONES[i], m.b);
  return any;
}

// ============================================================================
//                            ВХОДЯЩИЕ SMS-КОМАНДЫ
// ============================================================================
static bool phoneAllowed(const char *num) {
  size_t ln = strlen(num);
  if (ln < 10) return false;
  for (int i = 0; i < PHONE_COUNT; i++) {
    size_t lp = strlen(PHONES[i]);
    if (lp >= 10 && strcmp(num + ln - 10, PHONES[i] + lp - 10) == 0) return true;  // сравнить последние 10 цифр
  }
  return false;
}

uint32_t nextReportMs = 0;

volatile bool remoteStop = false;

static void handleCommand(const char *from, char *text) {
  for (char *p = text; *p; p++) *p = toupper(*p);
  LOG("[CMD] от %s: %s\n", from, text);
  if (!phoneAllowed(from)) { LOG("[CMD] номер не в списке — игнор\n"); return; }
  if (strstr(text, "LOC") || strstr(text, "WHERE") || strstr(text, "STATUS")) {
    sendToAll("status", 0, true, from);
  } else if (strstr(text, "FIND")) {
    BUZZ(PAT_BEEP, 40, 2);  // попищать ~9 с, чтобы найти браслет
    VIBE(PAT_VIB_SHORT, 5, 2);
  } else if (strstr(text, "STOP")) {
    remoteStop = true;
  } else if (strncmp(text, "INT", 3) == 0) {
    int m = atoi(text + 3);
    if (m >= 1 && m <= 120) {
      REPORT_INTERVAL_MIN = m;
      nextReportMs = millis() + REPORT_INTERVAL_MIN * 60000UL;
      char r[40];
      snprintf(r, sizeof r, "SafeBand\nid: %s\ninterval: %d", DEVICE_ID, m);
      sendSms(from, r);
    }
  }
}

static void checkIncomingSms() {
  if (!at("AT+CMGL=\"REC UNREAD\"", 8000)) return;
  // Копируем ответ, т.к. обработка команд перезапишет mbuf
  static char list[768];
  strncpy(list, mbuf, sizeof list - 1);
  list[sizeof list - 1] = 0;
  bool hadAny = false;
  char *save = nullptr;
  char *line = strtok_r(list, "\r\n", &save);
  while (line) {
    if (strncmp(line, "+CMGL:", 6) == 0) {
      hadAny = true;
      char from[24] = {0};
      // +CMGL: 1,"REC UNREAD","+77001234567","","26/11/22,14:00:00+24"
      const char *q = line;
      for (int i = 0; i < 3 && q; i++) { q = strchr(q, '"'); if (q) q++; }
      if (q) {
        const char *e = strchr(q, '"');
        if (e && e - q < (int)sizeof from) memcpy(from, q, e - q);
      }
      char *body = strtok_r(nullptr, "\r\n", &save);
      if (body) handleCommand(from, body);
    }
    line = strtok_r(nullptr, "\r\n", &save);
  }
  if (hadAny) at("AT+CMGD=1,1", 5000);  // удалить прочитанные
}

// ============================================================================
//                                SETUP / LOOP
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(1500);
  LOG("\n=== SafeBand v2 %s (%s) ===\n", FW_VERSION, DEVICE_ID);

  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_LED, LOW);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  pinMode(PIN_VIBRO, OUTPUT);
  digitalWrite(PIN_VIBRO, LOW);
#if BUZZER_IS_ACTIVE
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);
#else
  ledcAttach(PIN_BUZZER, BUZZER_FREQ, 8);
  ledcWriteTone(PIN_BUZZER, 0);
#endif

  Wire.begin(PIN_SDA, PIN_SCL, 400000);
  mpuOk = mpuInit();
  maxOk = maxInit();

  gpsUart.setRxBufferSize(1024);
  gpsUart.begin(9600, SERIAL_8N1, PIN_GPS_RX, -1);

  gsm.setRxBufferSize(1024);
  gsm.begin(9600, SERIAL_8N1, PIN_GSM_RX, PIN_GSM_TX);

  xTaskCreate(fxTask, "fx", 2048, nullptr, 4, nullptr);
  xTaskCreate(sensorTask, "sensors", 6144, nullptr, 3, nullptr);
  xTaskCreate(audioTask, "audio", 4096, nullptr, 2, nullptr);

  BUZZ(PAT_CONFIRM, 0, 1);  // "пик-пик" — браслет включился
  VIBE(PAT_VIB_SHORT, 0, 1);

  delay(3000);  // SIM800L стартует несколько секунд
  modemOk = modemInit();
  if (modemOk && SEND_BOOT_SMS) sendToAll("on", 0, false);
  nextReportMs = millis() + 60000;  // первый статус через минуту
  digitalWrite(PIN_LED, HIGH);
}

// ---------------- тревога ----------------
enum AlarmState { AL_IDLE, AL_COUNTDOWN, AL_ACTIVE };
AlarmState alarmState = AL_IDLE;
uint32_t alarmDeadline = 0, alarmSoundUntil = 0;
time_t alarmEpoch = 0;
bool alarmSmsPending = false;
const char *alarmType = "fall";
uint32_t lastAlarmTry = 0;

static void alarmStartSound() {
  alarmBusy = true;
  BUZZ(PAT_ALARM, -1, 3);
  VIBE(PAT_VIB_ALARM, -1, 3);
}
static void alarmStopSound() {
  playerStop(buzzP);
  playerStop(vibP);
  alarmBusy = false;
}

static void alarmHandle(uint32_t now) {
  bool shortP = btnShort, longP = btnLong;
  btnShort = btnLong = false;
  bool stop = remoteStop;
  remoteStop = false;

  // новое падение
  if (fallEvent) {
    fallEvent = false;
    if (alarmState == AL_IDLE) {
      LOG("!!! ПАДЕНИЕ — %lu с на отмену кнопкой !!!\n", (unsigned long)CANCEL_WINDOW_SEC);
      alarmType = "fall";
      alarmEpoch = fallEpoch;
      alarmState = AL_COUNTDOWN;
      alarmDeadline = now + CANCEL_WINDOW_SEC * 1000UL;
      alarmStartSound();
      shortP = longP = false;  // нажатие в момент падения не считаем
    }
  }

  switch (alarmState) {
    case AL_IDLE:
      if (longP) {  // SOS
        LOG("!!! SOS !!!\n");
        alarmType = "sos";
        alarmEpoch = nowEpoch();
        alarmState = AL_ACTIVE;
        alarmSmsPending = true;
        lastAlarmTry = 0;
        alarmBusy = true;
        BUZZ(PAT_CONFIRM, 2, 3);
        VIBE(PAT_VIB_LONG, 0, 3);
        alarmSoundUntil = now + 3000;
      }
      break;

    case AL_COUNTDOWN:
      if (shortP || longP || stop) {
        LOG("[ALARM] отменено — человек в порядке\n");
        alarmStopSound();
        BUZZ(PAT_CONFIRM, 0, 1);
        alarmState = AL_IDLE;
      } else if ((int32_t)(now - alarmDeadline) >= 0) {
        alarmState = AL_ACTIVE;
        alarmSmsPending = true;
        lastAlarmTry = 0;
        alarmSoundUntil = now + ALARM_SOUND_SEC * 1000UL;
      }
      break;

    case AL_ACTIVE:
      if (alarmSmsPending && (lastAlarmTry == 0 || now - lastAlarmTry > 30000)) {
        lastAlarmTry = now;
        if (sendToAll(alarmType, alarmEpoch, false)) alarmSmsPending = false;
        now = millis();
      }
      if (alarmBusy && (int32_t)(now - alarmSoundUntil) >= 0) alarmStopSound();
      if (shortP || stop) {
        alarmStopSound();
        BUZZ(PAT_CONFIRM, 0, 1);
        bool wasSent = !alarmSmsPending;
        alarmSmsPending = false;
        alarmState = AL_IDLE;
        LOG("[ALARM] сброшено\n");
        if (wasSent && shortP) sendToAll("ok", 0, false);  // "со мной всё хорошо"
      }
      break;
  }
}

// ---------------- контроль пульса и снятия браслета ----------------
static void healthHandle(uint32_t now) {
  static uint32_t badSince = 0, lastHrAlert = 0, removedSince = 0;
  static bool removedSent = false;

  int hr = heartRate;
  if (worn && hr > 0 && (hr < HR_LOW || hr > HR_HIGH)) {
    if (!badSince) badSince = now;
    if (now - badSince > HR_ALERT_SEC * 1000UL && (!lastHrAlert || now - lastHrAlert > 30 * 60000UL)) {
      LOG("[HR] пульс вне нормы: %d\n", hr);
      if (sendToAll("hr", 0, false)) lastHrAlert = millis();
    }
  } else badSince = 0;

  if (REMOVED_ALERT_MIN && maxOk) {
    if (!worn) {
      if (!removedSince) removedSince = now;
      if (!removedSent && now - removedSince > REMOVED_ALERT_MIN * 60000UL) {
        LOG("[HR] браслет снят\n");
        removedSent = sendToAll("removed", 0, false);
      }
    } else { removedSince = 0; removedSent = false; }
  }
}

void loop() {
  static uint32_t lastModemTry = 0, lastSmsCheck = 0, lastHealth = 0, lastStatusLog = 0;
  static bool lowBatSent = false;
  uint32_t now = millis();

  // ---- модем ----
  if (!modemOk && now - lastModemTry > 30000) {
    lastModemTry = now;
    modemOk = modemInit();
  }
  if (modemOk && now - lastHealth > 60000) {
    lastHealth = now;
    if (!at("AT", 1000) && !at("AT", 1000)) { modemOk = false; LOG("[GSM] модем пропал\n"); }
    else syncClockFromModem();
  }

  // ---- тревоги (самое важное) ----
  alarmHandle(now);
  if (alarmState == AL_COUNTDOWN) { delay(20); return; }  // пока идёт отсчёт — ничего долгого

  healthHandle(now);

  // ---- периодический статус ----
  if ((int32_t)(now - nextReportMs) >= 0) {
    if (sendToAll("status", 0, true)) {
      nextReportMs = millis() + REPORT_INTERVAL_MIN * 60000UL;
      int bat = readBatteryPercent();
      if (bat >= 0 && bat < 15 && !lowBatSent) lowBatSent = sendToAll("lowbat", 0, false);
      if (bat > 25) lowBatSent = false;
    } else {
      nextReportMs = millis() + 60000;
    }
  }

  // ---- входящие команды ----
  if (modemOk && now - lastSmsCheck > 20000) {
    lastSmsCheck = now;
    checkIncomingSms();
  }

  // ---- лог состояния ----
  if (now - lastStatusLog > 10000) {
    lastStatusLog = now;
    Location g;
    portENTER_CRITICAL(&stateMux);
    g = gpsFix;
    portEXIT_CRITICAL(&stateMux);
    LOG("[STAT] GPS=%s(%u сп.) MPU=%s MAX=%s пульс=%d SpO2=%d надет=%d MIC=%s %.0f/%.0f dBFS GSM=%s\n",
        g.valid ? "фикс" : "нет", gps.satellites.isValid() ? (unsigned)gps.satellites.value() : 0,
        mpuOk ? "ok" : "нет", maxOk ? "ok" : "нет", (int)heartRate, (int)spo2, (int)worn,
        micOk ? "ok" : "нет", (float)micLevelDb, (float)micFloorDb, modemOk ? "ok" : "нет");
  }

  uint32_t period = alarmState != AL_IDLE ? 200 : (modemOk ? 3000 : 400);
  digitalWrite(PIN_LED, (now % period) < 60 ? LOW : HIGH);

  delay(20);
}
