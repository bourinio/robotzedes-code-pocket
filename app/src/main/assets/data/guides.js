/* Οδηγοί: pinouts, συνδεσμολογίες, θεωρία */
(function () {
const R = String.raw;
const S = [
{ cat: "Pinouts", t: "Arduino UNO: pins με μια ματιά", lvl: 1, hw: "Arduino UNO R3",
  d: "Ποια pins κάνουν τι. Τα pins με ~ υποστηρίζουν PWM (analogWrite).",
  code: R`ΨΗΦΙΑΚΑ      D0–D13   (D0 RX / D1 TX: τα χρησιμοποιεί το USB — απόφυγέ τα)
PWM  (~)     D3, D5, D6, D9, D10, D11
ΑΝΑΛΟΓΙΚΑ    A0–A5    (0–1023, 0–5V)  — δουλεύουν και ως ψηφιακά
I2C          SDA = A4, SCL = A5
SPI          D10 SS, D11 MOSI, D12 MISO, D13 SCK
INTERRUPTS   D2, D3   (attachInterrupt)
LED_BUILTIN  D13
ΤΡΟΦΟΔΟΣΙΑ   5V, 3.3V (max 50 mA), GND, VIN (7–12V)

Μέγιστο ρεύμα ανά pin: 20 mA (απόλυτο όριο 40 mA)
Μοτέρ ΠΟΤΕ απευθείας σε pin → πάντα μέσω driver (L298N, L9110S, TB6612)
Servo: D9/D10 χάνουν PWM όταν χρησιμοποιείς τη βιβλιοθήκη Servo` },
{ cat: "Pinouts", t: "micro:bit: pins", lvl: 1, hw: "micro:bit V1/V2",
  d: "Τα μεγάλα pins 0, 1, 2 είναι για κροκοδειλάκια. Τα υπόλοιπα θέλουν edge connector / breakout.",
  code: R`P0, P1, P2   αναλογική είσοδος/έξοδος, αφή, PWM  (τα μεγάλα δαχτυλίδια)
3V, GND      τροφοδοσία 3.3V (όχι 5V!)
P3, P4, P6, P7, P10   μοιράζονται με την οθόνη LED (display.off() για χρήση)
P5           κουμπί A
P11          κουμπί B
P8, P9, P12, P16      ελεύθερα ψηφιακά
P13 SCK, P14 MISO, P15 MOSI  (SPI)
P19 SCL, P20 SDA     (I2C — εσωτερικά: επιταχυνσιόμετρο/πυξίδα)
V2: ηχείο ενσωματωμένο, μικρόφωνο, λογότυπο αφής (pin_logo)

Αναλογικά: read_analog() 0–1023, write_analog() 0–1023` },
{ cat: "Pinouts", t: "Maqueen: τι είναι συνδεδεμένο πού", lvl: 1, hw: "DFRobot Maqueen Lite",
  d: "Χρήσιμο για MicroPython χωρίς επέκταση ή για επεκτάσεις του ρομπότ.",
  code: R`Μοτέρ            I2C διεύθυνση 0x10
                 reg 0x00 = αριστερό M1 [κατεύθυνση 0/1, ταχύτητα 0-255]
                 reg 0x02 = δεξί M2
Servo            reg 0x14 = S1, reg 0x15 = S2  (γωνία 0-180)
Υπερηχητικός     TRIG = P1, ECHO = P2
Line αριστερός   P13
Line δεξιός      P14
LED αριστερό     P8
LED δεξί         P12
Buzzer           P0
NeoPixel (4)     P15
IR δέκτης        P16
Τροφοδοσία       3 x AAA (4.5V) — ο διακόπτης ON στο πίσω μέρος` },
{ cat: "Pinouts", t: "LEGO EV3: θύρες & αισθητήρες", lvl: 1, hw: "EV3 Brick",
  d: "Σύμβαση συνδέσεων που χρησιμοποιούν όλα τα παραδείγματα EV3 της εφαρμογής.",
  code: R`Θύρες μοτέρ      A, B, C, D        (Port.A ... Port.D)
Θύρες αισθητήρων 1, 2, 3, 4        (Port.S1 ... Port.S4)

Σύμβαση εφαρμογής:
  B = αριστερό μοτέρ, C = δεξί μοτέρ, A/D = εργαλεία
  S1 Touch, S2 Gyro, S3 Color, S4 Ultrasonic

Αισθητήρες (Pybricks):
  TouchSensor.pressed()          True/False
  ColorSensor.color()            Color.RED ... ή None
  ColorSensor.reflection()       0–100 %
  UltrasonicSensor.distance()    mm
  GyroSensor.angle() / speed()   μοίρες, μοίρες/s
Motor: run(speed) run_angle(speed, deg) run_time(speed, ms)
       run_target(speed, deg) stop() angle() reset_angle(0)

Εγκατάσταση: κάρτα microSD με εικόνα «EV3 MicroPython» +
VS Code με επέκταση «LEGO MINDSTORMS EV3 MicroPython»` },
{ cat: "Pinouts", t: "LEGO SPIKE Prime: θύρες & API", lvl: 1, hw: "SPIKE Prime Hub",
  d: "Οι 6 θύρες A–F δέχονται είτε μοτέρ είτε αισθητήρα. Βασικές εντολές SPIKE 3 Python.",
  code: R`Θύρες: port.A ... port.F (μοτέρ ή αισθητήρες)
Σύμβαση εφαρμογής: A αριστερό, B δεξί, C color, D distance, E force

Όλα μέσα σε:  async def main(): ...   runloop.run(main())
await = περίμενε να τελειώσει η κίνηση

motor.run(port, vel)               motor.stop(port)
await motor.run_for_degrees(port, deg, vel)
await motor.run_for_time(port, ms, vel)
motor_pair.pair(motor_pair.PAIR_1, port.A, port.B)
motor_pair.move(PAIR_1, steering, velocity=)
await motor_pair.move_for_degrees(PAIR_1, deg, steering, velocity=)
motor_pair.move_tank(PAIR_1, left_vel, right_vel)
color_sensor.color(port) / reflection(port)
distance_sensor.distance(port)     mm, -1 = τίποτα
force_sensor.pressed(port) / force(port)
motion_sensor.tilt_angles()        (yaw, pitch, roll) σε δέκατα μοίρας
await runloop.sleep_ms(ms)    await runloop.until(συνάρτηση)` },
{ cat: "Συνδεσμολογίες", t: "L298N: σύνδεση μοτέρ", lvl: 1, hw: "L298N + 2 μοτέρ + μπαταρία",
  d: "Η πιο συνηθισμένη σύνδεση για ρομπότ με 2 τροχούς. Ίδια pins με όλα τα Arduino παραδείγματα της εφαρμογής.",
  code: R`L298N        Arduino UNO
-----        -----------
ENA   ─────  D5  (PWM)   ← βγάλε το jumper ENA
IN1   ─────  D7
IN2   ─────  D8
IN3   ─────  D9
IN4   ─────  D10
ENB   ─────  D6  (PWM)   ← βγάλε το jumper ENB
GND   ─────  GND   ← ΚΟΙΝΗ ΓΕΙΩΣΗ (απαραίτητη!)
12V   ─────  + μπαταρίας (7–12V, π.χ. 2x18650)
5V    ─────  5V Arduino (μόνο αν μπαταρία ≤12V και jumper 5V στη θέση του)

OUT1/OUT2 → αριστερό μοτέρ    OUT3/OUT4 → δεξί μοτέρ
Το μοτέρ γυρνά ανάποδα; Αντάλλαξε τα 2 καλώδιά του.
Το L298N «τρώει» ~2V: με 4 μπαταρίες AA τα μοτέρ είναι αργά.` },
{ cat: "Συνδεσμολογίες", t: "HC-05 / HC-06 Bluetooth", lvl: 1, hw: "HC-05 + Arduino UNO",
  d: "Το RX του HC-05 θέλει 3.3V: διαιρέτης τάσης με 1kΩ και 2kΩ.",
  code: R`HC-05        Arduino
-----        -------
VCC   ─────  5V
GND   ─────  GND
TXD   ─────  D2  (SoftwareSerial RX)
RXD   ─┬───  D3 μέσω 1kΩ
       └───  2kΩ προς GND      (5V → ~3.3V)

Γιατί όχι D0/D1; Τα χρησιμοποιεί το USB:
αν βάλεις εκεί το HC-05, βγάλ' το πριν το upload.

Σύζευξη στο κινητό: όνομα HC-05, κωδικός 1234 ή 0000
Baud: 9600 (κανονική λειτουργία), 38400 (AT mode)
LED: γρήγορο αναβόσβημα = αναμονή, αργό διπλό = συνδεδεμένο` },
{ cat: "Συνδεσμολογίες", t: "Υπολογισμός αντίστασης LED", lvl: 1, hw: "LED + αντίσταση",
  d: "Νόμος του Ohm για LED: R = (Vπηγής − V_LED) / I. Υπάρχει και αριθμομηχανή στην καρτέλα «Εργαλεία».",
  code: R`R = (Vs − Vf) / I

Vs = τάση πηγής (5V Arduino, 3.3V micro:bit/ESP32/Pico)
Vf = πτώση τάσης LED:
     κόκκινο/κίτρινο ≈ 2.0V, πράσινο ≈ 2.2V (παλιά) / 3.0V,
     μπλε/άσπρο ≈ 3.0–3.2V
I  = ρεύμα (συνήθως 0.010–0.020 A)

Παράδειγμα: Arduino 5V, κόκκινο LED, 15 mA
R = (5 − 2) / 0.015 = 200Ω → πάρε την επόμενη τυπική: 220Ω

Τυπικές τιμές: 100, 150, 220, 330, 470, 680, 1k, 2.2k, 4.7k, 10k

Χρωματικός κώδικας: Μαύρο0 Καφέ1 Κόκκινο2 Πορτοκαλί3 Κίτρινο4
Πράσινο5 Μπλε6 Μωβ7 Γκρι8 Άσπρο9   (3η λωρίδα = πλήθος μηδενικών)
220Ω = Κόκκινο Κόκκινο Καφέ,  10kΩ = Καφέ Μαύρο Πορτοκαλί` },
{ cat: "Θεωρία", t: "PID: πώς ρυθμίζω Kp, Ki, Kd", lvl: 3, hw: "Οποιοδήποτε ρομπότ line follower",
  d: "Βήμα-βήμα μέθοδος ρύθμισης για ακόλουθο γραμμής.",
  code: R`error      = θέση_αισθητήρα − στόχος
integral   = integral + error
derivative = error − προηγούμενο_error
διόρθωση   = Kp·error + Ki·integral + Kd·derivative
αριστερό   = βάση + διόρθωση,   δεξί = βάση − διόρθωση

ΒΗΜΑΤΑ ΡΥΘΜΙΣΗΣ
1. Ki = 0, Kd = 0, χαμηλή ταχύτητα βάσης.
2. Αύξανε Kp μέχρι το ρομπότ να ακολουθεί αλλά να ταλαντεύεται (zig-zag).
3. Αύξανε Kd μέχρι να «ηρεμήσει» η ταλάντευση (συνήθως Kd ≈ 5–20 × Kp).
4. Αύξησε την ταχύτητα βάσης· επανέλαβε 2–3.
5. Ki μόνο αν το ρομπότ μένει σταθερά στη μία πλευρά (πολύ μικρό, π.χ. 0.001).

ΣΥΜΠΤΩΜΑΤΑ
Χάνει τη γραμμή στις στροφές  → μεγαλύτερο Kp ή μικρότερη ταχύτητα
Ταλαντεύεται στις ευθείες     → μικρότερο Kp ή μεγαλύτερο Kd
Τρέμει / «νευρικό»            → μικρότερο Kd
Ρυθμός βρόχου σταθερός (π.χ. 5–10 ms) — αλλιώς αλλάζουν οι τιμές!` },
{ cat: "Θεωρία", t: "Απόσταση από περιστροφές τροχού", lvl: 1, hw: "Οποιοδήποτε ρομπότ με τροχούς",
  d: "Πόσες μοίρες πρέπει να γυρίσει ο τροχός για Χ cm. Υπάρχει και αριθμομηχανή στα «Εργαλεία».",
  code: R`Περιφέρεια τροχού  C = π × διάμετρος
Μοίρες για d cm     = d / C × 360

LEGO τροχοί:
  SPIKE μικρός   5.6 cm  → C = 17.6 cm → 20.5°/cm
  SPIKE μεγάλος  8.8 cm  → C = 27.6 cm → 13.0°/cm
  EV3 εκπαιδευτικό σετ 5.6 cm (56 mm)

Στροφή επί τόπου (tank turn) κατά θ μοίρες:
  μοίρες τροχού = (απόσταση_τροχών / διάμετρο_τροχού) × θ
  π.χ. 11.2 cm / 5.6 cm × 90° = 180° σε κάθε τροχό (αντίθετες φορές)` },
{ cat: "Θεωρία", t: "Συχνά λάθη & λύσεις", lvl: 1, hw: "Όλες οι πλατφόρμες",
  d: "Τα προβλήματα που εμφανίζονται πιο συχνά στην τάξη.",
  code: R`ARDUINO
• «avrdude: not in sync» → λάθος θύρα/πλακέτα ή κάτι στο D0/D1
• Τα μοτέρ δεν γυρνούν, το LED του L298N ανάβει → λείπει η κοινή GND
• Reset όταν ξεκινούν τα μοτέρ → αδύναμες μπαταρίες, χωριστή τροφοδοσία
• Ο HC-SR04 δίνει 0 → λάθος TRIG/ECHO ή έλλειψη 5V
• SoftwareSerial + Servo μαζί «τρεμοπαίζουν» → χρησιμοποίησε άλλα pins

MICRO:BIT / MAQUEEN
• Το ρομπότ στρίβει μόνο του → διαφορετικά μοτέρ: μείωσε την ταχύτητα του γρήγορου
• Δεν βρίσκει γραμμή → ύψος αισθητήρα, άλλαξε τη σταθερά BLACK 0 ↔ 1
• Radio δεν δουλεύει → ίδιο radio.set_group / config(group=) και στα δύο

LEGO
• EV3: αργή εκκίνηση προγράμματος → φυσιολογικό στο MicroPython (~10s)
• SPIKE: «SyntaxError: await» → το await μόνο μέσα σε async def
• Gyro «ολισθαίνει» → κράτα το ρομπότ ακίνητο όταν ξεκινά
• Ανακριβείς κινήσεις → φόρτισε μπαταρία, μέτρα σωστά τη διάμετρο τροχού` },
];
S.forEach(s => { s.p = "guides"; s.lang = "Οδηγός"; });
window.SNIPPETS = (window.SNIPPETS || []).concat(S);
})();
