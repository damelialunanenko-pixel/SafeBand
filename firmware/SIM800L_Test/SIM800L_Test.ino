/*
 * SIM800L_Test — диагностика модема.
 * Сам прогоняет проверки и показывает, что не так. Потом можно вводить AT-команды
 * в Serial Monitor вручную (115200, "Both NL & CR").
 *
 * Tools -> USB CDC On Boot: Enabled. Пины как на плате: ESP RX = GPIO5, ESP TX = GPIO6.
 */
#include <Arduino.h>

#define PIN_GSM_RX 5   // ESP RX <- SIM800L TXD
#define PIN_GSM_TX 6   // ESP TX -> делитель -> SIM800L RXD
#define TEST_PHONE "+77000000000"   // <-- свой номер для тестовой SMS

HardwareSerial &gsm = Serial0;
char buf[512];

const char *cmd(const char *c, uint32_t timeout = 2000) {
  while (gsm.available()) gsm.read();
  gsm.print(c); gsm.print("\r");
  size_t n = 0; buf[0] = 0;
  uint32_t t0 = millis();
  while (millis() - t0 < timeout) {
    while (gsm.available() && n < sizeof(buf) - 1) { buf[n++] = gsm.read(); buf[n] = 0; }
    if (strstr(buf, "OK\r") || strstr(buf, "ERROR")) break;
  }
  Serial.printf(">> %s\n%s\n", c, n ? buf : "(нет ответа)");
  return buf;
}

void setup() {
  Serial.begin(115200);
  delay(2000);
  gsm.begin(9600, SERIAL_8N1, PIN_GSM_RX, PIN_GSM_TX);
  Serial.println("\n=== Проверка SIM800L ===");
  delay(3000);

  bool alive = false;
  for (int i = 0; i < 10 && !alive; i++) alive = strstr(cmd("AT", 500), "OK");
  if (!alive) {
    Serial.println("\n[!] Модем молчит: питание (+BAT, конденсатор), GND, TXD->GPIO5, RXD<-GPIO6, делитель.");
    return;
  }
  cmd("ATE0");

  int st, pct, mv = 0;
  const char *p = strstr(cmd("AT+CBC"), "+CBC:");
  if (p && sscanf(p, "+CBC: %d,%d,%d", &st, &pct, &mv) == 3) {
    Serial.printf("[i] Батарея на SIM800L: %d мВ\n", mv);
    if (mv < 3700) Serial.println("[!] Мало! SIM800L при отправке SMS просаживает и перезагружается. ЗАРЯДИТЕ аккумулятор.");
  }

  if (!strstr(cmd("AT+CPIN?"), "READY")) Serial.println("[!] SIM не готова: не вставлена / окислились контакты / стоит PIN-код.");

  p = strstr(cmd("AT+CSQ"), "+CSQ:");
  int rssi = 99, ber;
  if (p) sscanf(p, "+CSQ: %d,%d", &rssi, &ber);
  if (rssi == 99 || rssi < 8) Serial.printf("[!] Слабый сигнал (%d из 31): антенна, подойдите к окну.\n", rssi);
  else Serial.printf("[i] Сигнал %d из 31 — нормально\n", rssi);

  int mode, reg = 0;
  for (int i = 0; i < 30; i++) {
    p = strstr(cmd("AT+CREG?"), "+CREG:");
    if (p && sscanf(p, "+CREG: %d,%d", &mode, &reg) == 2 && (reg == 1 || reg == 5)) break;
    delay(2000);
  }
  if (reg == 1 || reg == 5) Serial.println("[i] В сети зарегистрирован");
  else Serial.printf("[!] Нет регистрации в сети (статус %d). 3 = оператор отклонил (SIM заблокирована / нет 2G), 2 = ищет сеть.\n", reg);

  cmd("AT+COPS?");
  cmd("AT+CMGF=1");

  if ((reg == 1 || reg == 5) && strcmp(TEST_PHONE, "+77000000000") != 0) {
    Serial.println("\n[i] Отправляю тестовую SMS...");
    while (gsm.available()) gsm.read();
    gsm.printf("AT+CMGS=\"%s\"\r", TEST_PHONE);
    delay(1000);
    gsm.print("SafeBand test");
    gsm.write(26);
    cmd("", 60000);
    if (strstr(buf, "+CMGS")) Serial.println("[OK] SMS ушла!");
    else Serial.println("[!] SMS не ушла. +CMS ERROR — проблема у оператора/баланс; тишина/RDY — модем перезагрузился от просадки питания.");
  } else {
    Serial.println("\n[i] Чтобы проверить отправку, впишите свой номер в TEST_PHONE.");
  }
  Serial.println("\nДальше можно вводить AT-команды вручную.");
}

void loop() {
  while (Serial.available()) gsm.write(Serial.read());
  while (gsm.available()) Serial.write(gsm.read());
}
