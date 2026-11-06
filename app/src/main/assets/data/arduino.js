/* Arduino UNO / Nano — πλήρη sketches */
(function () {
const R = String.raw;
// Κοινό κομμάτι για ρομπότ 2 τροχών με L298N
const L298 = R`// ---- L298N: ENA=5, IN1=7, IN2=8 (αριστερό) | ENB=6, IN3=9, IN4=10 (δεξί) ----
const int ENA = 5, IN1 = 7, IN2 = 8;
const int ENB = 6, IN3 = 9, IN4 = 10;

void motorsSetup() {
  pinMode(ENA, OUTPUT); pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(ENB, OUTPUT); pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
}

// speed: -255 (πίσω) ... 255 (μπροστά)
void setMotors(int left, int right) {
  left = constrain(left, -255, 255);
  right = constrain(right, -255, 255);
  digitalWrite(IN1, left >= 0);  digitalWrite(IN2, left < 0);
  digitalWrite(IN3, right >= 0); digitalWrite(IN4, right < 0);
  analogWrite(ENA, abs(left));
  analogWrite(ENB, abs(right));
}

void forward(int s)   { setMotors(s, s); }
void backward(int s)  { setMotors(-s, -s); }
void turnLeft(int s)  { setMotors(-s, s); }
void turnRight(int s) { setMotors(s, -s); }
void stopMotors()          { setMotors(0, 0); }
`;
const SONAR = R`
// ---- HC-SR04: TRIG=11, ECHO=12 ----
const int TRIG = 11, ECHO = 12;

float distanceCm() {
  digitalWrite(TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  unsigned long t = pulseIn(ECHO, HIGH, 30000UL);   // timeout ~5 m
  if (t == 0) return 999;                           // τίποτα μπροστά
  return t * 0.0343 / 2.0;
}
`;
const S = [
{ cat: "Βασικά", t: "Blink: αναβόσβημα LED", lvl: 1, hw: "Arduino UNO (LED στο pin 13)",
  d: "Το «Hello World» του Arduino. Το ενσωματωμένο LED αναβοσβήνει κάθε μισό δευτερόλεπτο.",
  code: R`void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  delay(500);
}` },
{ cat: "Βασικά", t: "Κουμπί → LED (INPUT_PULLUP)", lvl: 1, hw: "Κουμπί pin 2 → GND, LED pin 13",
  d: "Με INPUT_PULLUP δεν χρειάζεται εξωτερική αντίσταση. Πατημένο κουμπί = LOW.",
  code: R`const int BUTTON = 2;
const int LED = 13;

void setup() {
  pinMode(BUTTON, INPUT_PULLUP);
  pinMode(LED, OUTPUT);
}

void loop() {
  bool pressed = digitalRead(BUTTON) == LOW;
  digitalWrite(LED, pressed ? HIGH : LOW);
}` },
{ cat: "Βασικά", t: "Διακόπτης toggle με debounce", lvl: 2, hw: "Κουμπί pin 2 → GND, LED pin 13",
  d: "Κάθε πάτημα αλλάζει την κατάσταση του LED. Το debounce αγνοεί τις αναπηδήσεις του κουμπιού.",
  code: R`const int BUTTON = 2;
const int LED = 13;
bool ledOn = false;
bool lastState = HIGH;
unsigned long lastChange = 0;

void setup() {
  pinMode(BUTTON, INPUT_PULLUP);
  pinMode(LED, OUTPUT);
}

void loop() {
  bool state = digitalRead(BUTTON);
  if (state != lastState && millis() - lastChange > 50) {
    lastChange = millis();
    if (state == LOW) {
      ledOn = !ledOn;
      digitalWrite(LED, ledOn);
    }
    lastState = state;
  }
}` },
{ cat: "Βασικά", t: "Fade LED με PWM", lvl: 1, hw: "LED + 220Ω στο pin 9 (PWM ~)",
  d: "Το LED ανάβει και σβήνει σταδιακά με analogWrite (0-255). Λειτουργεί μόνο σε pins με ~ (3, 5, 6, 9, 10, 11).",
  code: R`const int LED = 9;

void setup() {
  pinMode(LED, OUTPUT);
}

void loop() {
  for (int b = 0; b <= 255; b++) {
    analogWrite(LED, b);
    delay(5);
  }
  for (int b = 255; b >= 0; b--) {
    analogWrite(LED, b);
    delay(5);
  }
}` },
{ cat: "Βασικά", t: "Φανάρι κυκλοφορίας με πεζούς", lvl: 1, hw: "LED κόκκινο 10, κίτρινο 9, πράσινο 8, κουμπί πεζών 2",
  d: "Κανονικός κύκλος φαναριού. Όταν πατηθεί το κουμπί πεζών, το φανάρι γίνεται πιο γρήγορα κόκκινο.",
  code: R`const int RED = 10, YELLOW = 9, GREEN = 8, BUTTON = 2;

void lights(bool r, bool y, bool g) {
  digitalWrite(RED, r);
  digitalWrite(YELLOW, y);
  digitalWrite(GREEN, g);
}

// περιμένει ms, αλλά σταματά νωρίτερα αν πατηθεί το κουμπί
void waitOrButton(unsigned long ms) {
  unsigned long start = millis();
  while (millis() - start < ms) {
    if (digitalRead(BUTTON) == LOW) return;
  }
}

void setup() {
  pinMode(RED, OUTPUT); pinMode(YELLOW, OUTPUT); pinMode(GREEN, OUTPUT);
  pinMode(BUTTON, INPUT_PULLUP);
}

void loop() {
  lights(0, 0, 1); waitOrButton(8000);  // πράσινο
  lights(0, 1, 0); delay(2000);         // κίτρινο
  lights(1, 0, 0); delay(6000);         // κόκκινο (περνούν οι πεζοί)
}` },
{ cat: "Βασικά", t: "Serial Monitor: διάβασε & γράψε", lvl: 1, hw: "Arduino + USB",
  d: "Γράφεις έναν αριθμό στο Serial Monitor (9600 baud) και το Arduino απαντά με το διπλάσιο. Βασικό για debugging.",
  code: R`void setup() {
  Serial.begin(9600);
  Serial.println("Γράψε έναν αριθμό:");
}

void loop() {
  if (Serial.available()) {
    int n = Serial.parseInt();
    while (Serial.available()) Serial.read();   // καθάρισε το υπόλοιπο
    Serial.print("Το διπλάσιο είναι: ");
    Serial.println(n * 2);
  }
}` },
{ cat: "Βασικά", t: "Buzzer: μελωδία", lvl: 1, hw: "Passive buzzer στο pin 8",
  d: "Παίζει μελωδία με tone(pin, συχνότητα, διάρκεια).",
  code: R`const int BUZZER = 8;
// C D E F G A B C
int notes[]     = {262, 294, 330, 349, 392, 440, 494, 523};
int durations[] = {300, 300, 300, 300, 300, 300, 300, 600};

void setup() {
  for (int i = 0; i < 8; i++) {
    tone(BUZZER, notes[i], durations[i]);
    delay(durations[i] * 1.3);
  }
  noTone(BUZZER);
}

void loop() {}` },
{ cat: "Βασικά", t: "RGB LED: όλα τα χρώματα", lvl: 1, hw: "RGB LED κοινής καθόδου: R=9, G=10, B=11",
  d: "Ανάμιξη χρωμάτων με PWM στα τρία κανάλια ενός RGB LED.",
  code: R`const int R_PIN = 9, G_PIN = 10, B_PIN = 11;

void color(int r, int g, int b) {
  analogWrite(R_PIN, r);
  analogWrite(G_PIN, g);
  analogWrite(B_PIN, b);
}

void setup() {
  pinMode(R_PIN, OUTPUT); pinMode(G_PIN, OUTPUT); pinMode(B_PIN, OUTPUT);
}

void loop() {
  color(255, 0, 0);   delay(700);  // κόκκινο
  color(0, 255, 0);   delay(700);  // πράσινο
  color(0, 0, 255);   delay(700);  // μπλε
  color(255, 255, 0); delay(700);  // κίτρινο
  color(0, 255, 255); delay(700);  // κυανό
  color(255, 0, 255); delay(700);  // ματζέντα
  color(255, 255, 255); delay(700);
}` },
{ cat: "Βασικά", t: "millis(): πολλά πράγματα μαζί χωρίς delay", lvl: 2, hw: "LED 13 και LED 12",
  d: "Δύο LED αναβοσβήνουν με διαφορετικούς ρυθμούς ταυτόχρονα. Το millis() αντί για delay() είναι η βάση για ρομπότ που «ακούνε» αισθητήρες συνεχώς.",
  code: R`const int LED_A = 13, LED_B = 12;
unsigned long lastA = 0, lastB = 0;
bool stateA = false, stateB = false;

void setup() {
  pinMode(LED_A, OUTPUT);
  pinMode(LED_B, OUTPUT);
}

void loop() {
  unsigned long now = millis();
  if (now - lastA >= 300) {
    lastA = now;
    stateA = !stateA;
    digitalWrite(LED_A, stateA);
  }
  if (now - lastB >= 1000) {
    lastB = now;
    stateB = !stateB;
    digitalWrite(LED_B, stateB);
  }
}` },
{ cat: "Αισθητήρες", t: "HC-SR04: απόσταση στο Serial", lvl: 1, hw: "HC-SR04: VCC 5V, TRIG 11, ECHO 12, GND",
  d: "Μετρά απόσταση με υπερήχους. Ήχος ταξιδεύει 0.0343 cm/μs, διαιρούμε με 2 (πήγαινε-έλα).",
  code: SONAR + R`
void setup() {
  Serial.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
}

void loop() {
  Serial.print("Απόσταση: ");
  Serial.print(distanceCm());
  Serial.println(" cm");
  delay(200);
}` },
{ cat: "Αισθητήρες", t: "Αισθητήρας στάθμευσης (parking)", lvl: 2, hw: "HC-SR04 (11/12) + buzzer 8",
  d: "Όσο πλησιάζει το εμπόδιο τόσο πιο γρήγορα χτυπάει το buzzer. Κάτω από 5 cm συνεχής ήχος.",
  code: SONAR + R`const int BUZZER = 8;

void setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
}

void loop() {
  float d = distanceCm();
  if (d < 5) {
    tone(BUZZER, 1500);
  } else if (d < 50) {
    tone(BUZZER, 1500, 60);
    delay(map((int)d, 5, 50, 80, 600));
  } else {
    noTone(BUZZER);
    delay(100);
  }
}` },
{ cat: "Αισθητήρες", t: "LDR: αυτόματο φως νυχτός", lvl: 1, hw: "LDR + 10kΩ διαιρέτης στο A0, LED 13",
  d: "Όταν σκοτεινιάσει ανάβει το LED. Ρύθμισε το κατώφλι κοιτάζοντας τις τιμές στο Serial.",
  code: R`const int LDR = A0;
const int LED = 13;
const int THRESHOLD = 300;

void setup() {
  Serial.begin(9600);
  pinMode(LED, OUTPUT);
}

void loop() {
  int light = analogRead(LDR);   // 0..1023
  Serial.println(light);
  digitalWrite(LED, light < THRESHOLD ? HIGH : LOW);
  delay(200);
}` },
{ cat: "Αισθητήρες", t: "Ποτενσιόμετρο → φωτεινότητα LED", lvl: 1, hw: "Ποτενσιόμετρο στο A0, LED στο 9",
  d: "Η map() μετατρέπει την τιμή 0-1023 σε 0-255 για PWM.",
  code: R`void setup() {
  pinMode(9, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int v = analogRead(A0);
  int pwm = map(v, 0, 1023, 0, 255);
  analogWrite(9, pwm);
  Serial.println(pwm);
  delay(20);
}` },
{ cat: "Αισθητήρες", t: "DHT11: θερμοκρασία & υγρασία", lvl: 1, hw: "DHT11 στο pin 4 (βιβλιοθήκη «DHT sensor library» της Adafruit)",
  d: "Διαβάζει θερμοκρασία και υγρασία κάθε 2 δευτερόλεπτα.",
  code: R`#include <DHT.h>

DHT dht(4, DHT11);

void setup() {
  Serial.begin(9600);
  dht.begin();
}

void loop() {
  delay(2000);
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (isnan(h) || isnan(t)) {
    Serial.println("Σφάλμα ανάγνωσης DHT!");
    return;
  }
  Serial.print("Θερμοκρασία: "); Serial.print(t); Serial.print(" °C  ");
  Serial.print("Υγρασία: ");     Serial.print(h); Serial.println(" %");
}` },
{ cat: "Αισθητήρες", t: "PIR: ανίχνευση κίνησης", lvl: 1, hw: "PIR HC-SR501 στο pin 2, buzzer 8, LED 13",
  d: "Συναγερμός: όταν ο PIR ανιχνεύσει άνθρωπο, ανάβει το LED και ηχεί το buzzer.",
  code: R`const int PIR = 2, LED = 13, BUZZER = 8;

void setup() {
  pinMode(PIR, INPUT);
  pinMode(LED, OUTPUT);
  Serial.begin(9600);
  delay(30000);   // ο PIR θέλει ~30s να σταθεροποιηθεί
  Serial.println("Έτοιμο");
}

void loop() {
  if (digitalRead(PIR) == HIGH) {
    digitalWrite(LED, HIGH);
    tone(BUZZER, 1000, 200);
    Serial.println("Κίνηση!");
    delay(500);
  } else {
    digitalWrite(LED, LOW);
  }
}` },
{ cat: "Αισθητήρες", t: "Αισθητήρας φλόγας / βροχής / ήχου (digital+analog)", lvl: 1, hw: "Module με D0 στο pin 2 και A0 στο A0",
  d: "Τα περισσότερα modules (φλόγας, βροχής, ήχου, υγρασίας εδάφους) έχουν ψηφιακή έξοδο D0 με ποτενσιόμετρο και αναλογική A0.",
  code: R`const int D0_PIN = 2;
const int A0_PIN = A0;
const int BUZZER = 8;

void setup() {
  Serial.begin(9600);
  pinMode(D0_PIN, INPUT);
}

void loop() {
  int analogValue = analogRead(A0_PIN);
  bool triggered = digitalRead(D0_PIN) == LOW;   // τα περισσότερα modules: LOW = ανίχνευση
  Serial.print("A0="); Serial.print(analogValue);
  Serial.print("  D0="); Serial.println(triggered ? "ΑΝΙΧΝΕΥΣΗ" : "-");
  if (triggered) tone(BUZZER, 1200, 100);
  delay(200);
}` },
{ cat: "Αισθητήρες", t: "Joystick module", lvl: 1, hw: "Joystick: VRx A0, VRy A1, SW pin 2",
  d: "Διαβάζει τους άξονες X/Y (0-1023, κέντρο ~512) και το κουμπί του joystick.",
  code: R`void setup() {
  Serial.begin(9600);
  pinMode(2, INPUT_PULLUP);
}

void loop() {
  int x = analogRead(A0);
  int y = analogRead(A1);
  bool click = digitalRead(2) == LOW;
  Serial.print("X="); Serial.print(x);
  Serial.print(" Y="); Serial.print(y);
  Serial.print(" SW="); Serial.println(click);
  delay(100);
}` },
{ cat: "Οθόνες", t: "LCD 16x2 I2C", lvl: 2, hw: "LCD με I2C (SDA=A4, SCL=A5), βιβλιοθήκη LiquidCrystal I2C",
  d: "Εμφανίζει κείμενο και μετρητή δευτερολέπτων. Αν δεν δείχνει τίποτα, δοκίμασε διεύθυνση 0x3F και ρύθμισε το κοντράστ.",
  code: R`#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("ROBOTZEDES");
}

void loop() {
  lcd.setCursor(0, 1);
  lcd.print("Time: ");
  lcd.print(millis() / 1000);
  lcd.print(" s   ");
  delay(250);
}` },
{ cat: "Οθόνες", t: "OLED 128x64 SSD1306", lvl: 2, hw: "OLED I2C 0x3C, βιβλιοθήκες Adafruit SSD1306 + GFX",
  d: "Γράφει κείμενο και σχεδιάζει μπάρα που δείχνει την τιμή του A0.",
  code: R`#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 display(128, 64, &Wire, -1);

void setup() {
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.setTextColor(SSD1306_WHITE);
}

void loop() {
  int v = analogRead(A0);
  display.clearDisplay();
  display.setTextSize(2);
  display.setCursor(0, 0);
  display.print("A0: ");
  display.print(v);
  display.drawRect(0, 40, 128, 16, SSD1306_WHITE);
  display.fillRect(0, 40, map(v, 0, 1023, 0, 128), 16, SSD1306_WHITE);
  display.display();
  delay(50);
}` },
{ cat: "Μοτέρ", t: "Servo: σάρωση 0°–180°", lvl: 1, hw: "Servo SG90: σήμα pin 9, 5V, GND",
  d: "Το servo κινείται αργά από 0° σε 180° και πίσω.",
  code: R`#include <Servo.h>

Servo myServo;

void setup() {
  myServo.attach(9);
}

void loop() {
  for (int a = 0; a <= 180; a++) {
    myServo.write(a);
    delay(10);
  }
  for (int a = 180; a >= 0; a--) {
    myServo.write(a);
    delay(10);
  }
}` },
{ cat: "Μοτέρ", t: "Servo με ποτενσιόμετρο", lvl: 1, hw: "Servo pin 9, ποτενσιόμετρο A0",
  d: "Ελέγχεις τη γωνία του servo γυρίζοντας το ποτενσιόμετρο.",
  code: R`#include <Servo.h>

Servo myServo;

void setup() {
  myServo.attach(9);
}

void loop() {
  int angle = map(analogRead(A0), 0, 1023, 0, 180);
  myServo.write(angle);
  delay(15);
}` },
{ cat: "Μοτέρ", t: "DC μοτέρ με L298N: ταχύτητα & φορά", lvl: 1, hw: "L298N (ENA 5, IN1 7, IN2 8, ENB 6, IN3 9, IN4 10), μπαταρία 7-12V",
  d: "Βασικό πρόγραμμα κίνησης για ρομπότ 2 τροχών. Θυμήσου: κοινό GND Arduino και L298N! Βγάλε τα jumpers ENA/ENB για έλεγχο ταχύτητας.",
  code: L298 + R`
void setup() {
  motorsSetup();
}

void loop() {
  forward(180);     delay(1500);
  stopMotors();  delay(500);
  backward(180);    delay(1500);
  turnLeft(160);    delay(600);
  turnRight(160);   delay(600);
  stopMotors();  delay(2000);
}` },
{ cat: "Μοτέρ", t: "Stepper 28BYJ-48 με ULN2003", lvl: 2, hw: "ULN2003: IN1 8, IN2 9, IN3 10, IN4 11",
  d: "Ακριβής κίνηση σε βήματα. 2048 βήματα = 1 πλήρης περιστροφή. Προσοχή στη σειρά των pins: 8, 10, 9, 11.",
  code: R`#include <Stepper.h>

const int STEPS_PER_REV = 2048;
Stepper stepper(STEPS_PER_REV, 8, 10, 9, 11);

void setup() {
  stepper.setSpeed(10);   // RPM
}

void loop() {
  stepper.step(STEPS_PER_REV);       // 1 στροφή δεξιά
  delay(500);
  stepper.step(-STEPS_PER_REV / 4);  // 90° αριστερά
  delay(500);
}` },
{ cat: "Line Follower", t: "Line follower 2 IR αισθητήρων", lvl: 1, hw: "L298N + 2 IR (TCRT5000): αριστερός A0→pin 2, δεξιός pin 3",
  d: "Ο πιο απλός ακόλουθος γραμμής. Οι περισσότεροι IR modules δίνουν HIGH στο μαύρο (έλεγξε με το LED του module).",
  code: L298 + R`
const int IR_L = 2, IR_R = 3;
const int BLACK = HIGH;

void setup() {
  motorsSetup();
  pinMode(IR_L, INPUT);
  pinMode(IR_R, INPUT);
}

void loop() {
  bool L = digitalRead(IR_L) == BLACK;
  bool R = digitalRead(IR_R) == BLACK;
  if (!L && !R)      forward(150);        // γραμμή στη μέση
  else if (L && !R)  setMotors(0, 170);   // γραμμή αριστερά → στρίψε αριστερά
  else if (!L && R)  setMotors(170, 0);   // γραμμή δεξιά → στρίψε δεξιά
  else               stopMotors();        // διασταύρωση / τέλος
}` },
{ cat: "Line Follower", t: "Line follower 3 IR αισθητήρων", lvl: 2, hw: "L298N + 3 IR: αριστερός 2, κεντρικός 3, δεξιός 4",
  d: "Με κεντρικό αισθητήρα η κίνηση είναι πιο σταθερή. Θυμάται προς τα πού χάθηκε η γραμμή.",
  code: L298 + R`
const int IR_L = 2, IR_C = 3, IR_R = 4;
const int BLACK = HIGH;
int lastSeen = 0;   // -1 αριστερά, 1 δεξιά

void setup() {
  motorsSetup();
  pinMode(IR_L, INPUT); pinMode(IR_C, INPUT); pinMode(IR_R, INPUT);
}

void loop() {
  bool L = digitalRead(IR_L) == BLACK;
  bool C = digitalRead(IR_C) == BLACK;
  bool R = digitalRead(IR_R) == BLACK;

  if (C && !L && !R)      forward(160);
  else if (L)           { setMotors(40, 180); lastSeen = -1; }
  else if (R)           { setMotors(180, 40); lastSeen = 1; }
  else if (!L && !C && !R) {
    if (lastSeen < 0) turnLeft(140);   // ψάξε τη γραμμή
    else              turnRight(140);
  }
}` },
{ cat: "Line Follower", t: "PID line follower (5 αναλογικοί)", lvl: 3, hw: "L298N + συστοιχία 5 αναλογικών IR στα A0–A4",
  d: "Υπολογίζει τη θέση της γραμμής (σταθμισμένος μέσος όρος) και διορθώνει με PID. Ρύθμιση: αύξανε Kp μέχρι να ταλαντεύεται, μετά πρόσθεσε Kd.",
  code: L298 + R`
const int SENSORS[5] = {A0, A1, A2, A3, A4};
const int BASE_SPEED = 150;
float Kp = 0.08, Ki = 0.0, Kd = 0.6;

float integral = 0;
int lastError = 0;

// Επιστρέφει θέση -2000 (αριστερά) έως +2000 (δεξιά), 0 = κέντρο
int readLinePosition() {
  long weighted = 0, total = 0;
  for (int i = 0; i < 5; i++) {
    int v = analogRead(SENSORS[i]);     // υψηλό = μαύρο (στα περισσότερα modules)
    weighted += (long)v * (i - 2) * 1000;
    total += v;
  }
  if (total < 300) return lastError;    // χάθηκε η γραμμή: κράτα την τελευταία
  return weighted / total;
}

void setup() {
  motorsSetup();
  delay(2000);
}

void loop() {
  int error = readLinePosition();
  integral = constrain(integral + error, -10000, 10000);
  int derivative = error - lastError;
  int correction = Kp * error + Ki * integral + Kd * derivative;
  lastError = error;
  setMotors(BASE_SPEED + correction, BASE_SPEED - correction);
}` },
{ cat: "Obstacle Avoidance", t: "Σταμάτα στα 15 cm", lvl: 1, hw: "L298N + HC-SR04 (TRIG 11, ECHO 12)",
  d: "Κινείται μπροστά και σταματά όταν βρει εμπόδιο πιο κοντά από 15 cm.",
  code: L298 + SONAR + R`
void setup() {
  motorsSetup();
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
}

void loop() {
  if (distanceCm() < 15) stopMotors();
  else forward(170);
  delay(30);
}` },
{ cat: "Obstacle Avoidance", t: "Αποφυγή εμποδίων", lvl: 2, hw: "L298N + HC-SR04",
  d: "Όταν βρει εμπόδιο: σταματά, κάνει πίσω και στρίβει σε τυχαία κατεύθυνση.",
  code: L298 + SONAR + R`
void setup() {
  motorsSetup();
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  randomSeed(analogRead(A5));
}

void loop() {
  if (distanceCm() < 20) {
    stopMotors();  delay(200);
    backward(160); delay(400);
    if (random(2)) turnLeft(160); else turnRight(160);
    delay(random(300, 700));
  } else {
    forward(180);
  }
  delay(30);
}` },
{ cat: "Obstacle Avoidance", t: "Αποφυγή με servo-«κεφάλι» που κοιτάζει", lvl: 3, hw: "L298N + HC-SR04 πάνω σε servo (pin 3)",
  d: "Όταν βρει εμπόδιο, γυρίζει το servo αριστερά και δεξιά, μετρά και στρίβει προς την πιο ελεύθερη πλευρά.",
  code: R`#include <Servo.h>
` + L298 + SONAR + R`
Servo head;

float lookAt(int angle) {
  head.write(angle);
  delay(350);
  return distanceCm();
}

void setup() {
  motorsSetup();
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  head.attach(3);
  head.write(90);
  delay(500);
}

void loop() {
  if (distanceCm() > 25) {
    forward(170);
    delay(40);
    return;
  }
  stopMotors();
  backward(150); delay(250); stopMotors();
  float left = lookAt(160);
  float right = lookAt(20);
  head.write(90);
  if (left > right) turnLeft(160); else turnRight(160);
  delay(450);
  stopMotors();
}` },
{ cat: "Sumo", t: "Mini Sumo", lvl: 3, hw: "L298N + HC-SR04 μπροστά + 2 IR κάτω (2 αριστερά, 3 δεξιά)",
  d: "Ψάχνει τον αντίπαλο περιστρεφόμενο, επιτίθεται όταν τον βρει, και μένει μέσα στο ρινγκ (άσπρη άκρη → IR δίνει LOW).",
  code: L298 + SONAR + R`
const int EDGE_L = 2, EDGE_R = 3;
const int WHITE = LOW;

void setup() {
  motorsSetup();
  pinMode(TRIG, OUTPUT); pinMode(ECHO, INPUT);
  pinMode(EDGE_L, INPUT); pinMode(EDGE_R, INPUT);
  delay(5000);   // κανόνας: 5 δευτ. αναμονή μετά την εκκίνηση
}

void loop() {
  bool edgeL = digitalRead(EDGE_L) == WHITE;
  bool edgeR = digitalRead(EDGE_R) == WHITE;

  if (edgeL || edgeR) {
    backward(255); delay(300);
    if (edgeL) turnRight(220); else turnLeft(220);
    delay(300);
  } else if (distanceCm() < 40) {
    forward(255);                 // επίθεση!
  } else {
    setMotors(120, -120);         // αναζήτηση
  }
}` },
{ cat: "Αυτοματισμοί", t: "Έξυπνος κάδος (ανοίγει μόνος)", lvl: 2, hw: "HC-SR04 (11/12) + servo καπακιού (pin 9)",
  d: "Όταν πλησιάσει χέρι κάτω από 20 cm, το καπάκι ανοίγει για 3 δευτερόλεπτα.",
  code: R`#include <Servo.h>
` + SONAR + R`
Servo lid;

void setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  lid.attach(9);
  lid.write(0);
}

void loop() {
  if (distanceCm() < 20) {
    lid.write(100);
    delay(3000);
    lid.write(0);
    delay(500);
  }
  delay(100);
}` },
{ cat: "Αυτοματισμοί", t: "Αυτόματο πότισμα", lvl: 2, hw: "Soil sensor A0, relay αντλίας pin 7",
  d: "Όταν το χώμα στεγνώσει, ενεργοποιεί την αντλία για 3 δευτ. Περιμένει 1 λεπτό πριν ξαναμετρήσει.",
  code: R`const int SOIL = A0;
const int PUMP_RELAY = 7;
const int DRY_LEVEL = 600;   // μεγαλύτερη τιμή = πιο ξερό (στα περισσότερα modules)

void setup() {
  Serial.begin(9600);
  pinMode(PUMP_RELAY, OUTPUT);
  digitalWrite(PUMP_RELAY, LOW);
}

void loop() {
  int soil = analogRead(SOIL);
  Serial.print("Υγρασία εδάφους: ");
  Serial.println(soil);
  if (soil > DRY_LEVEL) {
    digitalWrite(PUMP_RELAY, HIGH);
    delay(3000);
    digitalWrite(PUMP_RELAY, LOW);
    delay(60000);
  }
  delay(1000);
}` },
{ cat: "Αυτοματισμοί", t: "Θερμοστάτης με ανεμιστήρα", lvl: 2, hw: "DHT11 pin 4, relay/transistor ανεμιστήρα pin 7",
  d: "Ανάβει τον ανεμιστήρα πάνω από 27 °C και τον σβήνει κάτω από 25 °C (υστέρηση για να μην «τρεμοπαίζει»).",
  code: R`#include <DHT.h>

DHT dht(4, DHT11);
const int FAN = 7;
bool fanOn = false;

void setup() {
  Serial.begin(9600);
  dht.begin();
  pinMode(FAN, OUTPUT);
}

void loop() {
  float t = dht.readTemperature();
  if (!isnan(t)) {
    if (!fanOn && t > 27) fanOn = true;
    if (fanOn && t < 25)  fanOn = false;
    digitalWrite(FAN, fanOn);
    Serial.print(t); Serial.println(fanOn ? " °C  FAN ON" : " °C  FAN OFF");
  }
  delay(2000);
}` },
{ cat: "Αυτοματισμοί", t: "Κλειδαριά με keypad 4x4", lvl: 3, hw: "Keypad 4x4 (γραμμές 9-6, στήλες 5-2), servo A0, βιβλιοθήκη Keypad",
  d: "Γράφεις κωδικό και πατάς # για επιβεβαίωση. Σωστός κωδικός = ανοίγει το servo. * καθαρίζει.",
  code: R`#include <Keypad.h>
#include <Servo.h>

const byte ROWS = 4, COLS = 4;
char keys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};
byte rowPins[ROWS] = {9, 8, 7, 6};
byte colPins[COLS] = {5, 4, 3, 2};
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

Servo lock;
const String PASSWORD = "1234";
String input = "";

void setup() {
  Serial.begin(9600);
  lock.attach(A0);
  lock.write(0);
}

void loop() {
  char k = keypad.getKey();
  if (!k) return;
  if (k == '*') {
    input = "";
  } else if (k == '#') {
    if (input == PASSWORD) {
      Serial.println("ΣΩΣΤΟΣ!");
      lock.write(90);
      delay(4000);
      lock.write(0);
    } else {
      Serial.println("Λάθος κωδικός");
    }
    input = "";
  } else {
    input += k;
    Serial.print('*');
  }
}` },
];
S.forEach(s => { s.p = "arduino"; s.lang = "Arduino C++"; });
window.SNIPPETS = (window.SNIPPETS || []).concat(S);
})();
