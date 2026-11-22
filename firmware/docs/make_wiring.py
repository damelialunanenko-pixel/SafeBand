#!/usr/bin/env python3
"""Генерирует схему подключения SafeBand v2: wiring_v2.svg (рядом с этим файлом)."""
from pathlib import Path

W, H = 1700, 1980
out = []
add = out.append

C = {
    "sda": "#1565c0", "scl": "#00897b", "sck": "#8e24aa", "ws": "#d81b60", "sd": "#ef6c00",
    "tx": "#2e7d32", "rx": "#6d4c41", "gps": "#5d4037", "vib": "#0277bd", "buz": "#c62828",
    "btn": "#455a64", "3v3": "#f57c00", "5v": "#d32f2f", "vbat": "#6a1b9a", "gnd": "#212121",
}
FONT = "DejaVu Sans, Arial, sans-serif"


def text(x, y, s, size=15, color="#222", weight="normal", anchor="start", italic=False):
    st = ' font-style="italic"' if italic else ""
    add(f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="{size}" fill="{color}" '
        f'font-weight="{weight}" text-anchor="{anchor}"{st}>{s}</text>')


def box(x, y, w, h, fill, title, sub=None, stroke="#37474f"):
    add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{fill}" stroke="{stroke}" stroke-width="2"/>')
    text(x + w / 2, y + 28, title, 19, "#111", "bold", "middle")
    if sub:
        for i, line in enumerate(sub if isinstance(sub, list) else [sub]):
            text(x + w / 2, y + 48 + i * 17, line, 12.5, "#555", anchor="middle")


def wire(points, color, width=3):
    d = " ".join(f"{x},{y}" for x, y in points)
    add(f'<polyline points="{d}" fill="none" stroke="{color}" stroke-width="{width}" '
        f'stroke-linejoin="round" stroke-linecap="round"/>')


def dot(x, y, color):
    add(f'<circle cx="{x}" cy="{y}" r="6" fill="{color}"/>')


def pin(x, y, color="#37474f"):
    add(f'<circle cx="{x}" cy="{y}" r="5" fill="#fff" stroke="{color}" stroke-width="2.5"/>')


def badge(x, y, label, color, anchor="middle"):
    w = 10 + 9.5 * len(label)
    bx = x - w / 2 if anchor == "middle" else (x - w if anchor == "end" else x)
    add(f'<rect x="{bx}" y="{y - 13}" width="{w}" height="26" rx="13" fill="{color}"/>')
    text(bx + w / 2, y + 5, label, 14, "#fff", "bold", "middle")


def resistor_h(x, y, w, label, color="#333"):
    add(f'<rect x="{x}" y="{y - 9}" width="{w}" height="18" fill="#fff" stroke="{color}" stroke-width="2.5"/>')
    text(x + w / 2, y - 15, label, 13, "#333", "bold", "middle")


def resistor_v(x, y, h, label):
    add(f'<rect x="{x - 9}" y="{y}" width="18" height="{h}" fill="#fff" stroke="#333" stroke-width="2.5"/>')
    text(x + 16, y + h / 2 + 5, label, 13, "#333", "bold")


# ----------------------------------------------------------------------------
add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
add(f'<rect width="{W}" height="{H}" fill="#ffffff"/>')
text(40, 52, "SafeBand — финальная версия браслета", 34, "#0d47a1", "bold")
text(40, 82, "ESP32-C3 Super Mini · SIM800L · NEO-6M · MPU6050 · MAX30102 · INMP441 · вибро · буззер · кнопка SOS",
     16, "#546e7a")

# легенда питания
lx = 1080
add(f'<rect x="{lx}" y="24" width="590" height="104" rx="10" fill="#f5f7fa" stroke="#cfd8dc"/>')
text(lx + 14, 48, "Цветные метки = одна и та же линия питания (соединить вместе):", 14, "#333", "bold")
badge(lx + 40, 74, "3V3", C["3v3"]); text(lx + 70, 79, "пин 3.3 платы ESP32", 13.5)
badge(lx + 40, 104, "5V", C["5v"]); text(lx + 70, 109, "выход MT3608 = 5.0 В", 13.5)
badge(lx + 300, 74, "+BAT", C["vbat"]); text(lx + 335, 79, "батарея после выключателя", 13.5)
badge(lx + 300, 104, "GND", C["gnd"]); text(lx + 335, 109, "общая земля — всё вместе", 13.5)

