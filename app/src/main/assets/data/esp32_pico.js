/* ESP32 (Arduino core 3.x) και Raspberry Pi Pico (MicroPython) */
(function () {
const R = String.raw;
const ESP = [
{ cat: "Βασικά", t: "Blink (ενσωματωμένο LED GPIO2)", lvl: 1, hw: "ESP32 DevKit",
  d: "Στις περισσότερες πλακέτες ESP32 DevKit το μπλε LED είναι στο GPIO 2.",
  code: R`const int LED = 2;

void setup() {
  pinMode(LED, OUTPUT);
}

void loop() {
  digitalWrite(LED, HIGH);
  delay(500);
  digitalWrite(LED, LOW);
  delay(500);
}` },
{ cat: "Βασικά", t: "Touch pin: κουμπί αφής", lvl: 1, hw: "ESP32 (καλώδιο στο GPIO 4 / T0)",
  d: "Το ESP32 έχει pins αφής: αγγίζεις το καλώδιο και ανάβει το LED. Μικρότερη τιμή = άγγιγμα (στο κλασικό ESP32).",
  code: R`const int LED = 2;

void setup() {
  Serial.begin(115200);
  pinMode(LED, OUTPUT);
}

void loop() {
  int v = touchRead(T0);    // GPIO 4
  Serial.println(v);
  digitalWrite(LED, v < 30 ? HIGH : LOW);
  delay(100);
}` },
{ cat: "Wi-Fi", t: "Σύνδεση σε Wi-Fi", lvl: 1, hw: "ESP32",
  d: "Συνδέεται στο δίκτυο και τυπώνει τη διεύθυνση IP στο Serial Monitor (115200).",
  code: R`#include <WiFi.h>

const char* SSID = "ΤΟ_WIFI_ΣΟΥ";
const char* PASS = "ΚΩΔΙΚΟΣ";

void setup() {
  Serial.begin(115200);
  WiFi.begin(SSID, PASS);
  Serial.print("Σύνδεση");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {}` },
{ cat: "Wi-Fi", t: "Web server: LED on/off από το κινητό", lvl: 2, hw: "ESP32",
  d: "Ανοίγεις την IP του ESP32 στον browser και ανάβεις/σβήνεις το LED με κουμπιά.",
  code: R`#include <WiFi.h>
#include <WebServer.h>

const char* SSID = "ΤΟ_WIFI_ΣΟΥ";
const char* PASS = "ΚΩΔΙΚΟΣ";
const int LED = 2;
WebServer server(80);

String page() {
  String s = "<!doctype html><meta name=viewport content='width=device-width'>";
  s += "<h1>ESP32 LED</h1><p>LED: ";
  s += digitalRead(LED) ? "ON" : "OFF";
  s += "</p><a href='/on'><button>ON</button></a> <a href='/off'><button>OFF</button></a>";
  return s;
}

void setup() {
  Serial.begin(115200);
  pinMode(LED, OUTPUT);
  WiFi.begin(SSID, PASS);
  while (WiFi.status() != WL_CONNECTED) delay(300);
  Serial.println(WiFi.localIP());

  server.on("/", []() { server.send(200, "text/html", page()); });
  server.on("/on", []() { digitalWrite(LED, HIGH); server.send(200, "text/html", page()); });
  server.on("/off", []() { digitalWrite(LED, LOW); server.send(200, "text/html", page()); });
  server.begin();
}

void loop() {
  server.handleClient();
}` },
{ cat: "Wi-Fi", t: "Μετεωρολογικός σταθμός στον browser", lvl: 2, hw: "ESP32 + DHT11 στο GPIO 4",
  d: "Ιστοσελίδα που δείχνει θερμοκρασία και υγρασία και ανανεώνεται αυτόματα κάθε 5 δευτ.",
  code: R`#include <WiFi.h>
#include <WebServer.h>
#include <DHT.h>

const char* SSID = "ΤΟ_WIFI_ΣΟΥ";
const char* PASS = "ΚΩΔΙΚΟΣ";
DHT dht(4, DHT11);
WebServer server(80);

void handleRoot() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  String s = "<!doctype html><meta http-equiv='refresh' content='5'>";
  s += "<meta name=viewport content='width=device-width'><h1>Καιρός</h1>";
  s += "<h2>" + String(t, 1) + " &deg;C</h2>";
  s += "<h2>" + String(h, 0) + " %</h2>";
  server.send(200, "text/html; charset=utf-8", s);
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  WiFi.begin(SSID, PASS);
  while (WiFi.status() != WL_CONNECTED) delay(300);
  Serial.println(WiFi.localIP());
  server.on("/", handleRoot);
  server.begin();
}

void loop() {
  server.handleClient();
}` },
{ cat: "PWM", t: "PWM: fade LED (core 3.x)", lvl: 1, hw: "ESP32 + LED στο GPIO 2",
  d: "Στο ESP32 core 3.x χρησιμοποιείς ledcAttach(pin, συχνότητα, ανάλυση) και ledcWrite(pin, τιμή).",
  code: R`const int LED = 2;

void setup() {
  ledcAttach(LED, 5000, 8);   // 5 kHz, 8-bit (0-255)
}

void loop() {
  for (int d = 0; d <= 255; d++) { ledcWrite(LED, d); delay(4); }
  for (int d = 255; d >= 0; d--) { ledcWrite(LED, d); delay(4); }
}` },
{ cat: "Bluetooth", t: "Bluetooth Serial: έλεγχος LED από κινητό", lvl: 1, hw: "ESP32 (κλασικό, όχι S3/C3)",
  d: "Με εφαρμογή «Serial Bluetooth Terminal» στέλνεις 1/0 για να ανάψει/σβήσει το LED.",
  code: R`#include <BluetoothSerial.h>

BluetoothSerial bt;
const int LED = 2;

void setup() {
  pinMode(LED, OUTPUT);
  bt.begin("ESP32-Robotzedes");
}

void loop() {
  if (bt.available()) {
    char c = bt.read();
    if (c == '1') { digitalWrite(LED, HIGH); bt.println("LED ON"); }
    if (c == '0') { digitalWrite(LED, LOW);  bt.println("LED OFF"); }
  }
}` },
{ cat: "Αισθητήρες", t: "Αναλογική ανάγνωση (12-bit)", lvl: 1, hw: "ESP32 + ποτενσιόμετρο στο GPIO 34",
  d: "Το ADC του ESP32 είναι 12-bit (0-4095) και λειτουργεί στα 3.3V. Τα GPIO 34-39 είναι μόνο είσοδοι.",
  code: R`void setup() {
  Serial.begin(115200);
}

void loop() {
  int raw = analogRead(34);              // 0..4095
  int mv = analogReadMilliVolts(34);     // σε millivolt
  Serial.printf("raw=%d  mV=%d\n", raw, mv);
  delay(200);
}` },
];
ESP.forEach(s => { s.p = "esp32"; s.lang = "Arduino C++ (ESP32)"; });

const PICO = [
{ cat: "Βασικά", t: "Blink", lvl: 1, hw: "Raspberry Pi Pico / Pico W",
  d: "Στο Pico W το ενσωματωμένο LED λέγεται \"LED\". Γράψε τον κώδικα στο Thonny ως main.py.",
  code: R`from machine import Pin
import time

led = Pin("LED", Pin.OUT)

while True:
    led.toggle()
    time.sleep(0.5)` },
{ cat: "Βασικά", t: "Κουμπί & LED", lvl: 1, hw: "Pico, κουμπί GP14 → GND, LED GP15",
  d: "Εσωτερική pull-up αντίσταση: πατημένο κουμπί = 0.",
  code: R`from machine import Pin
import time

button = Pin(14, Pin.IN, Pin.PULL_UP)
led = Pin(15, Pin.OUT)

while True:
    led.value(1 if button.value() == 0 else 0)
    time.sleep(0.01)` },
{ cat: "Βασικά", t: "PWM fade", lvl: 1, hw: "Pico, LED GP15",
  d: "Το PWM του Pico παίρνει τιμές duty 0-65535.",
  code: R`from machine import Pin, PWM
import time

led = PWM(Pin(15))
led.freq(1000)

while True:
    for d in range(0, 65536, 512):
        led.duty_u16(d)
        time.sleep(0.005)
    for d in range(65535, -1, -512):
        led.duty_u16(d)
        time.sleep(0.005)` },
{ cat: "Αισθητήρες", t: "Εσωτερικός αισθητήρας θερμοκρασίας", lvl: 1, hw: "Pico",
  d: "Το Pico έχει ενσωματωμένο αισθητήρα θερμοκρασίας στο ADC 4.",
  code: R`from machine import ADC
import time

sensor = ADC(4)
while True:
    volts = sensor.read_u16() * 3.3 / 65535
    temp = 27 - (volts - 0.706) / 0.001721
    print("Θερμοκρασία: {:.1f} C".format(temp))
    time.sleep(1)` },
{ cat: "Αισθητήρες", t: "HC-SR04 απόσταση", lvl: 2, hw: "Pico, HC-SR04 TRIG GP3, ECHO GP2 (διαιρέτης τάσης στο ECHO!)",
  d: "Το ECHO του HC-SR04 βγάζει 5V: βάλε διαιρέτη τάσης (1kΩ/2kΩ) ή χρησιμοποίησε μοντέλο 3.3V.",
  code: R`from machine import Pin, time_pulse_us
import time

trig = Pin(3, Pin.OUT)
echo = Pin(2, Pin.IN)

def distance_cm():
    trig.low()
    time.sleep_us(2)
    trig.high()
    time.sleep_us(10)
    trig.low()
    t = time_pulse_us(echo, 1, 30000)
    return -1 if t < 0 else t * 0.0343 / 2

while True:
    print("{:.1f} cm".format(distance_cm()))
    time.sleep(0.2)` },
{ cat: "Μοτέρ", t: "Servo", lvl: 1, hw: "Pico, servo σήμα GP16, τροφοδοσία 5V (VBUS)",
  d: "Servo στα 50 Hz: 0.5 ms = 0°, 2.5 ms = 180°.",
  code: R`from machine import Pin, PWM
import time

servo = PWM(Pin(16))
servo.freq(50)

def angle(a):
    us = 500 + a * 2000 / 180
    servo.duty_ns(int(us * 1000))

while True:
    for a in (0, 90, 180, 90):
        angle(a)
        time.sleep(0.7)` },
{ cat: "Κίνηση", t: "Ρομπότ 2 τροχών με L298N / DRV8833", lvl: 2, hw: "Pico: αριστερό GP10/GP11, δεξί GP12/GP13 (PWM σε κάθε IN)",
  d: "Οδήγηση με δύο σήματα PWM ανά μοτέρ (λειτουργεί σε DRV8833, L9110S, L298N με τα jumpers ENA/ENB).",
  code: R`from machine import Pin, PWM
import time

def pwm(pin):
    p = PWM(Pin(pin))
    p.freq(1000)
    return p

L1, L2, R1, R2 = pwm(10), pwm(11), pwm(12), pwm(13)

def motor(a, b, speed):          # speed -100..100
    duty = int(min(100, abs(speed)) * 655.35)
    if speed >= 0:
        a.duty_u16(duty)
        b.duty_u16(0)
    else:
        a.duty_u16(0)
        b.duty_u16(duty)

def drive(left, right):
    motor(L1, L2, left)
    motor(R1, R2, right)

drive(70, 70);   time.sleep(1)
drive(-70, 70);  time.sleep(0.5)
drive(70, -70);  time.sleep(0.5)
drive(-70, -70); time.sleep(1)
drive(0, 0)` },
{ cat: "Wi-Fi", t: "Pico W: web server LED", lvl: 3, hw: "Raspberry Pi Pico W",
  d: "Το Pico W συνδέεται στο Wi-Fi και σερβίρει σελίδα με κουμπιά για το LED.",
  code: R`import network
import socket
import time
from machine import Pin

SSID = "ΤΟ_WIFI_ΣΟΥ"
PASSWORD = "ΚΩΔΙΚΟΣ"
led = Pin("LED", Pin.OUT)

wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.connect(SSID, PASSWORD)
while not wlan.isconnected():
    time.sleep(0.5)
ip = wlan.ifconfig()[0]
print("Άνοιξε: http://" + ip)

PAGE = """HTTP/1.0 200 OK\r\nContent-Type: text/html\r\n\r\n
<html><meta name=viewport content='width=device-width'>
<h1>Pico W</h1><a href='/on'><button>ON</button></a>
<a href='/off'><button>OFF</button></a></html>"""

s = socket.socket()
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind(("0.0.0.0", 80))
s.listen(1)
while True:
    cl, addr = s.accept()
    req = cl.recv(1024)
    if b"GET /on" in req:
        led.on()
    elif b"GET /off" in req:
        led.off()
    cl.send(PAGE)
    cl.close()` },
];
PICO.forEach(s => { s.p = "pico"; s.lang = "MicroPython"; });
window.SNIPPETS = (window.SNIPPETS || []).concat(ESP, PICO);
})();
