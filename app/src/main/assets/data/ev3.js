/* LEGO MINDSTORMS EV3 — EV3 MicroPython (Pybricks v2.0) */
(function () {
const R = String.raw;
const HEAD = R`#!/usr/bin/env pybricks-micropython
from pybricks.hubs import EV3Brick
from pybricks.ev3devices import Motor, TouchSensor, ColorSensor, UltrasonicSensor, GyroSensor
from pybricks.parameters import Port, Stop, Direction, Button, Color
from pybricks.tools import wait, StopWatch
from pybricks.robotics import DriveBase

ev3 = EV3Brick()
`;
const DRIVE = R`left_motor = Motor(Port.B)
right_motor = Motor(Port.C)
# Διάμετρος τροχού και απόσταση τροχών σε mm (μέτρησε το δικό σου ρομπότ)
robot = DriveBase(left_motor, right_motor, wheel_diameter=55.5, axle_track=104)
`;
const S = [
{ cat: "Βασικά", t: "Hello EV3: οθόνη, ήχος, φως", lvl: 1, hw: "EV3 Brick",
  d: "Το πρώτο πρόγραμμα: γράφει στην οθόνη, κάνει μπιπ, μιλάει και αλλάζει το χρώμα των φώτων του brick.",
  code: HEAD + R`
ev3.screen.clear()
ev3.screen.print("Hello")
ev3.screen.print("Robotzedes!")
ev3.speaker.beep()
ev3.speaker.say("Hello")

for c in [Color.RED, Color.ORANGE, Color.GREEN]:
    ev3.light.on(c)
    wait(700)
ev3.light.off()
wait(2000)` },
{ cat: "Βασικά", t: "Κουμπιά του brick", lvl: 1, hw: "EV3 Brick",
  d: "Διαβάζει τα κουμπιά πάνω στο brick και δείχνει ποιο πατήθηκε. Το κεντρικό κουμπί τερματίζει.",
  code: HEAD + R`
ev3.screen.print("Press a button")
while True:
    pressed = ev3.buttons.pressed()
    if Button.LEFT in pressed:
        ev3.screen.print("LEFT")
        ev3.light.on(Color.RED)
    elif Button.RIGHT in pressed:
        ev3.screen.print("RIGHT")
        ev3.light.on(Color.GREEN)
    elif Button.UP in pressed:
        ev3.speaker.beep(800, 100)
    elif Button.DOWN in pressed:
        ev3.speaker.beep(300, 100)
    elif Button.CENTER in pressed:
        break
    wait(150)
ev3.light.off()` },
{ cat: "Βασικά", t: "Μελωδία με νότες", lvl: 1, hw: "EV3 Brick",
  d: "Παίζει μια μικρή μελωδία. Κάθε νότα γράφεται ως Νότα+Οκτάβα/διάρκεια.",
  code: HEAD + R`
ev3.speaker.set_volume(80)
melody = ["C4/4", "C4/4", "G4/4", "G4/4", "A4/4", "A4/4", "G4/2",
          "F4/4", "F4/4", "E4/4", "E4/4", "D4/4", "D4/4", "C4/2"]
ev3.speaker.play_notes(melody, tempo=120)` },
{ cat: "Βασικά", t: "Χρονόμετρο (StopWatch)", lvl: 1, hw: "EV3 Brick",
  d: "Μετράει τα δευτερόλεπτα στην οθόνη μέχρι να πατηθεί το κεντρικό κουμπί.",
  code: HEAD + R`
watch = StopWatch()
while Button.CENTER not in ev3.buttons.pressed():
    ev3.screen.clear()
    ev3.screen.draw_text(20, 50, "Time: {:.1f} s".format(watch.time() / 1000))
    wait(100)
ev3.speaker.beep()` },
{ cat: "Μοτέρ", t: "Ένα μοτέρ: γωνία, χρόνος, συνεχής", lvl: 1, hw: "Large Motor στη θύρα A",
  d: "Οι τρεις βασικοί τρόποι να κινήσεις ένα μοτέρ: για μοίρες, για χρόνο και συνεχόμενα μέχρι stop.",
  code: HEAD + R`
motor = Motor(Port.A)

# 1) Γύρνα 360 μοίρες με 500 μοίρες/δευτ.
motor.run_angle(500, 360)
wait(500)

# 2) Γύρνα για 2 δευτερόλεπτα ανάποδα
motor.run_time(-500, 2000)
wait(500)

# 3) Συνεχής κίνηση και stop
motor.run(300)
wait(1500)
motor.stop()

# 4) Πήγαινε σε απόλυτη θέση
motor.reset_angle(0)
motor.run_target(400, 90, then=Stop.HOLD)
ev3.screen.print("Angle:", motor.angle())
wait(2000)` },
{ cat: "Μοτέρ", t: "Medium motor: δαγκάνα (gripper)", lvl: 2, hw: "Medium Motor στη θύρα A",
  d: "Ανοίγει και κλείνει μια δαγκάνα. Το run_until_stalled σταματά όταν το μοτέρ μπλοκάρει (έπιασε το αντικείμενο).",
  code: HEAD + R`
gripper = Motor(Port.A)

def close_gripper():
    gripper.run_until_stalled(-300, then=Stop.HOLD, duty_limit=50)

def open_gripper():
    gripper.run_angle(300, 90)

open_gripper()
ev3.screen.print("UP = close")
ev3.screen.print("DOWN = open")
while True:
    b = ev3.buttons.pressed()
    if Button.UP in b:
        close_gripper()
    elif Button.DOWN in b:
        open_gripper()
    elif Button.CENTER in b:
        break
    wait(100)` },
{ cat: "Κίνηση", t: "DriveBase: ευθεία και στροφή", lvl: 1, hw: "Μοτέρ στις B (αριστερό) και C (δεξί)",
  d: "Το DriveBase κάνει τις ακριβείς κινήσεις σε mm και μοίρες. Ρύθμισε wheel_diameter και axle_track για ακρίβεια.",
  code: HEAD + DRIVE + R`
robot.settings(straight_speed=200, turn_rate=100)
robot.straight(500)    # 50 cm μπροστά
robot.turn(90)         # 90° δεξιά
robot.straight(-200)   # 20 cm πίσω
robot.turn(-90)        # 90° αριστερά
ev3.speaker.beep()` },
{ cat: "Κίνηση", t: "Τετράγωνο", lvl: 1, hw: "DriveBase B + C",
  d: "Το ρομπότ σχεδιάζει τετράγωνο 30 cm με επανάληψη for.",
  code: HEAD + DRIVE + R`
for i in range(4):
    robot.straight(300)
    robot.turn(90)
ev3.speaker.say("Square")` },
{ cat: "Κίνηση", t: "Κύκλος και οχτάρι", lvl: 2, hw: "DriveBase B + C",
  d: "Με το robot.drive(ταχύτητα, ρυθμός_στροφής) κάνει τόξα. Αρνητικό turn_rate = στροφή αριστερά.",
  code: HEAD + DRIVE + R`
# Κύκλος δεξιά για 6 δευτ.
robot.drive(150, 60)
wait(6000)
# Κύκλος αριστερά για 6 δευτ. -> οχτάρι
robot.drive(150, -60)
wait(6000)
robot.stop()` },
{ cat: "Κίνηση", t: "Tank steering με τα κουμπιά", lvl: 2, hw: "DriveBase B + C",
  d: "Τηλεχειρισμός από τα κουμπιά του brick: πάνω/κάτω κίνηση, αριστερά/δεξιά στροφή.",
  code: HEAD + DRIVE + R`
while True:
    b = ev3.buttons.pressed()
    speed = 0
    turn = 0
    if Button.UP in b:
        speed = 200
    if Button.DOWN in b:
        speed = -200
    if Button.LEFT in b:
        turn = -90
    if Button.RIGHT in b:
        turn = 90
    if Button.CENTER in b:
        break
    robot.drive(speed, turn)
    wait(20)
robot.stop()` },
{ cat: "Αισθητήρες", t: "Touch sensor: ξεκίνα με πάτημα", lvl: 1, hw: "Touch στη θύρα 1, DriveBase B + C",
  d: "Περιμένει να πατηθεί ο αισθητήρας αφής και μετά ξεκινά. Σταματά με δεύτερο πάτημα.",
  code: HEAD + DRIVE + R`
touch = TouchSensor(Port.S1)

ev3.screen.print("Press Touch")
while not touch.pressed():
    wait(10)
while touch.pressed():   # περίμενε να αφήσεις
    wait(10)

robot.drive(150, 0)
while not touch.pressed():
    wait(10)
robot.stop()
ev3.speaker.beep()` },
{ cat: "Αισθητήρες", t: "Ultrasonic: σταμάτα πριν το εμπόδιο", lvl: 1, hw: "Ultrasonic στη θύρα 4, DriveBase B + C",
  d: "Προχωρά μέχρι να βρει εμπόδιο πιο κοντά από 15 cm. Η distance() επιστρέφει mm.",
  code: HEAD + DRIVE + R`
eyes = UltrasonicSensor(Port.S4)

robot.drive(200, 0)
while eyes.distance() > 150:
    wait(10)
robot.stop()
ev3.speaker.say("Stop")` },
{ cat: "Αισθητήρες", t: "Color sensor: αναγνώριση χρώματος", lvl: 1, hw: "Color στη θύρα 3",
  d: "Δείχνει το χρώμα που βλέπει και αλλάζει το φως του brick ανάλογα.",
  code: HEAD + R`
sensor = ColorSensor(Port.S3)
while True:
    c = sensor.color()
    ev3.screen.clear()
    ev3.screen.print(c)
    if c == Color.RED:
        ev3.light.on(Color.RED)
    elif c == Color.GREEN:
        ev3.light.on(Color.GREEN)
    elif c == Color.YELLOW:
        ev3.light.on(Color.ORANGE)
    else:
        ev3.light.off()
    wait(200)` },
{ cat: "Αισθητήρες", t: "Color sensor: ανάκλαση & φως", lvl: 1, hw: "Color στη θύρα 3",
  d: "Τιμές reflection (0-100) για ακολούθηση γραμμής και ambient για φωτεινότητα χώρου.",
  code: HEAD + R`
sensor = ColorSensor(Port.S3)
while True:
    ev3.screen.clear()
    ev3.screen.print("Reflect:", sensor.reflection())
    ev3.screen.print("Ambient:", sensor.ambient())
    ev3.screen.print("RGB:", sensor.rgb())
    wait(300)` },
{ cat: "Αισθητήρες", t: "Gyro: ακριβής στροφή 90°", lvl: 2, hw: "Gyro στη θύρα 2, μοτέρ B + C",
  d: "Στρίβει μέχρι το γυροσκόπιο να δείξει 90°. Κράτα το ρομπότ ακίνητο όταν ξεκινά (βαθμονόμηση).",
  code: HEAD + R`
left_motor = Motor(Port.B)
right_motor = Motor(Port.C)
gyro = GyroSensor(Port.S2)

wait(500)
gyro.reset_angle(0)
left_motor.run(150)
right_motor.run(-150)
while gyro.angle() < 90:
    wait(5)
left_motor.stop(Stop.BRAKE)
right_motor.stop(Stop.BRAKE)
ev3.screen.print("Angle:", gyro.angle())
wait(2000)` },
{ cat: "Αισθητήρες", t: "Gyro: ευθεία κίνηση με διόρθωση", lvl: 3, hw: "Gyro στη θύρα 2, DriveBase B + C",
  d: "Κρατά την πορεία ευθεία διορθώνοντας με βάση τη γωνία του γυροσκοπίου (αναλογικός έλεγχος).",
  code: HEAD + DRIVE + R`
gyro = GyroSensor(Port.S2)
GAIN = 3          # πόσο έντονα διορθώνει
SPEED = 200

wait(500)
gyro.reset_angle(0)
robot.reset()
while robot.distance() < 1000:     # 1 μέτρο
    correction = -GAIN * gyro.angle()
    robot.drive(SPEED, correction)
    wait(10)
robot.stop()` },
{ cat: "Line Follower", t: "Line follower: απλό (on/off)", lvl: 1, hw: "Color στη θύρα 3, DriveBase B + C",
  d: "Ακολουθεί την άκρη μιας μαύρης γραμμής: αν βλέπει σκούρο στρίβει από τη μία, αν βλέπει ανοιχτό από την άλλη.",
  code: HEAD + DRIVE + R`
line = ColorSensor(Port.S3)
BLACK = 9
WHITE = 85
threshold = (BLACK + WHITE) / 2

while True:
    if line.reflection() < threshold:
        robot.drive(100, -60)
    else:
        robot.drive(100, 60)
    wait(10)` },
{ cat: "Line Follower", t: "Line follower: αναλογικός (P)", lvl: 2, hw: "Color στη θύρα 3, DriveBase B + C",
  d: "Ομαλή ακολούθηση γραμμής: η στροφή είναι ανάλογη του πόσο απέχει από την άκρη.",
  code: HEAD + DRIVE + R`
line = ColorSensor(Port.S3)
BLACK = 9
WHITE = 85
threshold = (BLACK + WHITE) / 2
DRIVE_SPEED = 100
PROPORTIONAL_GAIN = 1.2

while True:
    deviation = line.reflection() - threshold
    turn_rate = PROPORTIONAL_GAIN * deviation
    robot.drive(DRIVE_SPEED, turn_rate)
    wait(10)` },
{ cat: "Line Follower", t: "Line follower: PID", lvl: 3, hw: "Color στη θύρα 3, DriveBase B + C",
  d: "Πλήρης PID έλεγχος για γρήγορη και σταθερή ακολούθηση. Ξεκίνα με Ki=0, Kd=0 και αύξανε σταδιακά.",
  code: HEAD + DRIVE + R`
line = ColorSensor(Port.S3)
target = 47      # μέσος όρος μαύρου-άσπρου
Kp = 1.2
Ki = 0.01
Kd = 4.0
SPEED = 150

integral = 0
last_error = 0
while Button.CENTER not in ev3.buttons.pressed():
    error = line.reflection() - target
    integral = integral + error
    integral = max(-500, min(500, integral))   # anti-windup
    derivative = error - last_error
    turn = Kp * error + Ki * integral + Kd * derivative
    robot.drive(SPEED, turn)
    last_error = error
    wait(10)
robot.stop()` },
{ cat: "Line Follower", t: "Βαθμονόμηση αισθητήρα γραμμής", lvl: 2, hw: "Color στη θύρα 3",
  d: "Μετράει μαύρο και άσπρο με τα κουμπιά και υπολογίζει το κατώφλι (threshold).",
  code: HEAD + R`
line = ColorSensor(Port.S3)

def wait_center():
    while Button.CENTER not in ev3.buttons.pressed():
        wait(10)
    while Button.CENTER in ev3.buttons.pressed():
        wait(10)

ev3.screen.print("Put on BLACK")
ev3.screen.print("and press OK")
wait_center()
black = line.reflection()
ev3.speaker.beep()

ev3.screen.print("Put on WHITE")
wait_center()
white = line.reflection()
ev3.speaker.beep()

ev3.screen.clear()
ev3.screen.print("Black:", black)
ev3.screen.print("White:", white)
ev3.screen.print("Thresh:", (black + white) // 2)
wait(5000)` },
{ cat: "Obstacle Avoidance", t: "Αποφυγή εμποδίων", lvl: 2, hw: "Ultrasonic στη θύρα 4, DriveBase B + C",
  d: "Κινείται συνέχεια· όταν βρει εμπόδιο κάνει πίσω, στρίβει σε τυχαία κατεύθυνση και συνεχίζει.",
  code: HEAD + DRIVE + R`
import urandom
eyes = UltrasonicSensor(Port.S4)

while True:
    robot.drive(200, 0)
    while eyes.distance() > 200:
        wait(10)
    robot.stop()
    ev3.speaker.beep()
    robot.straight(-100)
    if urandom.getrandbits(1):
        robot.turn(110)
    else:
        robot.turn(-110)` },
{ cat: "Obstacle Avoidance", t: "Ακολούθησε το χέρι (follow me)", lvl: 2, hw: "Ultrasonic στη θύρα 4, DriveBase B + C",
  d: "Κρατά απόσταση 20 cm από το χέρι σου: πλησιάζει αν απομακρυνθείς, κάνει πίσω αν πλησιάσεις.",
  code: HEAD + DRIVE + R`
eyes = UltrasonicSensor(Port.S4)
TARGET = 200   # mm
GAIN = 2

while True:
    error = eyes.distance() - TARGET
    speed = max(-300, min(300, GAIN * error))
    if abs(error) < 20:
        speed = 0
    robot.drive(speed, 0)
    wait(20)` },
{ cat: "Sumo", t: "Sumo EV3", lvl: 3, hw: "Color (κάτω) S3, Ultrasonic S4, DriveBase B + C",
  d: "Ψάχνει τον αντίπαλο γυρίζοντας, επιτίθεται όταν τον βλέπει και κάνει πίσω όταν βρει την άσπρη άκρη του ρινγκ.",
  code: HEAD + DRIVE + R`
edge = ColorSensor(Port.S3)
eyes = UltrasonicSensor(Port.S4)
EDGE_WHITE = 50      # πάνω από αυτό = άσπρη γραμμή
ENEMY_MM = 400

ev3.screen.print("Sumo: 3 sec...")
wait(3000)            # κανονισμός: αναμονή 3 δευτ.

while True:
    if edge.reflection() > EDGE_WHITE:
        robot.straight(-150)
        robot.turn(150)
    elif eyes.distance() < ENEMY_MM:
        robot.drive(600, 0)        # επίθεση
    else:
        robot.drive(0, 120)        # αναζήτηση
    wait(10)` },
{ cat: "Αυτοματισμοί", t: "Μέτρηση χρωμάτων σε ταινία", lvl: 2, hw: "Color S3, Motor A (ταινία)",
  d: "Ταινιόδρομος που μετρά πόσα κόκκινα και μπλε τουβλάκια περνούν και τα δείχνει στην οθόνη.",
  code: HEAD + R`
belt = Motor(Port.A)
sensor = ColorSensor(Port.S3)
red = 0
blue = 0
last = None

belt.run(200)
while Button.CENTER not in ev3.buttons.pressed():
    c = sensor.color()
    if c != last:
        if c == Color.RED:
            red += 1
            ev3.speaker.beep(900, 80)
        elif c == Color.BLUE:
            blue += 1
            ev3.speaker.beep(500, 80)
        last = c
    ev3.screen.clear()
    ev3.screen.print("RED:", red)
    ev3.screen.print("BLUE:", blue)
    wait(50)
belt.stop()` },
{ cat: "Αυτοματισμοί", t: "Ταξινομητής (color sorter)", lvl: 3, hw: "Color S3, Motor A (ταινία), Medium Motor D (πόρτα)",
  d: "Ανάλογα με το χρώμα, γυρίζει μια πόρτα αριστερά ή δεξιά για να ταξινομήσει τα αντικείμενα.",
  code: HEAD + R`
belt = Motor(Port.A)
gate = Motor(Port.D)
sensor = ColorSensor(Port.S3)
gate.reset_angle(0)

while True:
    belt.run(150)
    c = sensor.color()
    if c in (Color.RED, Color.BLUE, Color.YELLOW, Color.GREEN):
        belt.stop()
        if c == Color.RED or c == Color.YELLOW:
            gate.run_target(300, 60)
        else:
            gate.run_target(300, -60)
        belt.run_time(150, 1500)
        gate.run_target(300, 0)
    wait(20)` },
{ cat: "Αυτοματισμοί", t: "Data logging: απόσταση σε αρχείο", lvl: 3, hw: "Ultrasonic S4",
  d: "Καταγράφει μετρήσεις σε αρχείο CSV στο brick (για γραφήματα στο Excel). Το DataLog σώζεται στον φάκελο του project.",
  code: HEAD + R`
from pybricks.tools import DataLog
eyes = UltrasonicSensor(Port.S4)
data = DataLog("time_ms", "distance_mm", name="log", timestamp=False)
watch = StopWatch()

while watch.time() < 10000:
    data.log(watch.time(), eyes.distance())
    wait(100)
ev3.speaker.beep()` },
];
S.forEach(s => { s.p = "ev3"; s.lang = "EV3 MicroPython"; });
window.SNIPPETS = (window.SNIPPETS || []).concat(S);
})();
