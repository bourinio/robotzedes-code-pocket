/* DFRobot Maqueen (Lite / Plus) με micro:bit — MakeCode (επέκταση maqueen) + MicroPython */
(function () {
const R = String.raw;
const MPY = R`from microbit import *
import machine
import utime

# ---- Βιβλιοθήκη Maqueen (I2C διεύθυνση 0x10) ----
def motor(left, right):
    """Ταχύτητα -255..255 για κάθε τροχό."""
    for reg, speed in ((0x00, left), (0x02, right)):
        direction = 0 if speed >= 0 else 1
        i2c.write(0x10, bytearray([reg, direction, min(255, abs(int(speed)))]))

def stop():
    motor(0, 0)

def line_left():
    return pin13.read_digital()

def line_right():
    return pin14.read_digital()

def distance_cm():
    pin1.write_digital(1)
    utime.sleep_us(10)
    pin1.write_digital(0)
    t = machine.time_pulse_us(pin2, 1, 25000)
    return 500 if t < 0 else t / 58

def leds(left, right):
    pin8.write_digital(left)
    pin12.write_digital(right)
# -------------------------------------------------
`;
const NOTE = "Στο MakeCode: Επεκτάσεις → αναζήτηση «maqueen». ";
const S = [
{ cat: "Βασικά", t: "Μπροστά – πίσω – στροφή", lvl: 1, hw: "Maqueen + micro:bit",
  d: NOTE + "Οι βασικές κινήσεις: CW = μπροστά, CCW = πίσω, ταχύτητα 0-255.",
  v: [
   { l: "MakeCode JS", c: R`input.onButtonPressed(Button.A, function () {
    maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CW, 120)
    basic.pause(1000)
    maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CCW, 120)
    basic.pause(1000)
    maqueen.motorRun(maqueen.Motors.M1, maqueen.Dir.CW, 120)
    maqueen.motorRun(maqueen.Motors.M2, maqueen.Dir.CCW, 120)
    basic.pause(500)
    maqueen.motorStop(maqueen.Motors.All)
})
input.onButtonPressed(Button.B, function () {
    maqueen.motorStop(maqueen.Motors.All)
})` },
   { l: "MicroPython", c: MPY + R`
while True:
    if button_a.was_pressed():
        motor(120, 120)
        sleep(1000)
        motor(-120, -120)
        sleep(1000)
        motor(120, -120)
        sleep(500)
        stop()
    if button_b.was_pressed():
        stop()
    sleep(20)` }] },
{ cat: "Βασικά", t: "Φώτα LED & NeoPixel", lvl: 1, hw: "Maqueen (LED P8/P12, 4 RGB στο P15)",
  d: NOTE + "Αναβοσβήνει τα δύο κόκκινα LED μπροστά και ανάβει ουράνιο τόξο στα 4 RGB LED από κάτω (θέλει και την επέκταση neopixel).",
  v: [
   { l: "MakeCode JS", c: R`let strip = neopixel.create(DigitalPin.P15, 4, NeoPixelMode.RGB)
strip.showRainbow(1, 360)
basic.forever(function () {
    maqueen.writeLED(maqueen.LED.LEDLeft, maqueen.LEDswitch.turnOn)
    maqueen.writeLED(maqueen.LED.LEDRight, maqueen.LEDswitch.turnOff)
    basic.pause(300)
    maqueen.writeLED(maqueen.LED.LEDLeft, maqueen.LEDswitch.turnOff)
    maqueen.writeLED(maqueen.LED.LEDRight, maqueen.LEDswitch.turnOn)
    basic.pause(300)
    strip.rotate(1)
    strip.show()
})` },
   { l: "MicroPython", c: MPY + R`import neopixel
np = neopixel.NeoPixel(pin15, 4)
colors = [(30, 0, 0), (0, 30, 0), (0, 0, 30), (30, 30, 0)]
shift = 0
while True:
    leds(1, 0)
    sleep(300)
    leds(0, 1)
    sleep(300)
    for i in range(4):
        np[i] = colors[(i + shift) % 4]
    np.show()
    shift += 1` }] },
{ cat: "Βασικά", t: "Σιρήνα περιπολικού", lvl: 1, hw: "Maqueen + micro:bit V2 (ή buzzer Maqueen στο P0)",
  d: NOTE + "Μπλε-κόκκινα φώτα και ήχος σειρήνας ενώ το ρομπότ κινείται.",
  v: [
   { l: "MakeCode JS", c: R`let strip = neopixel.create(DigitalPin.P15, 4, NeoPixelMode.RGB)
maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CW, 60)
basic.forever(function () {
    strip.showColor(neopixel.colors(NeoPixelColors.Red))
    music.playTone(880, 300)
    strip.showColor(neopixel.colors(NeoPixelColors.Blue))
    music.playTone(660, 300)
})` },
   { l: "MicroPython", c: MPY + R`import neopixel
import music
np = neopixel.NeoPixel(pin15, 4)
motor(60, 60)
while True:
    np.fill((40, 0, 0))
    np.show()
    music.pitch(880, 300)
    np.fill((0, 0, 40))
    np.show()
    music.pitch(660, 300)` }] },
{ cat: "Αισθητήρες", t: "Υπερηχητικός: δείξε απόσταση", lvl: 1, hw: "Maqueen (ultrasonic Trig P1 / Echo P2)",
  d: NOTE + "Εμφανίζει την απόσταση σε cm. Αν είναι κοντά από 10 cm ανάβουν τα LED.",
  v: [
   { l: "MakeCode JS", c: R`basic.forever(function () {
    let d = maqueen.Ultrasonic(PingUnit.Centimeters)
    basic.showNumber(d)
    if (d > 0 && d < 10) {
        maqueen.writeLED(maqueen.LED.LEDLeft, maqueen.LEDswitch.turnOn)
        maqueen.writeLED(maqueen.LED.LEDRight, maqueen.LEDswitch.turnOn)
    } else {
        maqueen.writeLED(maqueen.LED.LEDLeft, maqueen.LEDswitch.turnOff)
        maqueen.writeLED(maqueen.LED.LEDRight, maqueen.LEDswitch.turnOff)
    }
})` },
   { l: "MicroPython", c: MPY + R`
while True:
    d = distance_cm()
    display.scroll(int(d), delay=60)
    if d < 10:
        leds(1, 1)
    else:
        leds(0, 0)
    sleep(200)` }] },
{ cat: "Αισθητήρες", t: "Δοκιμή αισθητήρων γραμμής", lvl: 1, hw: "Maqueen (line sensors P13 / P14)",
  d: NOTE + "Δείχνει την τιμή αριστερού/δεξιού αισθητήρα στην οθόνη. Δες ποια τιμή (0 ή 1) δίνει η μαύρη γραμμή στο δικό σου Maqueen.",
  v: [
   { l: "MakeCode JS", c: R`basic.forever(function () {
    basic.clearScreen()
    if (maqueen.readPatrol(maqueen.Patrol.PatrolLeft) == 1) {
        led.plot(4, 2)
    }
    if (maqueen.readPatrol(maqueen.Patrol.PatrolRight) == 1) {
        led.plot(0, 2)
    }
    basic.pause(100)
})` },
   { l: "MicroPython", c: MPY + R`
while True:
    display.clear()
    if line_left() == 1:
        display.set_pixel(4, 2, 9)
    if line_right() == 1:
        display.set_pixel(0, 2, 9)
    sleep(100)` }] },
{ cat: "Line Follower", t: "Line follower 2 αισθητήρων", lvl: 1, hw: "Maqueen + μαύρη γραμμή 2-3 cm",
  d: NOTE + "Κλασικός ακόλουθος γραμμής. Αν το ρομπότ φεύγει ανάποδα, άλλαξε την τιμή BLACK σε 1.",
  v: [
   { l: "MakeCode JS", c: R`let BLACK = 0
let SPEED = 80
basic.forever(function () {
    let L = maqueen.readPatrol(maqueen.Patrol.PatrolLeft)
    let R = maqueen.readPatrol(maqueen.Patrol.PatrolRight)
    if (L == BLACK && R == BLACK) {
        maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CW, SPEED)
    } else if (L == BLACK) {
        maqueen.motorStop(maqueen.Motors.M1)
        maqueen.motorRun(maqueen.Motors.M2, maqueen.Dir.CW, SPEED)
    } else if (R == BLACK) {
        maqueen.motorRun(maqueen.Motors.M1, maqueen.Dir.CW, SPEED)
        maqueen.motorStop(maqueen.Motors.M2)
    } else {
        maqueen.motorStop(maqueen.Motors.All)
    }
})` },
   { l: "MicroPython", c: MPY + R`BLACK = 0
SPEED = 80
while True:
    L = line_left()
    R = line_right()
    if L == BLACK and R == BLACK:
        motor(SPEED, SPEED)
    elif L == BLACK:
        motor(0, SPEED)
    elif R == BLACK:
        motor(SPEED, 0)
    else:
        stop()` }] },
{ cat: "Line Follower", t: "Line follower που ψάχνει τη γραμμή", lvl: 2, hw: "Maqueen + μαύρη γραμμή",
  d: NOTE + "Θυμάται προς τα πού χάθηκε η γραμμή και γυρίζει προς εκείνη την πλευρά για να την ξαναβρεί.",
  v: [
   { l: "MakeCode JS", c: R`let BLACK = 0
let last = 0
basic.forever(function () {
    let L = maqueen.readPatrol(maqueen.Patrol.PatrolLeft)
    let R = maqueen.readPatrol(maqueen.Patrol.PatrolRight)
    if (L == BLACK && R == BLACK) {
        maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CW, 90)
    } else if (L == BLACK) {
        last = -1
        maqueen.motorRun(maqueen.Motors.M1, maqueen.Dir.CW, 20)
        maqueen.motorRun(maqueen.Motors.M2, maqueen.Dir.CW, 90)
    } else if (R == BLACK) {
        last = 1
        maqueen.motorRun(maqueen.Motors.M1, maqueen.Dir.CW, 90)
        maqueen.motorRun(maqueen.Motors.M2, maqueen.Dir.CW, 20)
    } else if (last < 0) {
        maqueen.motorRun(maqueen.Motors.M1, maqueen.Dir.CCW, 60)
        maqueen.motorRun(maqueen.Motors.M2, maqueen.Dir.CW, 60)
    } else {
        maqueen.motorRun(maqueen.Motors.M1, maqueen.Dir.CW, 60)
        maqueen.motorRun(maqueen.Motors.M2, maqueen.Dir.CCW, 60)
    }
})` },
   { l: "MicroPython", c: MPY + R`BLACK = 0
last = 0
while True:
    L = line_left()
    R = line_right()
    if L == BLACK and R == BLACK:
        motor(90, 90)
    elif L == BLACK:
        last = -1
        motor(20, 90)
    elif R == BLACK:
        last = 1
        motor(90, 20)
    elif last < 0:
        motor(-60, 60)
    else:
        motor(60, -60)` }] },
{ cat: "Obstacle Avoidance", t: "Αποφυγή εμποδίων", lvl: 1, hw: "Maqueen + ultrasonic",
  d: NOTE + "Κινείται μπροστά. Όταν βρει εμπόδιο κάτω από 15 cm κάνει πίσω και στρίβει τυχαία.",
  v: [
   { l: "MakeCode JS", c: R`basic.forever(function () {
    let d = maqueen.Ultrasonic(PingUnit.Centimeters)
    if (d > 0 && d < 15) {
        maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CCW, 80)
        basic.pause(400)
        if (Math.randomBoolean()) {
            maqueen.motorRun(maqueen.Motors.M1, maqueen.Dir.CW, 100)
            maqueen.motorRun(maqueen.Motors.M2, maqueen.Dir.CCW, 100)
        } else {
            maqueen.motorRun(maqueen.Motors.M1, maqueen.Dir.CCW, 100)
            maqueen.motorRun(maqueen.Motors.M2, maqueen.Dir.CW, 100)
        }
        basic.pause(400)
    } else {
        maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CW, 100)
    }
})` },
   { l: "MicroPython", c: MPY + R`import random
while True:
    if distance_cm() < 15:
        motor(-80, -80)
        sleep(400)
        if random.randint(0, 1):
            motor(100, -100)
        else:
            motor(-100, 100)
        sleep(400)
    else:
        motor(100, 100)
    sleep(30)` }] },
{ cat: "Obstacle Avoidance", t: "Ακολούθησε το χέρι μου", lvl: 2, hw: "Maqueen + ultrasonic",
  d: NOTE + "Κρατάει απόσταση ~15 cm από το χέρι σου: πλησιάζει ή απομακρύνεται.",
  v: [
   { l: "MakeCode JS", c: R`basic.forever(function () {
    let d = maqueen.Ultrasonic(PingUnit.Centimeters)
    if (d > 20 && d < 50) {
        maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CW, 70)
    } else if (d > 0 && d < 10) {
        maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CCW, 70)
    } else {
        maqueen.motorStop(maqueen.Motors.All)
    }
    basic.pause(50)
})` },
   { l: "MicroPython", c: MPY + R`
while True:
    d = distance_cm()
    if 20 < d < 50:
        motor(70, 70)
    elif d < 10:
        motor(-70, -70)
    else:
        stop()
    sleep(50)` }] },
{ cat: "Τηλεχειρισμός", t: "Δέκτης radio (για τηλεχειριστήριο micro:bit)", lvl: 2, hw: "Maqueen + 2ο micro:bit ως πομπός",
  d: NOTE + "Λαμβάνει F/B/L/R/S από άλλο micro:bit (δες «Τηλεχειριστήριο με κλίση» στο micro:bit). Ίδιο radio group = 7.",
  v: [
   { l: "MakeCode JS", c: R`radio.setGroup(7)
let lastMsg = 0
radio.onReceivedString(function (cmd) {
    lastMsg = input.runningTime()
    if (cmd == "F") {
        maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CW, 150)
    } else if (cmd == "B") {
        maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CCW, 150)
    } else if (cmd == "L") {
        maqueen.motorRun(maqueen.Motors.M1, maqueen.Dir.CCW, 100)
        maqueen.motorRun(maqueen.Motors.M2, maqueen.Dir.CW, 100)
    } else if (cmd == "R") {
        maqueen.motorRun(maqueen.Motors.M1, maqueen.Dir.CW, 100)
        maqueen.motorRun(maqueen.Motors.M2, maqueen.Dir.CCW, 100)
    } else {
        maqueen.motorStop(maqueen.Motors.All)
    }
    basic.showString(cmd)
})
// Ασφάλεια: αν χαθεί το σήμα, σταμάτα
basic.forever(function () {
    if (input.runningTime() - lastMsg > 500) {
        maqueen.motorStop(maqueen.Motors.All)
    }
})` },
   { l: "MicroPython", c: MPY + R`import radio
radio.config(group=7)
radio.on()
last = utime.ticks_ms()
while True:
    cmd = radio.receive()
    if cmd:
        last = utime.ticks_ms()
        display.show(cmd)
        if cmd == "F":
            motor(150, 150)
        elif cmd == "B":
            motor(-150, -150)
        elif cmd == "L":
            motor(-100, 100)
        elif cmd == "R":
            motor(100, -100)
        else:
            stop()
    if utime.ticks_diff(utime.ticks_ms(), last) > 500:
        stop()
    sleep(10)` }] },
{ cat: "Τηλεχειρισμός", t: "Υπέρυθρο τηλεκοντρόλ (IR)", lvl: 2, hw: "Maqueen (IR δέκτης P16) + τηλεκοντρόλ DFRobot",
  d: NOTE + "Οδήγηση με το IR τηλεκοντρόλ. Τρέξε πρώτα και δες στην οθόνη τους κωδικούς των κουμπιών σου, μετά άλλαξε τις τιμές.",
  v: [
   { l: "MakeCode JS", c: R`// Κωδικοί για το τηλεκοντρόλ DFRobot (έλεγξε τα δικά σου)
let UP = 2
let DOWN = 152
let LEFT = 224
let RIGHT = 144
let OK = 168
maqueen.IR_callbackUser(function (code) {
    basic.showNumber(code)
    if (code == UP) {
        maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CW, 120)
    } else if (code == DOWN) {
        maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CCW, 120)
    } else if (code == LEFT) {
        maqueen.motorRun(maqueen.Motors.M1, maqueen.Dir.CCW, 80)
        maqueen.motorRun(maqueen.Motors.M2, maqueen.Dir.CW, 80)
    } else if (code == RIGHT) {
        maqueen.motorRun(maqueen.Motors.M1, maqueen.Dir.CW, 80)
        maqueen.motorRun(maqueen.Motors.M2, maqueen.Dir.CCW, 80)
    } else if (code == OK) {
        maqueen.motorStop(maqueen.Motors.All)
    }
})` }] },
{ cat: "Τηλεχειρισμός", t: "Οδήγηση με κουμπιά A/B", lvl: 1, hw: "Maqueen + micro:bit",
  d: NOTE + "A = στροφή αριστερά, B = στροφή δεξιά, A+B = μπροστά, κούνημα = stop.",
  v: [
   { l: "MakeCode JS", c: R`input.onButtonPressed(Button.A, function () {
    maqueen.motorRun(maqueen.Motors.M1, maqueen.Dir.CW, 30)
    maqueen.motorRun(maqueen.Motors.M2, maqueen.Dir.CW, 120)
})
input.onButtonPressed(Button.B, function () {
    maqueen.motorRun(maqueen.Motors.M1, maqueen.Dir.CW, 120)
    maqueen.motorRun(maqueen.Motors.M2, maqueen.Dir.CW, 30)
})
input.onButtonPressed(Button.AB, function () {
    maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CW, 120)
})
input.onGesture(Gesture.Shake, function () {
    maqueen.motorStop(maqueen.Motors.All)
})` },
   { l: "MicroPython", c: MPY + R`
while True:
    a = button_a.is_pressed()
    b = button_b.is_pressed()
    if a and b:
        motor(120, 120)
    elif a:
        motor(30, 120)
    elif b:
        motor(120, 30)
    elif accelerometer.was_gesture("shake"):
        stop()
    sleep(30)` }] },
{ cat: "Servo & Εξαρτήματα", t: "Servo στις θύρες S1/S2", lvl: 2, hw: "Maqueen Plus / Maqueen με servo στο S1",
  d: NOTE + "Κινεί servo (π.χ. δαγκάνα ή μπάρα) μπρος-πίσω.",
  v: [
   { l: "MakeCode JS", c: R`basic.forever(function () {
    maqueen.servoRun(maqueen.Servos.S1, 0)
    basic.pause(800)
    maqueen.servoRun(maqueen.Servos.S1, 90)
    basic.pause(800)
    maqueen.servoRun(maqueen.Servos.S1, 180)
    basic.pause(800)
})` },
   { l: "MicroPython", c: R`from microbit import *

def servo(index, angle):
    # S1 = 0x14, S2 = 0x15 στον ελεγκτή Maqueen (I2C 0x10)
    reg = 0x14 if index == 1 else 0x15
    i2c.write(0x10, bytearray([reg, max(0, min(180, angle))]))

while True:
    for a in (0, 90, 180):
        servo(1, a)
        sleep(800)` }] },
{ cat: "Αυτοματισμοί", t: "Ρομπότ που ακολουθεί το φως", lvl: 2, hw: "Maqueen + micro:bit",
  d: NOTE + "Χρησιμοποιεί τον αισθητήρα φωτός της οθόνης: στρίβει μέχρι να βρει περισσότερο φως και πηγαίνει προς τα εκεί (φακός κινητού).",
  v: [
   { l: "MakeCode JS", c: R`basic.forever(function () {
    if (input.lightLevel() > 150) {
        maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CW, 80)
    } else {
        maqueen.motorRun(maqueen.Motors.M1, maqueen.Dir.CW, 50)
        maqueen.motorRun(maqueen.Motors.M2, maqueen.Dir.CCW, 50)
    }
    basic.pause(50)
})` },
   { l: "MicroPython", c: MPY + R`
while True:
    if display.read_light_level() > 150:
        motor(80, 80)
    else:
        motor(50, -50)
    sleep(50)` }] },
{ cat: "Αυτοματισμοί", t: "Μη πέσεις από το τραπέζι", lvl: 2, hw: "Maqueen (αισθητήρες γραμμής ως αισθητήρες κενού)",
  d: NOTE + "Οι αισθητήρες γραμμής «βλέπουν» το κενό στην άκρη του τραπεζιού σαν μαύρο. Τότε το ρομπότ κάνει πίσω και στρίβει.",
  v: [
   { l: "MakeCode JS", c: R`let EDGE = 0
basic.forever(function () {
    let L = maqueen.readPatrol(maqueen.Patrol.PatrolLeft)
    let R = maqueen.readPatrol(maqueen.Patrol.PatrolRight)
    if (L == EDGE || R == EDGE) {
        maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CCW, 80)
        basic.pause(500)
        maqueen.motorRun(maqueen.Motors.M1, maqueen.Dir.CW, 80)
        maqueen.motorRun(maqueen.Motors.M2, maqueen.Dir.CCW, 80)
        basic.pause(600)
    } else {
        maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CW, 60)
    }
})` },
   { l: "MicroPython", c: MPY + R`EDGE = 0
while True:
    if line_left() == EDGE or line_right() == EDGE:
        motor(-80, -80)
        sleep(500)
        motor(80, -80)
        sleep(600)
    else:
        motor(60, 60)
    sleep(10)` }] },
{ cat: "Sumo", t: "Maqueen Sumo", lvl: 3, hw: "Maqueen σε ρινγκ με μαύρο φόντο & άσπρη γραμμή",
  d: NOTE + "Ψάχνει τον αντίπαλο με τον υπερηχητικό, επιτίθεται και μένει μέσα στο ρινγκ με τους αισθητήρες γραμμής (άσπρο = 1 εδώ).",
  v: [
   { l: "MakeCode JS", c: R`let WHITE = 1
basic.showNumber(3)
basic.showNumber(2)
basic.showNumber(1)
basic.forever(function () {
    let L = maqueen.readPatrol(maqueen.Patrol.PatrolLeft)
    let R = maqueen.readPatrol(maqueen.Patrol.PatrolRight)
    let d = maqueen.Ultrasonic(PingUnit.Centimeters)
    if (L == WHITE || R == WHITE) {
        maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CCW, 200)
        basic.pause(300)
        maqueen.motorRun(maqueen.Motors.M1, maqueen.Dir.CW, 150)
        maqueen.motorRun(maqueen.Motors.M2, maqueen.Dir.CCW, 150)
        basic.pause(300)
    } else if (d > 0 && d < 30) {
        maqueen.motorRun(maqueen.Motors.All, maqueen.Dir.CW, 255)
    } else {
        maqueen.motorRun(maqueen.Motors.M1, maqueen.Dir.CW, 80)
        maqueen.motorRun(maqueen.Motors.M2, maqueen.Dir.CCW, 80)
    }
})` },
   { l: "MicroPython", c: MPY + R`WHITE = 1
for i in (3, 2, 1):
    display.show(i)
    sleep(1000)
while True:
    if line_left() == WHITE or line_right() == WHITE:
        motor(-200, -200)
        sleep(300)
        motor(150, -150)
        sleep(300)
    elif distance_cm() < 30:
        motor(255, 255)
    else:
        motor(80, -80)
    sleep(5)` }] },
];
S.forEach(s => { s.p = "maqueen"; });
window.SNIPPETS = (window.SNIPPETS || []).concat(S);
})();
