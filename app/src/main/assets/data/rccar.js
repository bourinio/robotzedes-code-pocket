/* Arduino τηλεκατευθυνόμενα αυτοκίνητα (Bluetooth, IR, nRF24, Wi-Fi) */
(function () {
const R = String.raw;
const L298 = R`// ---- L298N: ENA=5, IN1=7, IN2=8 (αριστερά) | ENB=6, IN3=9, IN4=10 (δεξιά) ----
const int ENA = 5, IN1 = 7, IN2 = 8;
const int ENB = 6, IN3 = 9, IN4 = 10;

void motorsSetup() {
  pinMode(ENA, OUTPUT); pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(ENB, OUTPUT); pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
}

void setMotors(int left, int right) {
  left = constrain(left, -255, 255);
  right = constrain(right, -255, 255);
  digitalWrite(IN1, left >= 0);  digitalWrite(IN2, left < 0);
  digitalWrite(IN3, right >= 0); digitalWrite(IN4, right < 0);
  analogWrite(ENA, abs(left));
  analogWrite(ENB, abs(right));
}
`;
const S = [
{ cat: "Bluetooth", t: "Bluetooth RC car (HC-05 + L298N)", lvl: 2, hw: "Arduino UNO, HC-05 (TX→2, RX→3 με διαιρέτη τάσης), L298N, 2 ή 4 μοτέρ",
  d: "Συμβατό με την Android εφαρμογή «Arduino Bluetooth RC Car»: F/B/L/R, διαγώνιες G/I/H/J, S stop, 0-9 & q ταχύτητα, W/w φώτα, V/v κόρνα. Κωδικός σύζευξης HC-05: 1234 ή 0000.",
  code: R`#include <SoftwareSerial.h>

SoftwareSerial bt(2, 3);   // RX, TX  (το HC-05 TX πάει στο 2)
` + L298 + R`
const int LIGHTS = 4;
const int HORN = A0;
int speed = 200;
unsigned long lastCommand = 0;

void setup() {
  motorsSetup();
  pinMode(LIGHTS, OUTPUT);
  pinMode(HORN, OUTPUT);
  bt.begin(9600);
  Serial.begin(9600);
}

void loop() {
  if (bt.available()) {
    char c = bt.read();
    lastCommand = millis();
    Serial.println(c);
    switch (c) {
      case 'F': setMotors(speed, speed); break;
      case 'B': setMotors(-speed, -speed); break;
      case 'L': setMotors(-speed, speed); break;
      case 'R': setMotors(speed, -speed); break;
      case 'G': setMotors(speed / 3, speed); break;    // μπροστά-αριστερά
      case 'I': setMotors(speed, speed / 3); break;    // μπροστά-δεξιά
      case 'H': setMotors(-speed / 3, -speed); break;  // πίσω-αριστερά
      case 'J': setMotors(-speed, -speed / 3); break;  // πίσω-δεξιά
      case 'S': setMotors(0, 0); break;
      case 'W': digitalWrite(LIGHTS, HIGH); break;
      case 'w': digitalWrite(LIGHTS, LOW); break;
      case 'V': tone(HORN, 600); break;
      case 'v': noTone(HORN); break;
      case 'q': speed = 255; break;
      default:
        if (c >= '0' && c <= '9') speed = map(c - '0', 0, 9, 80, 230);
    }
  }
  // Ασφάλεια: αν χαθεί η σύνδεση για 1 δευτ., σταμάτα
  if (millis() - lastCommand > 1000) setMotors(0, 0);
}` },
{ cat: "Bluetooth", t: "Bluetooth car με αυτόματη αποφυγή εμποδίων", lvl: 3, hw: "HC-05 (2/3) + L298N + HC-SR04 (TRIG 11, ECHO 12)",
  d: "Τηλεχειρισμός από το κινητό, αλλά αν πας να πέσεις σε εμπόδιο το αυτοκίνητο φρενάρει μόνο του. Το X ενεργοποιεί αυτόνομη λειτουργία, το x την απενεργοποιεί.",
  code: R`#include <SoftwareSerial.h>

SoftwareSerial bt(2, 3);
` + L298 + R`
const int TRIG = 11, ECHO = 12;
int speed = 200;
bool autoMode = false;
char lastCmd = 'S';

float distanceCm() {
  digitalWrite(TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  unsigned long t = pulseIn(ECHO, HIGH, 25000UL);
  return t == 0 ? 999 : t * 0.0343 / 2.0;
}

void drive(char c) {
  switch (c) {
    case 'F': setMotors(speed, speed); break;
    case 'B': setMotors(-speed, -speed); break;
    case 'L': setMotors(-speed, speed); break;
    case 'R': setMotors(speed, -speed); break;
    default:  setMotors(0, 0);
  }
}

void setup() {
  motorsSetup();
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  bt.begin(9600);
}

void loop() {
  if (bt.available()) {
    char c = bt.read();
    if (c == 'X') autoMode = true;
    else if (c == 'x') { autoMode = false; setMotors(0, 0); }
    else if (c >= '0' && c <= '9') speed = map(c - '0', 0, 9, 80, 230);
    else lastCmd = c;
  }

  float d = distanceCm();
  if (autoMode) {
    if (d < 25) { setMotors(-speed, -speed); delay(300); setMotors(speed, -speed); delay(400); }
    else setMotors(speed, speed);
  } else {
    if (lastCmd == 'F' && d < 20) setMotors(0, 0);   // φρένο έκτακτης ανάγκης
    else drive(lastCmd);
  }
  delay(20);
}` },
{ cat: "Bluetooth", t: "Ρύθμιση HC-05 με εντολές AT", lvl: 2, hw: "HC-05 με πατημένο το κουμπί EN κατά την τροφοδοσία (AT mode, 38400 baud)",
  d: "Αλλάζεις όνομα και κωδικό του HC-05. Άνοιξε Serial Monitor με «Both NL & CR» και γράψε: AT, AT+NAME=MyCar, AT+PSWD=\"1234\", AT+UART=9600,0,0.",
  code: R`#include <SoftwareSerial.h>

SoftwareSerial bt(2, 3);   // RX, TX

void setup() {
  Serial.begin(9600);
  bt.begin(38400);          // ταχύτητα AT mode του HC-05
  Serial.println("Γράψε εντολές AT:");
}

void loop() {
  if (bt.available()) Serial.write(bt.read());
  if (Serial.available()) bt.write(Serial.read());
}` },
{ cat: "Bluetooth", t: "Αυτοκίνητο με servo τιμόνι", lvl: 2, hw: "HC-05 (2/3), L298N (μόνο κανάλι A στο πίσω μοτέρ), servo τιμονιού στο pin 11",
  d: "Για αυτοκίνητα με πραγματικό τιμόνι (Ackermann): ένα μοτέρ για κίνηση και ένα servo για στρίψιμο.",
  code: R`#include <SoftwareSerial.h>
#include <Servo.h>

SoftwareSerial bt(2, 3);
Servo steering;
const int ENA = 5, IN1 = 7, IN2 = 8;
const int CENTER = 90, MAX_TURN = 35;
int speed = 200;

void drive(int s) {
  digitalWrite(IN1, s > 0);
  digitalWrite(IN2, s < 0);
  analogWrite(ENA, abs(s));
}

void setup() {
  pinMode(ENA, OUTPUT); pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  steering.attach(11);
  steering.write(CENTER);
  bt.begin(9600);
}

void loop() {
  if (!bt.available()) return;
  char c = bt.read();
  switch (c) {
    case 'F': steering.write(CENTER);            drive(speed);  break;
    case 'B': steering.write(CENTER);            drive(-speed); break;
    case 'L': steering.write(CENTER + MAX_TURN); break;
    case 'R': steering.write(CENTER - MAX_TURN); break;
    case 'G': steering.write(CENTER + MAX_TURN); drive(speed);  break;
    case 'I': steering.write(CENTER - MAX_TURN); drive(speed);  break;
    case 'H': steering.write(CENTER + MAX_TURN); drive(-speed); break;
    case 'J': steering.write(CENTER - MAX_TURN); drive(-speed); break;
    case 'S': steering.write(CENTER);            drive(0);      break;
    default:
      if (c >= '0' && c <= '9') speed = map(c - '0', 0, 9, 80, 255);
  }
}` },
{ cat: "Bluetooth", t: "4WD με L293D Motor Shield", lvl: 2, hw: "Arduino UNO + Adafruit Motor Shield v1 (L293D), 4 μοτέρ M1-M4, HC-05 στα A0(RX)/A1(TX)",
  d: "Για τα δημοφιλή κιτ 4WD με motor shield. Βιβλιοθήκη «Adafruit Motor Shield library» (AFMotor). Μοτέρ: M1/M2 αριστερά, M3/M4 δεξιά.",
  code: R`#include <AFMotor.h>
#include <SoftwareSerial.h>

SoftwareSerial bt(A0, A1);   // RX, TX
AF_DCMotor m1(1), m2(2), m3(3), m4(4);
int speed = 200;

void side(AF_DCMotor &a, AF_DCMotor &b, int s) {
  uint8_t dir = s > 0 ? FORWARD : (s < 0 ? BACKWARD : RELEASE);
  a.setSpeed(abs(s)); b.setSpeed(abs(s));
  a.run(dir);         b.run(dir);
}

void setMotors(int left, int right) {
  side(m1, m2, left);
  side(m3, m4, right);
}

void setup() {
  bt.begin(9600);
}

void loop() {
  if (!bt.available()) return;
  char c = bt.read();
  switch (c) {
    case 'F': setMotors(speed, speed); break;
    case 'B': setMotors(-speed, -speed); break;
    case 'L': setMotors(-speed, speed); break;
    case 'R': setMotors(speed, -speed); break;
    case 'G': setMotors(speed / 3, speed); break;
    case 'I': setMotors(speed, speed / 3); break;
    case 'H': setMotors(-speed / 3, -speed); break;
    case 'J': setMotors(-speed, -speed / 3); break;
    case 'S': setMotors(0, 0); break;
    default:
      if (c >= '0' && c <= '9') speed = map(c - '0', 0, 9, 80, 255);
  }
}` },
{ cat: "Υπέρυθρο (IR)", t: "Βρες τους κωδικούς του τηλεκοντρόλ", lvl: 1, hw: "IR δέκτης VS1838B: OUT→pin 11, βιβλιοθήκη IRremote 4.x",
  d: "Πρώτο βήμα για IR αυτοκίνητο: πάτα κάθε κουμπί του τηλεκοντρόλ και σημείωσε τον κωδικό (command) που εμφανίζεται.",
  code: R`#include <IRremote.hpp>

const int IR_PIN = 11;

void setup() {
  Serial.begin(9600);
  IrReceiver.begin(IR_PIN, ENABLE_LED_FEEDBACK);
  Serial.println("Πάτα κουμπιά στο τηλεκοντρόλ...");
}

void loop() {
  if (IrReceiver.decode()) {
    Serial.print("Command: 0x");
    Serial.println(IrReceiver.decodedIRData.command, HEX);
    IrReceiver.resume();
  }
}` },
{ cat: "Υπέρυθρο (IR)", t: "IR RC car", lvl: 2, hw: "IR δέκτης pin 11 (IRremote 4.x) + L298N",
  d: "Οδήγηση με το μικρό τηλεκοντρόλ (17 κουμπιών). Οι κωδικοί είναι για το συνηθισμένο «Car MP3»/NEC τηλεκοντρόλ — βάλε τους δικούς σου.",
  code: R`#include <IRremote.hpp>
` + L298 + R`
const int IR_PIN = 11;
// Κωδικοί (command) — άλλαξέ τους με αυτούς που βρήκες
const uint8_t BTN_UP = 0x18, BTN_DOWN = 0x52, BTN_LEFT = 0x08, BTN_RIGHT = 0x5A, BTN_OK = 0x1C;
unsigned long lastSignal = 0;

void setup() {
  motorsSetup();
  IrReceiver.begin(IR_PIN, ENABLE_LED_FEEDBACK);
}

void loop() {
  if (IrReceiver.decode()) {
    uint8_t cmd = IrReceiver.decodedIRData.command;
    IrReceiver.resume();
    lastSignal = millis();
    if (cmd == BTN_UP)         setMotors(200, 200);
    else if (cmd == BTN_DOWN)  setMotors(-200, -200);
    else if (cmd == BTN_LEFT)  setMotors(-160, 160);
    else if (cmd == BTN_RIGHT) setMotors(160, -160);
    else if (cmd == BTN_OK)    setMotors(0, 0);
  }
  // Όταν αφήνεις το κουμπί, σταματούν οι επαναλήψεις του σήματος → stop
  if (millis() - lastSignal > 250) setMotors(0, 0);
}` },
{ cat: "Ραδιοσυχνότητες (nRF24)", t: "Πομπός: χειριστήριο με joystick", lvl: 3, hw: "Arduino Nano + nRF24L01 (CE 9, CSN 10, SPI 11/12/13, 3.3V!) + joystick A0/A1",
  d: "Το χειριστήριο διαβάζει το joystick και στέλνει τις τιμές ασύρματα μέχρι ~100 m. Βιβλιοθήκη RF24 (TMRh20). Βάλε πυκνωτή 10μF στην τροφοδοσία του nRF24.",
  code: R`#include <SPI.h>
#include <RF24.h>

RF24 radio(9, 10);                // CE, CSN
const byte ADDRESS[6] = "CAR01";

struct Packet {
  int x;
  int y;
  bool button;
};
Packet data;

void setup() {
  pinMode(2, INPUT_PULLUP);
  radio.begin();
  radio.openWritingPipe(ADDRESS);
  radio.setPALevel(RF24_PA_LOW);
  radio.stopListening();
}

void loop() {
  data.x = analogRead(A0);
  data.y = analogRead(A1);
  data.button = digitalRead(2) == LOW;
  radio.write(&data, sizeof(data));
  delay(20);
}` },
{ cat: "Ραδιοσυχνότητες (nRF24)", t: "Δέκτης: αυτοκίνητο nRF24", lvl: 3, hw: "Arduino UNO + nRF24L01 (CE 9, CSN 10) + L298N (ENA 5, IN1 7, IN2 8, ENB 6, IN3 4, IN4 3)",
  d: "Λαμβάνει τα δεδομένα του joystick και τα μετατρέπει σε κίνηση (arcade drive). Σταματά αν χαθεί το σήμα. Προσοχή: εδώ IN3=4, IN4=3 γιατί τα 9-13 είναι για το nRF24.",
  code: R`#include <SPI.h>
#include <RF24.h>

RF24 radio(9, 10);
const byte ADDRESS[6] = "CAR01";

struct Packet {
  int x;
  int y;
  bool button;
};
Packet data;

const int ENA = 5, IN1 = 7, IN2 = 8;
const int ENB = 6, IN3 = 4, IN4 = 3;
unsigned long lastPacket = 0;

void setMotors(int left, int right) {
  left = constrain(left, -255, 255);
  right = constrain(right, -255, 255);
  digitalWrite(IN1, left >= 0);  digitalWrite(IN2, left < 0);
  digitalWrite(IN3, right >= 0); digitalWrite(IN4, right < 0);
  analogWrite(ENA, abs(left));
  analogWrite(ENB, abs(right));
}

int deadzone(int v) {
  return abs(v) < 30 ? 0 : v;
}

void setup() {
  pinMode(ENA, OUTPUT); pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(ENB, OUTPUT); pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  radio.begin();
  radio.openReadingPipe(0, ADDRESS);
  radio.setPALevel(RF24_PA_LOW);
  radio.startListening();
}

void loop() {
  if (radio.available()) {
    radio.read(&data, sizeof(data));
    lastPacket = millis();
    int throttle = deadzone(map(data.y, 0, 1023, -255, 255));
    int turn     = deadzone(map(data.x, 0, 1023, -255, 255));
    setMotors(throttle + turn, throttle - turn);
  }
  if (millis() - lastPacket > 500) setMotors(0, 0);   // failsafe
}` },
{ cat: "Wi-Fi", t: "ESP32 Wi-Fi car με χειριστήριο στον browser", lvl: 3, hw: "ESP32 DevKit + L298N (ENA 14, IN1 27, IN2 26, ENB 32, IN3 25, IN4 33)",
  d: "Το ESP32 φτιάχνει δικό του Wi-Fi (RobotCar / 12345678). Συνδέσου από το κινητό και άνοιξε 192.168.4.1 για να οδηγήσεις με κουμπιά. Θέλει ESP32 core 3.x.",
  code: R`#include <WiFi.h>
#include <WebServer.h>

const int ENA = 14, IN1 = 27, IN2 = 26;
const int ENB = 32, IN3 = 25, IN4 = 33;
WebServer server(80);

const char PAGE[] PROGMEM = R"HTML(
<!doctype html><html><head><meta name=viewport content="width=device-width">
<style>body{font-family:sans-serif;text-align:center;background:#111;color:#fff}
button{width:90px;height:90px;margin:6px;font-size:32px;border-radius:18px;border:0;background:#0b67b2;color:#fff}
#s{background:#f00087}</style></head><body><h2>Robot Car</h2>
<div><button ontouchstart="go('F')" ontouchend="go('S')">&#9650;</button></div>
<div><button ontouchstart="go('L')" ontouchend="go('S')">&#9664;</button>
<button id=s onclick="go('S')">&#9632;</button>
<button ontouchstart="go('R')" ontouchend="go('S')">&#9654;</button></div>
<div><button ontouchstart="go('B')" ontouchend="go('S')">&#9660;</button></div>
<p>Speed <input type=range min=80 max=255 value=200 oninput="fetch('/speed?v='+this.value)"></p>
<script>function go(c){fetch('/cmd?c='+c)}</script></body></html>
)HTML";

int speed = 200;

void setMotors(int left, int right) {
  digitalWrite(IN1, left > 0);  digitalWrite(IN2, left < 0);
  digitalWrite(IN3, right > 0); digitalWrite(IN4, right < 0);
  analogWrite(ENA, abs(left));
  analogWrite(ENB, abs(right));
}

void handleCmd() {
  char c = server.arg("c").charAt(0);
  if (c == 'F') setMotors(speed, speed);
  else if (c == 'B') setMotors(-speed, -speed);
  else if (c == 'L') setMotors(-speed, speed);
  else if (c == 'R') setMotors(speed, -speed);
  else setMotors(0, 0);
  server.send(200, "text/plain", "OK");
}

void setup() {
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  pinMode(ENA, OUTPUT); pinMode(ENB, OUTPUT);
  WiFi.softAP("RobotCar", "12345678");
  server.on("/", []() { server.send_P(200, "text/html", PAGE); });
  server.on("/cmd", handleCmd);
  server.on("/speed", []() { speed = server.arg("v").toInt(); server.send(200, "text/plain", "OK"); });
  server.begin();
}

void loop() {
  server.handleClient();
}` },
{ cat: "Wi-Fi", t: "ESP32 Bluetooth Classic car (χωρίς HC-05)", lvl: 2, hw: "ESP32 (όχι S3/C3 — θέλει Bluetooth Classic) + L298N όπως παραπάνω",
  d: "Το ESP32 έχει ενσωματωμένο Bluetooth: δουλεύει με την ίδια εφαρμογή «Arduino Bluetooth RC Car» χωρίς HC-05.",
  code: R`#include <BluetoothSerial.h>

BluetoothSerial bt;
const int ENA = 14, IN1 = 27, IN2 = 26;
const int ENB = 32, IN3 = 25, IN4 = 33;
int speed = 200;

void setMotors(int left, int right) {
  digitalWrite(IN1, left > 0);  digitalWrite(IN2, left < 0);
  digitalWrite(IN3, right > 0); digitalWrite(IN4, right < 0);
  analogWrite(ENA, abs(left));
  analogWrite(ENB, abs(right));
}

void setup() {
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  pinMode(ENA, OUTPUT); pinMode(ENB, OUTPUT);
  bt.begin("ESP32-Car");
}

void loop() {
  if (!bt.available()) return;
  char c = bt.read();
  switch (c) {
    case 'F': setMotors(speed, speed); break;
    case 'B': setMotors(-speed, -speed); break;
    case 'L': setMotors(-speed, speed); break;
    case 'R': setMotors(speed, -speed); break;
    case 'G': setMotors(speed / 3, speed); break;
    case 'I': setMotors(speed, speed / 3); break;
    case 'S': setMotors(0, 0); break;
    default:
      if (c >= '0' && c <= '9') speed = map(c - '0', 0, 9, 80, 255);
  }
}` },
{ cat: "Χειριστήρια", t: "Gesture car: οδήγηση με κλίση χεριού (πομπός)", lvl: 3, hw: "Arduino Nano + MPU6050 (SDA A4, SCL A5) + nRF24L01 (CE 9, CSN 10)",
  d: "Φοράς το χειριστήριο στο χέρι: η κλίση μπρος-πίσω και δεξιά-αριστερά στέλνεται στον δέκτη «αυτοκίνητο nRF24» (ίδια δομή Packet). Χωρίς εξωτερική βιβλιοθήκη για το MPU6050.",
  code: R`#include <Wire.h>
#include <SPI.h>
#include <RF24.h>

RF24 radio(9, 10);
const byte ADDRESS[6] = "CAR01";
struct Packet { int x; int y; bool button; };
Packet data;

int16_t readAxis(uint8_t reg) {
  Wire.beginTransmission(0x68);
  Wire.write(reg);
  Wire.endTransmission(false);
  Wire.requestFrom(0x68, 2);
  return (Wire.read() << 8) | Wire.read();
}

void setup() {
  Wire.begin();
  Wire.beginTransmission(0x68);   // ξύπνα το MPU6050
  Wire.write(0x6B);
  Wire.write(0);
  Wire.endTransmission();
  radio.begin();
  radio.openWritingPipe(ADDRESS);
  radio.setPALevel(RF24_PA_LOW);
  radio.stopListening();
}

void loop() {
  int ax = readAxis(0x3B);   // επιτάχυνση X
  int ay = readAxis(0x3D);   // επιτάχυνση Y
  // ±8000 περίπου = ±30° κλίση → αντιστοίχισε σε 0..1023 σαν joystick
  data.y = map(constrain(ax, -8000, 8000), -8000, 8000, 0, 1023);
  data.x = map(constrain(ay, -8000, 8000), -8000, 8000, 0, 1023);
  data.button = false;
  radio.write(&data, sizeof(data));
  delay(20);
}` },
];
S.forEach(s => { s.p = "rccar"; s.lang = "Arduino C++"; });
window.SNIPPETS = (window.SNIPPETS || []).concat(S);
})();