# ----------------------------- ESP32 ----------------------------------------
EX, EY, EW, EH = 700, 140, 300, 585
add(f'<rect x="{EX}" y="{EY}" width="{EW}" height="{EH}" rx="16" fill="#263238" stroke="#000" stroke-width="2"/>')
text(EX + EW / 2, EY + 42, "ESP32-C3", 28, "#fff", "bold", "middle")
text(EX + EW / 2, EY + 66, "Super Mini", 16, "#b0bec5", anchor="middle")
add(f'<rect x="{EX + 110}" y="{EY + 230}" width="80" height="80" rx="6" fill="#111" stroke="#455a64"/>')
text(EX + EW / 2, EY + 276, "C3", 18, "#90a4ae", "bold", "middle")
add(f'<rect x="{EX + 105}" y="{EY + EH - 8}" width="90" height="34" rx="6" fill="#b0bec5" stroke="#546e7a"/>')
text(EX + EW / 2, EY + EH + 15, "USB-C", 14, "#263238", "bold", "middle")

rows = [230, 292, 354, 416, 478, 540, 602, 664]
left_pins = ["GPIO0", "GPIO1", "GPIO2", "GPIO3", "GPIO4", "3.3", "G", "5V"]
right_pins = ["GPIO6", "GPIO5", "GPIO7", "GPIO21", "GPIO20", "GPIO10", "GPIO8", "GPIO9"]
for y, n in zip(rows, left_pins):
    pin(EX, y, "#ffca28"); text(EX + 16, y + 5, n, 16, "#fff", "bold")
for y, n in zip(rows, right_pins):
    pin(EX + EW, y, "#ffca28"); text(EX + EW - 16, y + 5, n, 16, "#fff", "bold", "end")

# питание самой ESP
wire([(EX, 540), (EX - 40, 540)], C["3v3"]); badge(EX - 80, 540, "3V3", C["3v3"])
wire([(EX, 602), (EX - 40, 602)], C["gnd"]); badge(EX - 80, 602, "GND", C["gnd"])
wire([(EX, 664), (EX - 40, 664)], C["5v"]); badge(EX - 76, 664, "5V", C["5v"])

# ----------------------------- ЛЕВАЯ СТОРОНА ---------------------------------
MX, MW = 70, 330
# MPU6050
box(MX, 140, MW, 180, "#e8eaf6", "MPU6050 (GY-521)", ["акселерометр, I2C 0x68",
                                                      "XDA/XCL/AD0/INT — не нужны"])
for y, n, b, c in [(268, "VCC", "3V3", "3v3"), (300, "GND", "GND", "gnd")]:
    pin(MX, y); text(MX + 14, y + 5, n, 14, "#222", "bold"); wire([(MX, y), (MX - 22, y)], C[c]); badge(MX - 22, y, b, C[c], "end")
for y, n in [(230, "SDA"), (292, "SCL")]:
    pin(MX + MW, y); text(MX + MW - 14, y + 5, n, 14, "#222", "bold", "end")
wire([(MX + MW, 230), (EX, 230)], C["sda"]); wire([(MX + MW, 292), (EX, 292)], C["scl"])

# MAX30102
box(MX, 345, MW, 150, "#fce4ec", "MAX30102", ["пульс + SpO2, I2C 0x57",
                                             "окошком К КОЖЕ"])
for y, n, b, c in [(440, "VIN", "3V3", "3v3"), (472, "GND", "GND", "gnd")]:
    pin(MX, y); text(MX + 14, y + 5, n, 14, "#222", "bold"); wire([(MX, y), (MX - 22, y)], C[c]); badge(MX - 22, y, b, C[c], "end")
for y, n in [(430, "SDA"), (470, "SCL")]:
    pin(MX + MW, y); text(MX + MW - 14, y + 5, n, 14, "#222", "bold", "end")
