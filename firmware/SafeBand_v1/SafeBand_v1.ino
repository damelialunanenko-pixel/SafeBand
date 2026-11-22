/*
 * SafeBand v1 — прошивка для текущей схемы
 *   ESP32-C3 Super Mini + SIM800L (GSM/SMS) + NEO-6M (GPS) + MPU6050 (падение)
 *
 * Что делает:
 *   1. GPS работает постоянно, прошивка хранит последний фикс.
 *   2. Каждые REPORT_INTERVAL_MIN минут отправляет SMS "type: status"
 *      с координатами, батареей и временем.
 *        - есть свежий GPS-фикс          -> src: GPS
 *        - нет GPS (помещение)           -> SIM800L GSM-позиционирование (AT+CIPGSMLOC) -> src: GSM
 *        - GSM-позиционирование не вышло  -> последнее известное место -> src: LAST (+ age: минут)
 *        - если не GPS, дополнительно шлётся вышка "cell: MCC,MNC,LAC,CID" — по ней приложение
 *          может само найти место через OpenCellID / Google Geolocation.
 *   3. MPU6050 следит за падением (свободное падение -> удар -> неподвижность).
 *      При падении сразу шлёт SMS "type: fall" со временем падения и координатами.
 *   4. Принимает SMS-команды с номеров из PHONES: LOC, INT <минуты>.
 *
 * Arduino IDE:
 *   - Плата: "ESP32C3 Dev Module" (или "Nologo ESP32C3 Super Mini")
 *   - Ядро esp32 by Espressif версии 3.x  (Boards Manager)
 *   - Tools -> USB CDC On Boot: "Enabled"   (иначе не будет логов в Serial Monitor)
 *   - Библиотеки: TinyGPSPlus (Mikal Hart)
 *   - Serial Monitor: 115200
 */

#include <Arduino.h>
#include <Wire.h>
#include <TinyGPSPlus.h>
#include <time.h>
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
#define FW_VERSION "1.0.0"

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
#define PIN_SDA     0    // MPU6050 SDA
#define PIN_SCL     1    // MPU6050 SCL
#define PIN_GPS_RX  7    // ESP RX  <- GPS TX
#define PIN_GSM_RX  5    // ESP RX  <- SIM800L TXD
#define PIN_GSM_TX  6    // ESP TX  -> делитель 10k/20k -> SIM800L RXD
#define PIN_LED     8    // синий LED на плате (горит при LOW)

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
//            ЗАДАЧА ДАТЧИКОВ (работает даже пока модем шлёт SMS)
// ============================================================================
void sensorTask(void *) {
  uint32_t lastMpuRetry = 0, lastClockSync = 0;
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

static void handleCommand(const char *from, char *text) {
  for (char *p = text; *p; p++) *p = toupper(*p);
  LOG("[CMD] от %s: %s\n", from, text);
  if (!phoneAllowed(from)) { LOG("[CMD] номер не в списке — игнор\n"); return; }
  if (strstr(text, "LOC") || strstr(text, "WHERE") || strstr(text, "STATUS")) {
    sendToAll("status", 0, true, from);
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
  LOG("\n=== SafeBand v1 %s (%s) ===\n", FW_VERSION, DEVICE_ID);

  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_LED, LOW);

  Wire.begin(PIN_SDA, PIN_SCL, 400000);
  mpuOk = mpuInit();

  gpsUart.setRxBufferSize(1024);
  gpsUart.begin(9600, SERIAL_8N1, PIN_GPS_RX, -1);

  gsm.setRxBufferSize(1024);
  gsm.begin(9600, SERIAL_8N1, PIN_GSM_RX, PIN_GSM_TX);

  xTaskCreate(sensorTask, "sensors", 4096, nullptr, 3, nullptr);

  delay(3000);  // SIM800L стартует несколько секунд
  modemOk = modemInit();
  if (modemOk && SEND_BOOT_SMS) sendToAll("on", 0, false);
  nextReportMs = millis() + 60000;  // первый статус через минуту (GPS успеет поймать спутники)
  digitalWrite(PIN_LED, HIGH);
}

void loop() {
  static uint32_t lastModemTry = 0, lastSmsCheck = 0, lastHealth = 0, lastStatusLog = 0;
  static bool fallPending = false;
  static time_t pendingFallEpoch = 0;
  static uint32_t lastFallTry = 0;
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

  // ---- падение: SMS сразу ----
  if (fallEvent) {
    fallEvent = false;
    fallPending = true;
    pendingFallEpoch = fallEpoch;
    lastFallTry = 0;
    LOG("!!! ПАДЕНИЕ !!!\n");
  }
  if (fallPending && (lastFallTry == 0 || now - lastFallTry > 30000)) {
    lastFallTry = now;
    if (sendToAll("fall", pendingFallEpoch, false)) fallPending = false;  // иначе повтор через 30 с
  }

  // ---- периодический статус ----
  if ((int32_t)(now - nextReportMs) >= 0) {
    if (sendToAll("status", 0, true)) {
      nextReportMs = millis() + REPORT_INTERVAL_MIN * 60000UL;
      int bat = readBatteryPercent();
      if (bat >= 0 && bat < 15 && !lowBatSent) lowBatSent = sendToAll("lowbat", 0, false);
      if (bat > 25) lowBatSent = false;
    } else {
      nextReportMs = millis() + 60000;  // нет сети — попробовать через минуту
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
    LOG("[STAT] GPS: спутников=%u фикс=%s  MPU=%s  GSM=%s  след.SMS через %ld с\n",
        gps.satellites.isValid() ? (unsigned)gps.satellites.value() : 0,
        g.valid ? "да" : "нет", mpuOk ? "ok" : "нет", modemOk ? "ok" : "нет",
        (long)((int32_t)(nextReportMs - now) / 1000));
  }

  // ---- LED: редкая вспышка = всё ок, частое мигание = нет GSM ----
  uint32_t period = modemOk ? 3000 : 400;
  digitalWrite(PIN_LED, (now % period) < 60 ? LOW : HIGH);

  delay(20);
}
