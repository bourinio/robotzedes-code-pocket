/* Makeblock mBot (mCore, Arduino C++ με βιβλιοθήκη Makeblock) και mBot2 (CyberPi, Python) */
(function () {
const R = String.raw;
const LANG1 = "Arduino C++ (mBot)";
const LANG2 = "mBot2 Python";
// Κοινό κομμάτι για mBot: μοτέρ M1 (αριστερό) / M2 (δεξί)
const MOVE = R`MeDCMotor motorL(M1);
MeDCMotor motorR(M2);

// speed: -255 (πίσω) ... 255 (μπροστά). Το αριστερό μοτέρ είναι ανάποδα τοποθετημένο.
void setMotors(int left, int right) {
  motorL.run(-left);
  motorR.run(right);
}
void forward(int s)   { setMotors(s, s); }
void backward(int s)  { setMotors(-s, -s); }
void turnLeft(int s)  { setMotors(-s, s); }
void turnRight(int s) { setMotors(s, -s); }
void stopMotors()     { setMotors(0, 0); }
`;
const BUTTON = R`
// Κουμπί πάνω στην πλακέτα mCore (A7): πατημένο = τιμή κοντά στο 0
bool boardButton() {
  return analogRead(A7) < 10;
}
void waitButton() {
  while (!boardButton()) delay(10);
  while (boardButton()) delay(10);
}
`;
const NOTE1 = "Στο Arduino IDE εγκατάστησε τη βιβλιοθήκη Makeblock (Makeblock-Libraries) και διάλεξε πλακέτα «Arduino Uno». ";
const NOTE2 = "Στο mBlock 5 διάλεξε συσκευή CyberPi, λειτουργία Upload και γράψε τον κώδικα σε Python. ";

const S = [
/* ---------------- mBot (mCore) ---------------- */
{ cat: "Βασικά", t: "mBot: φώτα RGB & ήχος", lvl: 1, hw: "mBot (mCore)", lang: LANG1,
  d: NOTE1 + "Αναβοσβήνει τα δύο RGB LED της πλακέτας σε διάφορα χρώματα και παίζει μελωδία από το buzzer.",
  code: R`#include <MeMCore.h>

MeRGBLed led(0, 30);
MeBuzzer buzzer;

void color(int r, int g, int b) {
  led.setColor(0, r, g, b);   // 0 = και τα δύο LED
  led.show();
}

void setup() {
  led.setpin(13);             // τα RGB LED του mCore είναι στο pin 13
  int notes[] = {262, 330, 392, 523};
  for (int i = 0; i < 4; i++) {
    buzzer.tone(notes[i], 200);
  }
}

void loop() {
  color(60, 0, 0);  delay(400);
  color(0, 60, 0);  delay(400);
  color(0, 0, 60);  delay(400);
  led.setColor(1, 60, 60, 0);   // μόνο το LED 1
  led.setColor(2, 0, 60, 60);   // μόνο το LED 2
  led.show();
  delay(400);
}` },
{ cat: "Βασικά", t: "mBot: κουμπί πλακέτας για εκκίνηση", lvl: 1, hw: "mBot (mCore)", lang: LANG1,
  d: NOTE1 + "Το mBot περιμένει να πατηθεί το κουμπί της πλακέτας, προχωρά 2 δευτερόλεπτα και σταματά. Το ίδιο μοτίβο χρησιμεύει σε κάθε διαγωνισμό.",
  code: R`#include <MeMCore.h>

` + MOVE + BUTTON + R`
void setup() {}

void loop() {
  waitButton();
  forward(150);
  delay(2000);
  stopMotors();
}` },
{ cat: "Κίνηση", t: "mBot: μπροστά, πίσω, στροφές", lvl: 1, hw: "mBot (μοτέρ M1, M2)", lang: LANG1,
  d: NOTE1 + "Οι βασικές κινήσεις. Αν το mBot στρίβει όταν πάει ευθεία, μείωσε λίγο την ταχύτητα του γρήγορου τροχού.",
  code: R`#include <MeMCore.h>

` + MOVE + R`
void setup() {
  forward(150);   delay(1500);
  stopMotors();   delay(500);
  backward(150);  delay(1500);
  turnLeft(120);  delay(600);
  turnRight(120); delay(600);
  stopMotors();
}

void loop() {}` },
{ cat: "Κίνηση", t: "mBot: τετράγωνο", lvl: 1, hw: "mBot", lang: LANG1,
  d: NOTE1 + "Σχεδιάζει τετράγωνο. Ρύθμισε τον χρόνο στροφής TURN_MS μέχρι να γίνεται ακριβώς 90°.",
  code: R`#include <MeMCore.h>

` + MOVE + R`
const int TURN_MS = 480;

void setup() {
  for (int i = 0; i < 4; i++) {
    forward(150);
    delay(1200);
    stopMotors();
    delay(200);
    turnRight(120);
    delay(TURN_MS);
    stopMotors();
    delay(200);
  }
}

void loop() {}` },
{ cat: "Αισθητήρες", t: "mBot: υπερηχητικός στο Serial", lvl: 1, hw: "mBot + Me Ultrasonic στη θύρα 3", lang: LANG1,
  d: NOTE1 + "Τυπώνει την απόσταση σε cm στο Serial Monitor (115200). Τα χρώματα των LED αλλάζουν ανάλογα με την απόσταση.",
  code: R`#include <MeMCore.h>

MeUltrasonicSensor ultra(PORT_3);
MeRGBLed led(0, 30);

void setup() {
  Serial.begin(115200);
  led.setpin(13);
}

void loop() {
  double d = ultra.distanceCm();
  Serial.print("Απόσταση: ");
  Serial.print(d);
  Serial.println(" cm");
  if (d < 10)      led.setColor(0, 80, 0, 0);    // κόκκινο
  else if (d < 30) led.setColor(0, 80, 50, 0);   // πορτοκαλί
  else             led.setColor(0, 0, 80, 0);    // πράσινο
  led.show();
  delay(100);
}` },
{ cat: "Αισθητήρες", t: "mBot: αισθητήρας φωτός", lvl: 1, hw: "mBot (αισθητήρας φωτός πάνω στην πλακέτα)", lang: LANG1,
  d: NOTE1 + "Όταν σκοτεινιάσει ανάβουν τα φώτα, σαν τα αυτόματα φώτα του αυτοκινήτου.",
  code: R`#include <MeMCore.h>

MeLightSensor light(PORT_6);   // ενσωματωμένος αισθητήρας φωτός
MeRGBLed led(0, 30);

void setup() {
  Serial.begin(115200);
  led.setpin(13);
}

void loop() {
  int v = light.read();          // 0 (σκοτάδι) ... 1023 (πολύ φως)
  Serial.println(v);
  if (v < 200) led.setColor(0, 100, 100, 100);
  else         led.setColor(0, 0, 0, 0);
  led.show();
  delay(200);
}` },
{ cat: "Αισθητήρες", t: "mBot: δοκιμή αισθητήρα γραμμής", lvl: 1, hw: "mBot + Me Line Follower στη θύρα 2", lang: LANG1,
  d: NOTE1 + "Δείχνει τι «βλέπουν» οι δύο αισθητήρες γραμμής. Το LED στην πλευρά που βλέπει μαύρο ανάβει μπλε.",
  code: R`#include <MeMCore.h>

MeLineFollower line(PORT_2);
MeRGBLed led(0, 30);

void setup() {
  Serial.begin(115200);
  led.setpin(13);
}

void loop() {
  int s = line.readSensors();
  // S1 = αριστερός, S2 = δεξιός, IN = πάνω στη μαύρη γραμμή
  bool leftBlack  = (s == S1_IN_S2_IN || s == S1_IN_S2_OUT);
  bool rightBlack = (s == S1_IN_S2_IN || s == S1_OUT_S2_IN);
  led.setColor(2, 0, 0, leftBlack ? 80 : 0);
  led.setColor(1, 0, 0, rightBlack ? 80 : 0);
  led.show();
  Serial.print(leftBlack); Serial.print(" "); Serial.println(rightBlack);
  delay(100);
}` },
{ cat: "Line Follower", t: "mBot: ακόλουθος γραμμής", lvl: 1, hw: "mBot + Line Follower (θύρα 2), πίστα με μαύρη γραμμή", lang: LANG1,
  d: NOTE1 + "Ο κλασικός ακόλουθος γραμμής του mBot. Θυμάται προς τα πού χάθηκε η γραμμή για να γυρίσει να την ξαναβρεί.",
  code: R`#include <MeMCore.h>

` + MOVE + R`
MeLineFollower line(PORT_2);
const int SPEED = 120;
int lastSeen = 0;   // -1 αριστερά, 1 δεξιά

void setup() {}

void loop() {
  switch (line.readSensors()) {
    case S1_IN_S2_IN:              // και οι δύο στη γραμμή
      forward(SPEED);
      break;
    case S1_IN_S2_OUT:             // η γραμμή είναι αριστερά
      setMotors(0, SPEED);
      lastSeen = -1;
      break;
    case S1_OUT_S2_IN:             // η γραμμή είναι δεξιά
      setMotors(SPEED, 0);
      lastSeen = 1;
      break;
    case S1_OUT_S2_OUT:            // χάθηκε: γύρνα προς την τελευταία πλευρά
      if (lastSeen < 0) turnLeft(SPEED);
      else turnRight(SPEED);
      break;
  }
}` },
{ cat: "Obstacle Avoidance", t: "mBot: αποφυγή εμποδίων", lvl: 1, hw: "mBot + Ultrasonic (θύρα 3)", lang: LANG1,
  d: NOTE1 + "Κινείται μπροστά. Όταν βρει εμπόδιο κάτω από 15 cm κάνει πίσω και στρίβει τυχαία αριστερά ή δεξιά.",
  code: R`#include <MeMCore.h>

` + MOVE + R`
MeUltrasonicSensor ultra(PORT_3);

void setup() {
  randomSeed(analogRead(A0));
}

void loop() {
  double d = ultra.distanceCm();
  if (d > 0 && d < 15) {
    backward(150);
    delay(400);
    if (random(2) == 0) turnLeft(150);
    else turnRight(150);
    delay(random(300, 600));
  } else {
    forward(170);
  }
  delay(20);
}` },
{ cat: "Obstacle Avoidance", t: "mBot: ακολούθησε το χέρι μου", lvl: 2, hw: "mBot + Ultrasonic (θύρα 3)", lang: LANG1,
  d: NOTE1 + "Κρατά απόσταση περίπου 15 cm από το χέρι σου: πλησιάζει όταν απομακρύνεσαι και κάνει πίσω όταν πλησιάζεις. Η ταχύτητα είναι ανάλογη της απόστασης.",
  code: R`#include <MeMCore.h>

` + MOVE + R`
MeUltrasonicSensor ultra(PORT_3);
const int TARGET = 15;   // cm
const int GAIN = 12;

void setup() {}

void loop() {
  double d = ultra.distanceCm();
  if (d > 60) {
    stopMotors();          // δεν βλέπει χέρι
  } else {
    int speed = constrain((int)((d - TARGET) * GAIN), -200, 200);
    if (abs(speed) < 40) speed = 0;   // νεκρή ζώνη
    forward(speed);
  }
  delay(30);
}` },
{ cat: "Τηλεχειρισμός", t: "mBot: οδήγηση με το IR τηλεκοντρόλ", lvl: 2, hw: "mBot + το λευκό IR τηλεκοντρόλ της Makeblock", lang: LANG1,
  d: NOTE1 + "Βέλη = κίνηση, A/B/C = αργή/μεσαία/γρήγορη ταχύτητα, ρυθμίσεις (γρανάζι) = stop. Όταν αφήνεις το κουμπί σταματά.",
  code: R`#include <MeMCore.h>

` + MOVE + R`
MeIR ir;
int speed = 150;

void setup() {
  ir.begin();
}

void loop() {
  ir.loop();
  if (ir.keyPressed(IR_BUTTON_UP))         forward(speed);
  else if (ir.keyPressed(IR_BUTTON_DOWN))  backward(speed);
  else if (ir.keyPressed(IR_BUTTON_LEFT))  turnLeft(speed);
  else if (ir.keyPressed(IR_BUTTON_RIGHT)) turnRight(speed);
  else stopMotors();

  if (ir.keyPressed(IR_BUTTON_A)) speed = 100;
  if (ir.keyPressed(IR_BUTTON_B)) speed = 170;
  if (ir.keyPressed(IR_BUTTON_C)) speed = 255;
}` },
{ cat: "Sumo", t: "mBot: sumo", lvl: 3, hw: "mBot + Ultrasonic (θύρα 3) + Line Follower (θύρα 2), ρινγκ μαύρο με άσπρη άκρη", lang: LANG1,
  d: NOTE1 + "Πατάς το κουμπί και περιμένει 3 δευτερόλεπτα. Μετά ψάχνει τον αντίπαλο, του επιτίθεται και μένει μέσα στο ρινγκ. Η άσπρη άκρη διαβάζεται ως OUT.",
  code: R`#include <MeMCore.h>

` + MOVE + BUTTON + R`
MeUltrasonicSensor ultra(PORT_3);
MeLineFollower line(PORT_2);
MeRGBLed led(0, 30);

void setup() {
  led.setpin(13);
  waitButton();
  for (int i = 3; i > 0; i--) {   // αντίστροφη μέτρηση 3 δευτ.
    led.setColor(0, 80, 0, 0); led.show(); delay(500);
    led.setColor(0, 0, 0, 0);  led.show(); delay(500);
  }
}

void loop() {
  int s = line.readSensors();
  if (s != S1_IN_S2_IN) {          // κάποιος αισθητήρας είδε την άσπρη άκρη
    backward(255);
    delay(350);
    if (s == S1_OUT_S2_IN) turnRight(200);
    else turnLeft(200);
    delay(300);
  } else if (ultra.distanceCm() < 40) {
    forward(255);                  // επίθεση
  } else {
    setMotors(130, -130);          // αναζήτηση
  }
}` },
{ cat: "Αυτοματισμοί", t: "mBot: αισθητήρας στάθμευσης", lvl: 2, hw: "mBot + Ultrasonic (θύρα 3)", lang: LANG1,
  d: NOTE1 + "Όσο πλησιάζει το εμπόδιο, τόσο πιο γρήγορα χτυπάει το buzzer και τόσο πιο κόκκινα γίνονται τα φώτα.",
  code: R`#include <MeMCore.h>

MeUltrasonicSensor ultra(PORT_3);
MeBuzzer buzzer;
MeRGBLed led(0, 30);

void setup() {
  led.setpin(13);
}

void loop() {
  int d = (int)ultra.distanceCm();
  if (d < 50) {
    int red = map(constrain(d, 5, 50), 5, 50, 100, 0);
    led.setColor(0, red, 100 - red, 0);
    led.show();
    buzzer.tone(1000, 60);
    delay(map(constrain(d, 5, 50), 5, 50, 20, 500));
  } else {
    led.setColor(0, 0, 30, 0);
    led.show();
    delay(100);
  }
}` },
{ cat: "Αυτοματισμοί", t: "mBot: ρομπότ που ψάχνει το φως", lvl: 2, hw: "mBot (αισθητήρας φωτός πλακέτας)", lang: LANG1,
  d: NOTE1 + "Περιστρέφεται μέχρι να βρει φως (π.χ. φακό κινητού) και κινείται προς αυτό. Στο σκοτάδι σταματά και ανάβει μπλε.",
  code: R`#include <MeMCore.h>

` + MOVE + R`
MeLightSensor light(PORT_6);
MeRGBLed led(0, 30);
const int BRIGHT = 600;

void setup() {
  led.setpin(13);
}

void loop() {
  int v = light.read();
  if (v > BRIGHT) {
    led.setColor(0, 80, 80, 0);
    forward(150);
  } else if (v > 150) {
    led.setColor(0, 0, 0, 0);
    turnRight(100);                // ψάξε προς τα πού είναι το φως
  } else {
    led.setColor(0, 0, 0, 80);
    stopMotors();
  }
  led.show();
  delay(30);
}` },
/* ---------------- mBot2 (CyberPi) ---------------- */
{ cat: "mBot2 (CyberPi)", t: "mBot2: οθόνη, φώτα, ήχος", lvl: 1, hw: "mBot2 με CyberPi", lang: LANG2,
  d: NOTE2 + "Γράφει στην οθόνη του CyberPi, ανάβει τα 5 RGB LED και παίζει νότες.",
  code: R`import cyberpi
import time

cyberpi.console.clear()
cyberpi.console.println("Hello Robotzedes!")
for color in [(255, 0, 0), (0, 255, 0), (0, 0, 255)]:
    cyberpi.led.on(color[0], color[1], color[2])
    cyberpi.audio.play_tone(440, 0.2)
    time.sleep(0.3)
cyberpi.led.off()` },
{ cat: "mBot2 (CyberPi)", t: "mBot2: κινήσεις σε cm και μοίρες", lvl: 1, hw: "mBot2", lang: LANG2,
  d: NOTE2 + "Το mBot2 έχει encoder μοτέρ, οπότε κινείται με ακρίβεια σε εκατοστά και μοίρες. Ξεκινά όταν πατήσεις το κουμπί A.",
  code: R`import cyberpi
import mbot2
import time

cyberpi.console.println("Pata to A")
while not cyberpi.controller.is_press("a"):
    time.sleep(0.05)

mbot2.straight(30)       # 30 cm μπροστά
mbot2.turn(90)           # 90° δεξιά
mbot2.straight(-15)      # 15 cm πίσω
mbot2.turn(-90)          # 90° αριστερά
mbot2.forward(50, 1)     # 50 RPM για 1 δευτερόλεπτο
mbot2.EM_stop()` },
{ cat: "mBot2 (CyberPi)", t: "mBot2: τετράγωνο", lvl: 1, hw: "mBot2", lang: LANG2,
  d: NOTE2 + "Ακριβές τετράγωνο 40 cm χάρη στους encoders.",
  code: R`import mbot2
import cyberpi

for i in range(4):
    cyberpi.led.on(0, 0, 255)
    mbot2.straight(40)
    cyberpi.led.on(255, 0, 0)
    mbot2.turn(90)
cyberpi.led.off()
cyberpi.audio.play_tone(880, 0.3)` },
{ cat: "mBot2 (CyberPi)", t: "mBot2: αποφυγή εμποδίων", lvl: 2, hw: "mBot2 + Ultrasonic 2 (έρχεται συνδεδεμένος)", lang: LANG2,
  d: NOTE2 + "Κινείται μπροστά και όταν βρει εμπόδιο κάτω από 15 cm κάνει πίσω και στρίβει. Το B σταματά το πρόγραμμα.",
  code: R`import cyberpi
import mbot2
import mbuild
import random
import time

while not cyberpi.controller.is_press("b"):
    d = mbuild.ultrasonic2.get(1)          # απόσταση σε cm
    cyberpi.console.clear()
    cyberpi.console.println(str(d) + " cm")
    if d < 15:
        mbot2.EM_stop()
        mbot2.straight(-10)
        mbot2.turn(random.choice([-100, 100]))
    else:
        mbot2.forward(60)
    time.sleep(0.05)
mbot2.EM_stop()` },
{ cat: "mBot2 (CyberPi)", t: "mBot2: ακόλουθος γραμμής (αναλογικός)", lvl: 2, hw: "mBot2 + Quad RGB sensor (έρχεται συνδεδεμένος)", lang: LANG2,
  d: NOTE2 + "Ο αισθητήρας 4 ματιών δίνει την απόκλιση από τη γραμμή (-100 έως 100). Η στροφή είναι ανάλογη της απόκλισης. Αν φεύγει ανάποδα, άλλαξε το πρόσημο του KP.",
  code: R`import cyberpi
import mbot2
import mbuild
import time

BASE = 40      # ισχύς βάσης (%)
KP = 0.5

cyberpi.console.println("A = start, B = stop")
while not cyberpi.controller.is_press("a"):
    time.sleep(0.05)

while not cyberpi.controller.is_press("b"):
    offset = mbuild.quad_rgb_sensor.get_offset_track(1)   # -100 ... 100
    turn = KP * offset
    # Το δεξί μοτέρ θέλει αρνητική τιμή για να πάει μπροστά
    mbot2.drive_power(BASE + turn, -(BASE - turn))
    time.sleep(0.01)
mbot2.EM_stop()` },
{ cat: "mBot2 (CyberPi)", t: "mBot2: τηλεχειρισμός με το joystick του CyberPi", lvl: 2, hw: "mBot2", lang: LANG2,
  d: NOTE2 + "Οδηγείς με το μικρό joystick πάνω στο CyberPi: πάνω/κάτω κίνηση, αριστερά/δεξιά στροφή, πάτημα joystick = stop.",
  code: R`import cyberpi
import mbot2
import time

SPEED = 60
while True:
    if cyberpi.controller.is_press("up"):
        mbot2.drive_speed(SPEED, -SPEED)
    elif cyberpi.controller.is_press("down"):
        mbot2.drive_speed(-SPEED, SPEED)
    elif cyberpi.controller.is_press("left"):
        mbot2.drive_speed(-SPEED, -SPEED)
    elif cyberpi.controller.is_press("right"):
        mbot2.drive_speed(SPEED, SPEED)
    else:
        mbot2.EM_stop()
    time.sleep(0.02)` },
{ cat: "mBot2 (CyberPi)", t: "mBot2: αντίδραση στον ήχο", lvl: 1, hw: "mBot2 (μικρόφωνο CyberPi)", lang: LANG2,
  d: NOTE2 + "Χτυπάς παλαμάκια και το mBot2 κάνει μια στροφή 360°. Η ένταση του ήχου φαίνεται στην οθόνη.",
  code: R`import cyberpi
import mbot2
import time

THRESHOLD = 60
while True:
    loud = cyberpi.get_loudness()        # 0 ... 100
    cyberpi.console.clear()
    cyberpi.console.println("Loud: " + str(loud))
    if loud > THRESHOLD:
        cyberpi.led.on(255, 0, 255)
        mbot2.turn(360)
        cyberpi.led.off()
    time.sleep(0.1)` },
];
S.forEach(s => { s.p = "mbot"; });
window.SNIPPETS = (window.SNIPPETS || []).concat(S);
})();