wire([(MX + MW, 430), (425, 430), (425, 230)], C["sda"]); dot(425, 230, C["sda"])
wire([(MX + MW, 470), (445, 470), (445, 292)], C["scl"]); dot(445, 292, C["scl"])
text(560, 222, "SDA", 13, C["sda"], "bold"); text(560, 284, "SCL", 13, C["scl"], "bold")
text(455, 335, "общая шина I2C", 12.5, "#555", italic=True)

# INMP441
box(MX, 520, MW, 205, "#f3e5f5", "INMP441", ["I2S-микрофон",
                                            "дырочкой к отверстию в корпусе"])
for y, n, b, c in [(628, "VDD", "3V3", "3v3"), (664, "GND", "GND", "gnd"), (700, "L/R", "GND", "gnd")]:
    pin(MX, y); text(MX + 14, y + 5, n, 14, "#222", "bold"); wire([(MX, y), (MX - 22, y)], C[c]); badge(MX - 22, y, b, C[c], "end")
for y, n in [(600, "SCK"), (645, "WS"), (690, "SD")]:
    pin(MX + MW, y); text(MX + MW - 14, y + 5, n, 14, "#222", "bold", "end")
wire([(MX + MW, 600), (475, 600), (475, 354), (EX, 354)], C["sck"])
wire([(MX + MW, 645), (500, 645), (500, 416), (EX, 416)], C["ws"])
wire([(MX + MW, 690), (525, 690), (525, 478), (EX, 478)], C["sd"])
text(600, 346, "SCK", 13, C["sck"], "bold"); text(600, 408, "WS", 13, C["ws"], "bold")
text(600, 470, "SD", 13, C["sd"], "bold")
text(MX, 745, "L/R на GND = левый канал", 12.5, "#6a1b9a", italic=True)

# ----------------------------- ПРАВАЯ СТОРОНА --------------------------------
RX_, RW = 1250, 330
# SIM800L
box(RX_, 165, RW, 160, "#e8f5e9", "SIM800L", ["GSM 2G · 3.4–4.4 В!",
                                             "RST/NET/DTR/RING не нужны"])
pin(RX_, 230); text(RX_ + 14, 235, "RXD", 14, "#222", "bold")
pin(RX_, 292); text(RX_ + 14, 297, "TXD", 14, "#222", "bold")
wire([(EX + EW, 230), (1060, 230)], C["tx"]); resistor_h(1060, 230, 60, "10 кОм")
wire([(1120, 230), (RX_, 230)], C["tx"]); dot(1170, 230, C["tx"])
wire([(1170, 230), (1170, 245)], "#333"); resistor_v(1170, 245, 50, "20 кОм")
wire([(1170, 295), (1170, 312)], C["gnd"]); badge(1170, 322, "GND", C["gnd"])
text(1100, 258, "делитель 3.3→2.2 В", 11.5, "#2e7d32", italic=True, anchor="middle")
wire([(EX + EW, 292), (1110, 292), (1110, 300), (1145, 300), (1145, 292), (RX_, 292)], C["rx"])
text(1018, 222, "TX →", 13, C["tx"], "bold"); text(1018, 284, "← RX", 13, C["rx"], "bold")
# питание SIM800L + конденсатор
pin(RX_ + RW, 235); text(RX_ + RW - 14, 240, "VCC", 14, "#222", "bold", "end")
pin(RX_ + RW, 300); text(RX_ + RW - 14, 305, "GND", 14, "#222", "bold", "end")
wire([(RX_ + RW, 235), (RX_ + RW + 40, 235), (RX_ + RW + 40, 200)], C["vbat"]); badge(RX_ + RW + 40, 188, "+BAT", C["vbat"])
wire([(RX_ + RW, 300), (RX_ + RW + 40, 300)], C["gnd"])
cx = RX_ + RW + 40
add(f'<line x1="{cx - 16}" y1="258" x2="{cx + 16}" y2="258" stroke="#333" stroke-width="3"/>')
add(f'<path d="M {cx - 16} 272 Q {cx} 262 {cx + 16} 272" fill="none" stroke="#333" stroke-width="3"/>')
wire([(cx, 235), (cx, 258)], C["vbat"]); wire([(cx, 268), (cx, 300)], C["gnd"])
text(cx - 22, 256, "+", 16, "#333", "bold", "end")
dot(cx, 235, C["vbat"]); dot(cx, 300, C["gnd"])
badge(cx, 330, "GND", C["gnd"]); wire([(cx, 300), (cx, 317)], C["gnd"])
text(RX_ + RW - 4, 350, "1000 мкФ 16 В — вплотную к пинам", 12.5, "#333", "bold", "end")

# GPS
box(RX_, 375, RW, 115, "#fff3e0", "GPS NEO-6M", ["антенной ВВЕРХ, 9600 бод"])
pin(RX_, 354 + 70); text(RX_ + 14, 429, "TX", 14, "#222", "bold")
pin(RX_, 465); text(RX_ + 14, 470, "RX — не подключать", 13, "#999", "bold")
wire([(EX + EW, 354), (1205, 354), (1205, 424), (RX_, 424)], C["gps"])
text(1018, 346, "← GPS TX", 13, C["gps"], "bold")
pin(RX_ + RW, 420); text(RX_ + RW - 14, 425, "VCC", 14, "#222", "bold", "end")
pin(RX_ + RW, 458); text(RX_ + RW - 14, 463, "GND", 14, "#222", "bold", "end")
wire([(RX_ + RW, 420), (RX_ + RW + 22, 420)], C["3v3"]); badge(RX_ + RW + 22, 420, "3V3", C["3v3"], "start")
wire([(RX_ + RW, 458), (RX_ + RW + 22, 458)], C["gnd"]); badge(RX_ + RW + 22, 458, "GND", C["gnd"], "start")

# Вибромотор (ключ)
VY = 515
add(f'<rect x="{RX_ - 70}" y="{VY}" width="{RW + 150}" height="190" rx="12" fill="#e1f5fe" stroke="#37474f" stroke-width="2"/>')
text(RX_ - 55, VY + 26, "Вибромотор через NPN-ключ", 18, "#111", "bold")
wire([(EX + EW, 416), (1140, 416), (1140, VY + 110), (RX_ - 40, VY + 110)], C["vib"])
text(1018, 408, "VIBRO →", 13, C["vib"], "bold")
resistor_h(RX_ - 40, VY + 110, 60, "1 кОм", C["vib"])
tx, ty = RX_ + 70, VY + 110   # база транзистора
wire([(RX_ + 20, ty), (tx, ty)], C["vib"])
add(f'<circle cx="{tx + 22}" cy="{ty}" r="30" fill="#fff" stroke="#333" stroke-width="2.5"/>')
add(f'<line x1="{tx}" y1="{ty - 18}" x2="{tx}" y2="{ty + 18}" stroke="#333" stroke-width="4"/>')
add(f'<line x1="{tx}" y1="{ty - 8}" x2="{tx + 30}" y2="{ty - 26}" stroke="#333" stroke-width="2.5"/>')
add(f'<line x1="{tx}" y1="{ty + 8}" x2="{tx + 30}" y2="{ty + 26}" stroke="#333" stroke-width="2.5"/>')
add(f'<polygon points="{tx + 30},{ty + 26} {tx + 18},{ty + 24} {tx + 24},{ty + 15}" fill="#333"/>')
text(tx - 14, ty - 8, "Б", 12, "#333", "bold", "end")
text(tx + 36, ty - 30, "К", 12, "#333", "bold"); text(tx + 36, ty + 40, "Э", 12, "#333", "bold")
text(tx - 12, ty + 52, "S8050 / 2N2222", 12.5, "#333", "bold", "end")
wire([(tx + 30, ty + 26), (tx + 30, ty + 48)], C["gnd"]); badge(tx + 62, ty + 50, "GND", C["gnd"])
wire([(tx + 30, ty + 50), (tx + 40, ty + 50)], C["gnd"])
# коллектор -> мотор
mx, my = RX_ + 230, VY + 75
wire([(tx + 30, ty - 26), (tx + 30, my), (mx - 26, my)], "#0277bd")
add(f'<circle cx="{mx}" cy="{my}" r="24" fill="#cfd8dc" stroke="#333" stroke-width="2.5"/>')
text(mx, my + 7, "M", 20, "#333", "bold", "middle")
text(mx - 32, my - 8, "−", 16, "#333", "bold", "end"); text(mx + 32, my - 8, "+", 16, "#333", "bold")
wire([(mx + 24, my), (mx + 60, my), (mx + 60, VY + 40)], C["3v3"])
badge(mx + 60, VY + 30, "3V3", C["3v3"])
# диод параллельно мотору
dx = mx
wire([(tx + 30, my), (tx + 30, my + 40), (dx - 14, my + 40)], "#0277bd")
add(f'<polygon points="{dx - 14},{my + 30} {dx - 14},{my + 50} {dx + 8},{my + 40}" fill="#333"/>')
add(f'<line x1="{dx + 9}" y1="{my + 29}" x2="{dx + 9}" y2="{my + 51}" stroke="#333" stroke-width="3.5"/>')
wire([(dx + 9, my + 40), (mx + 60, my + 40), (mx + 60, my)], C["3v3"]); dot(mx + 60, my, C["3v3"])
text(dx, my + 66, "диод 1N4148: полоска к +3V3", 12, "#333", anchor="middle")
dot(tx + 30, my, "#0277bd")

# Буззер
BY = 725
box(RX_, BY, RW, 70, "#ffebee", "Буззер")
pin(RX_, BY + 45); text(RX_ + 14, BY + 50, "+", 16, "#222", "bold")
pin(RX_ + RW, BY + 45); text(RX_ + RW - 14, BY + 50, "−", 16, "#222", "bold", "end")
wire([(EX + EW, 478), (1110, 478), (1110, BY + 45), (RX_, BY + 45)], C["buz"])
text(1018, 470, "BUZZER →", 13, C["buz"], "bold")
wire([(RX_ + RW, BY + 45), (RX_ + RW + 22, BY + 45)], C["gnd"]); badge(RX_ + RW + 22, BY + 45, "GND", C["gnd"], "start")

# Кнопка SOS
KY = 815
add(f'<rect x="{RX_}" y="{KY}" width="{RW}" height="70" rx="12" fill="#eceff1" stroke="#37474f" stroke-width="2"/>')
text(RX_ + RW / 2, KY + 24, "Кнопка SOS (без фиксации)", 16, "#111", "bold", "middle")
wire([(EX + EW, 540), (1080, 540), (1080, KY + 50), (RX_ + 90, KY + 50)], C["btn"])
text(1018, 532, "КНОПКА →", 13, C["btn"], "bold")
pin(RX_ + 90, KY + 50)
add(f'<line x1="{RX_ + 95}" y1="{KY + 50}" x2="{RX_ + 160}" y2="{KY + 36}" stroke="#333" stroke-width="3"/>')
add(f'<line x1="{RX_ + 120}" y1="{KY + 32}" x2="{RX_ + 150}" y2="{KY + 32}" stroke="#333" stroke-width="3"/>')
pin(RX_ + 165, KY + 50)
wire([(RX_ + 170, KY + 50), (RX_ + RW + 22, KY + 50)], C["gnd"]); badge(RX_ + RW + 22, KY + 50, "GND", C["gnd"], "start")

# занятые пины
text(EX + EW - 16, 622, "LED — не занимать", 11.5, "#90a4ae", anchor="end", italic=True)
text(EX + EW - 16, 684, "BOOT — не занимать", 11.5, "#90a4ae", anchor="end", italic=True)

# ----------------------------- ПИТАНИЕ ---------------------------------------
PY = 920
add(f'<rect x="30" y="{PY}" width="1640" height="250" rx="14" fill="#fafafa" stroke="#9e9e9e" '
    f'stroke-dasharray="8 6" stroke-width="2"/>')
text(55, PY + 34, "ПИТАНИЕ", 22, "#6a1b9a", "bold")

box(70, PY + 55, 220, 145, "#fffde7", "Li-Po 3.7 В", ["1000 мАч (902040)"])
pin(290, PY + 130); text(276, PY + 135, "+", 16, "#222", "bold", "end")
pin(290, PY + 175); text(276, PY + 180, "−", 16, "#222", "bold", "end")

box(400, PY + 50, 260, 150, "#e3f2fd", "TP4056", ["зарядка + защита"])
for y, n in [(PY + 130, "B+"), (PY + 175, "B−")]:
    pin(400, y); text(414, y + 5, n, 14, "#222", "bold")
for y, n in [(PY + 130, "OUT+"), (PY + 185, "OUT−")]:
    pin(660, y); text(646, y + 5, n, 14, "#222", "bold", "end")
wire([(290, PY + 130), (400, PY + 130)], C["vbat"]); wire([(290, PY + 175), (400, PY + 175)], C["gnd"])
wire([(660, PY + 185), (700, PY + 185)], C["gnd"]); badge(700, PY + 185, "GND", C["gnd"], "start")

# выключатель
wire([(660, PY + 130), (760, PY + 130)], C["vbat"])
pin(765, PY + 130)
add(f'<line x1="{770}" y1="{PY + 130}" x2="{830}" y2="{PY + 106}" stroke="#333" stroke-width="3.5"/>')
pin(840, PY + 130)
text(800, PY + 96, "выключатель", 13, "#333", "bold", "middle")
wire([(845, PY + 130), (1050, PY + 130)], C["vbat"]); dot(930, PY + 130, C["vbat"])
wire([(930, PY + 130), (930, PY + 165)], C["vbat"]); badge(930, PY + 178, "+BAT", C["vbat"])
text(930, PY + 215, "→ SIM800L VCC (+1000 мкФ)", 13, C["vbat"], "bold", "middle")

box(1050, PY + 50, 260, 150, "#ffebee", "MT3608", ["повышающий", "выставить 5.0 В!"])
for y, n in [(PY + 130, "VIN+"), (PY + 185, "VIN−")]:
    pin(1050, y); text(1064, y + 5, n, 14, "#222", "bold")
for y, n in [(PY + 130, "VOUT+"), (PY + 185, "VOUT−")]:
    pin(1310, y); text(1296, y + 5, n, 14, "#222", "bold", "end")
wire([(1050, PY + 185), (1020, PY + 185)], C["gnd"]); badge(1020, PY + 185, "GND", C["gnd"], "end")
wire([(1310, PY + 185), (1340, PY + 185)], C["gnd"]); badge(1340, PY + 185, "GND", C["gnd"], "start")
wire([(1310, PY + 130), (1420, PY + 130)], C["5v"]); badge(1430, PY + 130, "5V", C["5v"], "start")
text(1480, PY + 135, "→ пин 5V ESP32", 14, C["5v"], "bold")

text(530, PY + 222, "USB-C на TP4056 = зарядка браслета", 13, "#555", anchor="middle", italic=True)

# ----------------------------- ТАБЛИЦА ---------------------------------------
TY = 1205
text(40, TY + 10, "Таблица пайки — провод за проводом", 22, "#0d47a1", "bold")
rows_l = [
    ("MPU6050", "VCC", "3V3 (пин 3.3 ESP32)", "3v3"),
    ("MPU6050", "GND", "GND", "gnd"),
    ("MPU6050", "SDA", "GPIO0", "sda"),
    ("MPU6050", "SCL", "GPIO1", "scl"),
    ("MAX30102", "VIN", "3V3", "3v3"),
    ("MAX30102", "GND", "GND", "gnd"),
    ("MAX30102", "SDA", "GPIO0 (вместе с MPU)", "sda"),
    ("MAX30102", "SCL", "GPIO1 (вместе с MPU)", "scl"),
    ("INMP441", "VDD", "3V3", "3v3"),
    ("INMP441", "GND", "GND", "gnd"),
    ("INMP441", "L/R", "GND", "gnd"),
    ("INMP441", "SCK", "GPIO2", "sck"),
    ("INMP441", "WS", "GPIO3", "ws"),
    ("INMP441", "SD", "GPIO4", "sd"),
    ("GPS NEO-6M", "VCC / GND", "3V3 / GND", "3v3"),
    ("GPS NEO-6M", "TX", "GPIO7   (RX — не подключать)", "gps"),
]
rows_r = [
    ("SIM800L", "VCC", "+BAT + конденсатор 1000 мкФ", "vbat"),
    ("SIM800L", "GND", "GND (короткий толстый провод)", "gnd"),
    ("SIM800L", "RXD", "GPIO6 через 10 кОм; 20 кОм на GND", "tx"),
    ("SIM800L", "TXD", "GPIO5 напрямую", "rx"),
    ("Вибро", "GPIO21", "1 кОм → база NPN", "vib"),
    ("Вибро", "NPN эмиттер / коллектор", "GND / мотор −", "vib"),
    ("Вибро", "мотор + , диод", "3V3; диод 1N4148 полоской к 3V3", "3v3"),
    ("Буззер", "+ / −", "GPIO20 / GND", "buz"),
    ("Кнопка SOS", "диагональные ножки", "GPIO10 и GND", "btn"),
    ("Li-Po", "+ / −", "TP4056 B+ / B−", "vbat"),
    ("TP4056", "OUT+ / OUT−", "выключатель → +BAT / GND", "vbat"),
    ("MT3608", "VIN+ / VOUT+", "+BAT / 5V ESP32 (выставить 5.0 В)", "5v"),
    ("Конденсатор", "1000 мкФ 16 В", "+ к VCC SIM800L, полоска (−) к GND", "vbat"),
    ("Все GND", "—", "верхняя и нижняя шины — перемычкой", "gnd"),
    ("ESP32", "GPIO8, GPIO9", "НЕ занимать", "btn"),
    ("ESP32", "USB-C", "прошивка при ВЫКЛ. выключателе", "btn"),
]


def table(x, y, rows):
    cw = [150, 200, 430]
    add(f'<rect x="{x}" y="{y}" width="{sum(cw)}" height="30" fill="#263238"/>')
    for i, h in enumerate(["Модуль", "Вывод", "Куда паять"]):
        text(x + sum(cw[:i]) + 12, y + 21, h, 14, "#fff", "bold")
    for r, (m, p, to, c) in enumerate(rows):
        yy = y + 30 + r * 30
        add(f'<rect x="{x}" y="{yy}" width="{sum(cw)}" height="30" fill="{"#f5f7fa" if r % 2 else "#fff"}"/>')
        add(f'<rect x="{x}" y="{yy}" width="6" height="30" fill="{C[c]}"/>')
        text(x + 14, yy + 20, m, 14, "#222", "bold")
        text(x + cw[0] + 12, yy + 20, p, 14, "#333")
        text(x + cw[0] + cw[1] + 12, yy + 20, to, 14, C[c] if c not in ("gnd", "btn") else "#222", "bold")
    add(f'<rect x="{x}" y="{y}" width="{sum(cw)}" height="{30 + 30 * len(rows)}" fill="none" stroke="#cfd8dc"/>')


table(40, TY + 30, rows_l)
table(870, TY + 30, rows_r)

NY = TY + 560
add(f'<rect x="40" y="{NY}" width="1620" height="190" rx="10" fill="#fff8e1" stroke="#ffb300" stroke-width="2"/>')
text(60, NY + 30, "Перед первым включением", 18, "#e65100", "bold")
notes = [
    "1. MT3608: сначала подключите только к батарее, мультиметром выставьте 5.0 В — и лишь потом к ESP32 (с завода бывает 10–28 В).",
    "2. SIM800L питать ТОЛЬКО от +BAT (3.7–4.2 В) + конденсатор 1000 мкФ у самых пинов (полоска «−» на GND). От 3.3 В — нельзя.",
    "3. Прошивать ESP32 по USB при ВЫКЛЮЧЕННОМ выключателе, чтобы 5 В от USB и от MT3608 не встретились.",
    "4. MAX30102 — окошком к коже, MPU6050 — жёстко к плате, подальше от вибромотора. Громкий буззер (> 20 мА) — через NPN-ключ.",
    "5. Микрофон молчит (около −120 dBFS в логе): проверьте L/R на GND или поменяйте MIC_SLOT на I2S_STD_SLOT_RIGHT.",
]
for i, n in enumerate(notes):
    text(60, NY + 60 + i * 26, n, 14, "#333")

add("</svg>")
Path(__file__).with_name("wiring_v2.svg").write_text("\n".join(out), encoding="utf-8")
print("ok")
