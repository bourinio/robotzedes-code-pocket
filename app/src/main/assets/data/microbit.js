/* BBC micro:bit — MicroPython + MakeCode JavaScript */
(function () {
const R = String.raw;
const S = [
{ cat: "Βασικά", t: "Καρδιά που χτυπάει", lvl: 1, hw: "micro:bit",
  d: "Εναλλαγή μεγάλης και μικρής καρδιάς για εφέ παλμού.",
  v: [
   { l: "MicroPython", c: R`from microbit import *

while True:
    display.show(Image.HEART)
    sleep(500)
    display.show(Image.HEART_SMALL)
    sleep(500)` },
   { l: "MakeCode JS", c: R`basic.forever(function () {
    basic.showIcon(IconNames.Heart)
    basic.pause(500)
    basic.showIcon(IconNames.SmallHeart)
    basic.pause(500)
})` }] },
{ cat: "Βασικά", t: "Κουμπιά A, B και A+B", lvl: 1, hw: "micro:bit",
  d: "Κάθε κουμπί δείχνει διαφορετικό γράμμα ή εικόνα.",
  v: [
   { l: "MicroPython", c: R`from microbit import *

while True:
    if button_a.is_pressed() and button_b.is_pressed():
        display.show(Image.HAPPY)
    elif button_a.is_pressed():
        display.show("A")
    elif button_b.is_pressed():
        display.show("B")
    else:
        display.clear()
    sleep(50)` },
   { l: "MakeCode JS", c: R`input.onButtonPressed(Button.A, function () {
    basic.showString("A")
})
input.onButtonPressed(Button.B, function () {
    basic.showString("B")
})
input.onButtonPressed(Button.AB, function () {
    basic.showIcon(IconNames.Happy)
})` }] },
{ cat: "Βασικά", t: "Μετρητής με κουμπιά", lvl: 1, hw: "micro:bit",
  d: "Το A αυξάνει, το B μειώνει, το κούνημα μηδενίζει τον μετρητή.",
  v: [
   { l: "MicroPython", c: R`from microbit import *

count = 0
display.show(count)
while True:
    if button_a.was_pressed():
        count += 1
        display.show(count)
    if button_b.was_pressed():
        count -= 1
        display.show(count)
    if accelerometer.was_gesture("shake"):
        count = 0
        display.show(count)
    sleep(20)` },
   { l: "MakeCode JS", c: R`let count = 0
basic.showNumber(count)
input.onButtonPressed(Button.A, function () {
    count += 1
    basic.showNumber(count)
})
input.onButtonPressed(Button.B, function () {
    count += -1
    basic.showNumber(count)
})
input.onGesture(Gesture.Shake, function () {
    count = 0
    basic.showNumber(count)
})` }] },
{ cat: "Βασικά", t: "Ζάρι (shake)", lvl: 1, hw: "micro:bit",
  d: "Κουνάς το micro:bit και βγάζει τυχαίο αριθμό 1-6.",
  v: [
   { l: "MicroPython", c: R`from microbit import *
import random

display.show("?")
while True:
    if accelerometer.was_gesture("shake"):
        display.show(random.randint(1, 6))
    sleep(50)` },
   { l: "MakeCode JS", c: R`input.onGesture(Gesture.Shake, function () {
    basic.showNumber(randint(1, 6))
})
basic.showString("?")` }] },
{ cat: "Βασικά", t: "Κινούμενη κουκκίδα (plot)", lvl: 1, hw: "micro:bit",
  d: "Ένα LED που τρέχει σε όλες τις θέσεις της οθόνης 5x5.",
  v: [
   { l: "MicroPython", c: R`from microbit import *

while True:
    for y in range(5):
        for x in range(5):
            display.clear()
            display.set_pixel(x, y, 9)
            sleep(100)` },
   { l: "MakeCode JS", c: R`basic.forever(function () {
    for (let y = 0; y <= 4; y++) {
        for (let x = 0; x <= 4; x++) {
            basic.clearScreen()
            led.plot(x, y)
            basic.pause(100)
        }
    }
})` }] },
{ cat: "Αισθητήρες", t: "Θερμόμετρο", lvl: 1, hw: "micro:bit",
  d: "Δείχνει τη θερμοκρασία (°C) με κύλιση. Εμφανίζει εικονίδιο αν είναι ζεστό ή κρύο.",
  v: [
   { l: "MicroPython", c: R`from microbit import *

while True:
    t = temperature()
    display.scroll(str(t) + "C")
    if t > 28:
        display.show(Image.SAD)
    elif t < 15:
        display.show(Image.ASLEEP)
    else:
        display.show(Image.HAPPY)
    sleep(1000)` },
   { l: "MakeCode JS", c: R`basic.forever(function () {
    basic.showString("" + input.temperature() + "C")
    if (input.temperature() > 28) {
        basic.showIcon(IconNames.Sad)
    } else if (input.temperature() < 15) {
        basic.showIcon(IconNames.Asleep)
    } else {
        basic.showIcon(IconNames.Happy)
    }
    basic.pause(1000)
})` }] },
{ cat: "Αισθητήρες", t: "Φωτεινότητα: νυχτερινό φως", lvl: 1, hw: "micro:bit",
  d: "Τα LED της οθόνης μετράνε το φως. Όταν σκοτεινιάσει ανάβει όλη η οθόνη.",
  v: [
   { l: "MicroPython", c: R`from microbit import *

while True:
    light = display.read_light_level()   # 0-255
    if light < 30:
        display.show(Image("99999:99999:99999:99999:99999"))
    else:
        display.clear()
    sleep(500)` },
   { l: "MakeCode JS", c: R`basic.forever(function () {
    if (input.lightLevel() < 30) {
        led.plotBarGraph(255, 255)
    } else {
        basic.clearScreen()
    }
    basic.pause(500)
})` }] },
{ cat: "Αισθητήρες", t: "Πυξίδα: δείξε τον Βορρά", lvl: 2, hw: "micro:bit",
  d: "Η πρώτη φορά ζητά βαθμονόμηση (γέρνεις το micro:bit για να ανάψουν όλα τα LED).",
  v: [
   { l: "MicroPython", c: R`from microbit import *

compass.calibrate()
while True:
    h = compass.heading()
    if h < 45 or h > 315:
        display.show("N")
    elif h < 135:
        display.show("E")
    elif h < 225:
        display.show("S")
    else:
        display.show("W")
    sleep(200)` },
   { l: "MakeCode JS", c: R`basic.forever(function () {
    let h = input.compassHeading()
    if (h < 45 || h > 315) {
        basic.showString("N")
    } else if (h < 135) {
        basic.showString("E")
    } else if (h < 225) {
        basic.showString("S")
    } else {
        basic.showString("W")
    }
})` }] },
{ cat: "Αισθητήρες", t: "Αλφάδι (επιταχυνσιόμετρο)", lvl: 2, hw: "micro:bit",
  d: "Μια κουκκίδα κυλάει προς την πλευρά που γέρνει το micro:bit, σαν αλφάδι.",
  v: [
   { l: "MicroPython", c: R`from microbit import *

def to_led(value):
    return min(4, max(0, (value + 1024) * 5 // 2048))

while True:
    x = to_led(accelerometer.get_x())
    y = to_led(accelerometer.get_y())
    display.clear()
    display.set_pixel(x, y, 9)
    sleep(50)` },
   { l: "MakeCode JS", c: R`basic.forever(function () {
    let x = Math.constrain(Math.map(input.acceleration(Dimension.X), -1024, 1024, 0, 4), 0, 4)
    let y = Math.constrain(Math.map(input.acceleration(Dimension.Y), -1024, 1024, 0, 4), 0, 4)
    basic.clearScreen()
    led.plot(Math.round(x), Math.round(y))
    basic.pause(50)
})` }] },
{ cat: "Αισθητήρες", t: "Βηματόμετρο", lvl: 2, hw: "micro:bit",
  d: "Μετράει βήματα όταν το micro:bit κουνιέται (π.χ. δεμένο στο πόδι). Το A δείχνει τα βήματα.",
  v: [
   { l: "MicroPython", c: R`from microbit import *

steps = 0
while True:
    if accelerometer.was_gesture("shake"):
        steps += 1
        display.show(Image.DIAMOND_SMALL)
        sleep(100)
        display.clear()
    if button_a.was_pressed():
        display.scroll(steps)
    sleep(20)` },
   { l: "MakeCode JS", c: R`let steps = 0
input.onGesture(Gesture.Shake, function () {
    steps += 1
    led.plot(2, 2)
    basic.pause(100)
    basic.clearScreen()
})
input.onButtonPressed(Button.A, function () {
    basic.showNumber(steps)
})` }] },
{ cat: "Αισθητήρες", t: "Touch logo & μικρόφωνο (V2)", lvl: 2, hw: "micro:bit V2",
  d: "Μόνο για micro:bit V2: αγγίζεις το λογότυπο ή χτυπάς παλαμάκια για να αλλάξει εικόνα.",
  v: [
   { l: "MicroPython", c: R`from microbit import *

while True:
    if pin_logo.is_touched():
        display.show(Image.HAPPY)
    elif microphone.current_event() == SoundEvent.LOUD:
        display.show(Image.SURPRISED)
    else:
        display.show(Image.ASLEEP)
    sleep(100)` },
   { l: "MakeCode JS", c: R`input.onLogoEvent(TouchButtonEvent.Pressed, function () {
    basic.showIcon(IconNames.Happy)
})
input.onSound(DetectedSound.Loud, function () {
    basic.showIcon(IconNames.Surprised)
})
input.setSoundThreshold(SoundThreshold.Loud, 128)
basic.showIcon(IconNames.Asleep)` }] },
{ cat: "Ήχος", t: "Μελωδίες & νότες", lvl: 1, hw: "micro:bit V2 (ή ηχείο στο P0)",
  d: "Το A παίζει έτοιμη μελωδία, το B παίζει δική σου μελωδία νότα-νότα.",
  v: [
   { l: "MicroPython", c: R`from microbit import *
import music

tune = ["C4:4", "D4:4", "E4:4", "C4:4", "C4:4", "D4:4", "E4:4", "C4:4"]
while True:
    if button_a.was_pressed():
        music.play(music.BIRTHDAY)
    if button_b.was_pressed():
        music.play(tune)
    sleep(20)` },
   { l: "MakeCode JS", c: R`input.onButtonPressed(Button.A, function () {
    music.startMelody(music.builtInMelody(Melodies.Birthday), MelodyOptions.Once)
})
input.onButtonPressed(Button.B, function () {
    music.playTone(262, music.beat(BeatFraction.Whole))
    music.playTone(294, music.beat(BeatFraction.Whole))
    music.playTone(330, music.beat(BeatFraction.Whole))
    music.playTone(262, music.beat(BeatFraction.Whole))
})` }] },
{ cat: "Ήχος", t: "Θέρεμιν με φως", lvl: 2, hw: "micro:bit V2",
  d: "Η συχνότητα του ήχου αλλάζει με το πόσο φως πέφτει στην οθόνη: κουνάς το χέρι από πάνω.",
  v: [
   { l: "MicroPython", c: R`from microbit import *
import music

while True:
    light = display.read_light_level()
    music.pitch(200 + light * 6, 50)` },
   { l: "MakeCode JS", c: R`basic.forever(function () {
    music.playTone(200 + input.lightLevel() * 6, 50)
})` }] },
{ cat: "Radio", t: "Αποστολή & λήψη μηνύματος", lvl: 1, hw: "2 micro:bit",
  d: "Ίδιο πρόγραμμα και στα δύο: το A στέλνει καρδιά, το B στέλνει χαμόγελο. Ίδιο group = ίδιο «κανάλι».",
  v: [
   { l: "MicroPython", c: R`from microbit import *
import radio

radio.config(group=7)
radio.on()

while True:
    if button_a.was_pressed():
        radio.send("heart")
    if button_b.was_pressed():
        radio.send("smile")
    msg = radio.receive()
    if msg == "heart":
        display.show(Image.HEART)
    elif msg == "smile":
        display.show(Image.HAPPY)
    sleep(20)` },
   { l: "MakeCode JS", c: R`radio.setGroup(7)
input.onButtonPressed(Button.A, function () {
    radio.sendString("heart")
})
input.onButtonPressed(Button.B, function () {
    radio.sendString("smile")
})
radio.onReceivedString(function (receivedString) {
    if (receivedString == "heart") {
        basic.showIcon(IconNames.Heart)
    } else if (receivedString == "smile") {
        basic.showIcon(IconNames.Happy)
    }
})` }] },
{ cat: "Radio", t: "Τηλεχειριστήριο με κλίση (πομπός)", lvl: 2, hw: "micro:bit πομπός",
  d: "Γέρνεις το micro:bit και στέλνει F/B/L/R/S. Χρησιμοποίησέ το με τον «δέκτη» στο Maqueen ή σε ρομπότ.",
  v: [
   { l: "MicroPython", c: R`from microbit import *
import radio

radio.config(group=7)
radio.on()

while True:
    x = accelerometer.get_x()
    y = accelerometer.get_y()
    if y < -300:
        cmd = "F"
    elif y > 300:
        cmd = "B"
    elif x < -300:
        cmd = "L"
    elif x > 300:
        cmd = "R"
    else:
        cmd = "S"
    radio.send(cmd)
    display.show(cmd)
    sleep(100)` },
   { l: "MakeCode JS", c: R`radio.setGroup(7)
basic.forever(function () {
    let cmd = "S"
    if (input.acceleration(Dimension.Y) < -300) {
        cmd = "F"
    } else if (input.acceleration(Dimension.Y) > 300) {
        cmd = "B"
    } else if (input.acceleration(Dimension.X) < -300) {
        cmd = "L"
    } else if (input.acceleration(Dimension.X) > 300) {
        cmd = "R"
    }
    radio.sendString(cmd)
    basic.showString(cmd)
    basic.pause(100)
})` }] },
{ cat: "Radio", t: "Μέτρηση απόστασης με σήμα (RSSI)", lvl: 3, hw: "2 micro:bit",
  d: "«Κυνήγι θησαυρού»: όσο πιο κοντά είσαι στον πομπό, τόσο περισσότερα LED ανάβουν.",
  v: [
   { l: "MicroPython", c: R`# Βάλε ΤΟ ΙΔΙΟ πρόγραμμα και στα 2. Πάτα A στον «θησαυρό».
from microbit import *
import radio

radio.config(group=3, power=7)
radio.on()
beacon = False

while True:
    if button_a.was_pressed():
        beacon = not beacon
    if beacon:
        radio.send("ping")
        display.show(Image.DIAMOND)
        sleep(200)
    else:
        details = radio.receive_full()
        if details:
            msg, rssi, ts = details
            level = min(25, max(0, (rssi + 95) * 25 // 55))
            display.clear()
            for i in range(level):
                display.set_pixel(i % 5, 4 - i // 5, 9)
        sleep(50)` },
   { l: "MakeCode JS", c: R`let beacon = false
radio.setGroup(3)
radio.setTransmitPower(7)
input.onButtonPressed(Button.A, function () {
    beacon = !(beacon)
})
radio.onReceivedString(function (receivedString) {
    if (!(beacon)) {
        let s = radio.receivedPacket(RadioPacketProperty.SignalStrength)
        led.plotBarGraph(s + 95, 55)
    }
})
basic.forever(function () {
    if (beacon) {
        radio.sendString("ping")
        basic.showIcon(IconNames.Diamond)
        basic.pause(200)
    }
})` }] },
{ cat: "Pins & Εξαρτήματα", t: "Εξωτερικό LED & κουμπί", lvl: 1, hw: "LED στο P0 (με αντίσταση 220Ω), κουμπί στο P1",
  d: "Ανάβει ένα εξωτερικό LED όταν πατηθεί κουμπί συνδεδεμένο στο P1.",
  v: [
   { l: "MicroPython", c: R`from microbit import *

pin1.set_pull(pin1.PULL_UP)
while True:
    if pin1.read_digital() == 0:   # πατημένο (στο GND)
        pin0.write_digital(1)
    else:
        pin0.write_digital(0)
    sleep(10)` },
   { l: "MakeCode JS", c: R`pins.setPull(DigitalPin.P1, PinPullMode.PullUp)
basic.forever(function () {
    if (pins.digitalReadPin(DigitalPin.P1) == 0) {
        pins.digitalWritePin(DigitalPin.P0, 1)
    } else {
        pins.digitalWritePin(DigitalPin.P0, 0)
    }
})` }] },
{ cat: "Pins & Εξαρτήματα", t: "Servo 0°–180°", lvl: 1, hw: "Servo SG90 στο P0 (σήμα), 3V, GND",
  d: "Το A πάει το servo στις 0°, το B στις 180°, το A+B στη μέση.",
  v: [
   { l: "MicroPython", c: R`from microbit import *

def servo(pin, angle):
    # 50Hz: 0.5ms (0°) έως 2.5ms (180°) από 20ms
    pin.set_analog_period(20)
    pin.write_analog(int(26 + angle * 102 / 180))

while True:
    if button_a.is_pressed() and button_b.is_pressed():
        servo(pin0, 90)
    elif button_a.is_pressed():
        servo(pin0, 0)
    elif button_b.is_pressed():
        servo(pin0, 180)
    sleep(50)` },
   { l: "MakeCode JS", c: R`input.onButtonPressed(Button.A, function () {
    pins.servoWritePin(AnalogPin.P0, 0)
})
input.onButtonPressed(Button.B, function () {
    pins.servoWritePin(AnalogPin.P0, 180)
})
input.onButtonPressed(Button.AB, function () {
    pins.servoWritePin(AnalogPin.P0, 90)
})` }] },
{ cat: "Pins & Εξαρτήματα", t: "Αισθητήρας υγρασίας εδάφους", lvl: 2, hw: "Soil sensor στο P0 (αναλογικό)",
  d: "Διαβάζει την υγρασία του χώματος. Όταν είναι ξερό δείχνει λυπημένη φατσούλα — «πότισέ με».",
  v: [
   { l: "MicroPython", c: R`from microbit import *

DRY = 300
while True:
    moisture = pin0.read_analog()   # 0-1023
    if moisture < DRY:
        display.show(Image.SAD)
    else:
        display.show(Image.HAPPY)
    print(moisture)
    sleep(1000)` },
   { l: "MakeCode JS", c: R`basic.forever(function () {
    let moisture = pins.analogReadPin(AnalogPin.P0)
    serial.writeValue("moisture", moisture)
    if (moisture < 300) {
        basic.showIcon(IconNames.Sad)
    } else {
        basic.showIcon(IconNames.Happy)
    }
    basic.pause(1000)
})` }] },
{ cat: "Pins & Εξαρτήματα", t: "NeoPixel ουράνιο τόξο", lvl: 2, hw: "NeoPixel ταινία 8 LED στο P0",
  d: "Ουράνιο τόξο που περιστρέφεται σε ταινία LED WS2812. Στο MakeCode πρόσθεσε την επέκταση neopixel.",
  v: [
   { l: "MicroPython", c: R`from microbit import *
import neopixel

N = 8
np = neopixel.NeoPixel(pin0, N)
colors = [(40, 0, 0), (40, 20, 0), (40, 40, 0), (0, 40, 0),
          (0, 40, 40), (0, 0, 40), (20, 0, 40), (40, 0, 20)]
shift = 0
while True:
    for i in range(N):
        np[i] = colors[(i + shift) % N]
    np.show()
    shift += 1
    sleep(100)` },
   { l: "MakeCode JS", c: R`// Επεκτάσεις → neopixel
let strip = neopixel.create(DigitalPin.P0, 8, NeoPixelMode.RGB)
strip.setBrightness(40)
strip.showRainbow(1, 360)
basic.forever(function () {
    strip.rotate(1)
    strip.show()
    basic.pause(100)
})` }] },
{ cat: "Pins & Εξαρτήματα", t: "Υπερηχητικός HC-SR04 / RCWL-9610", lvl: 2, hw: "Trig στο P1, Echo στο P2 (μοντέλο 3.3V)",
  d: "Μετρά απόσταση σε cm. Στο MakeCode πρόσθεσε την επέκταση sonar.",
  v: [
   { l: "MicroPython", c: R`from microbit import *
import machine
import utime

def distance_cm():
    pin1.write_digital(0)
    utime.sleep_us(2)
    pin1.write_digital(1)
    utime.sleep_us(10)
    pin1.write_digital(0)
    pin2.read_digital()
    t = machine.time_pulse_us(pin2, 1, 30000)
    if t < 0:
        return 999
    return t * 0.0343 / 2

while True:
    d = distance_cm()
    display.scroll(int(d), delay=60)
    sleep(300)` },
   { l: "MakeCode JS", c: R`// Επεκτάσεις → sonar
basic.forever(function () {
    let d = sonar.ping(DigitalPin.P1, DigitalPin.P2, PingUnit.Centimeters)
    basic.showNumber(d)
    basic.pause(300)
})` }] },
{ cat: "Παιχνίδια", t: "Πέτρα – Ψαλίδι – Χαρτί", lvl: 1, hw: "micro:bit",
  d: "Κούνα το micro:bit για τυχαία επιλογή πέτρας, ψαλιδιού ή χαρτιού.",
  v: [
   { l: "MicroPython", c: R`from microbit import *
import random

ROCK = Image("00000:09990:09990:09990:00000")
PAPER = Image("99999:90009:90009:90009:99999")
SCISSORS = Image("99009:99090:00900:99090:99009")

while True:
    if accelerometer.was_gesture("shake"):
        display.show(random.choice([ROCK, PAPER, SCISSORS]))
    sleep(50)` },
   { l: "MakeCode JS", c: R`input.onGesture(Gesture.Shake, function () {
    let hand = randint(1, 3)
    if (hand == 1) {
        basic.showLeds(` + "`" + R`
            . . . . .
            . # # # .
            . # # # .
            . # # # .
            . . . . .
            ` + "`" + R`)
    } else if (hand == 2) {
        basic.showLeds(` + "`" + R`
            # # # # #
            # . . . #
            # . . . #
            # . . . #
            # # # # #
            ` + "`" + R`)
    } else {
        basic.showLeds(` + "`" + R`
            # # . . #
            # # . # .
            . . # . .
            # # . # .
            # # . . #
            ` + "`" + R`)
    }
})` }] },
{ cat: "Παιχνίδια", t: "Αντανακλαστικά (reaction game)", lvl: 2, hw: "micro:bit",
  d: "Περίμενε να εμφανιστεί η καρδιά και πάτα το A όσο πιο γρήγορα μπορείς. Δείχνει τον χρόνο σε ms.",
  v: [
   { l: "MicroPython", c: R`from microbit import *
import random

while True:
    display.show(Image.ARROW_W)
    while not button_a.was_pressed():
        sleep(10)
    display.clear()
    sleep(random.randint(1000, 4000))
    if button_a.was_pressed():
        display.scroll("Too soon!")
        continue
    display.show(Image.HEART)
    start = running_time()
    while not button_a.was_pressed():
        sleep(1)
    display.scroll(str(running_time() - start) + "ms")` },
   { l: "MakeCode JS", c: R`let start = 0
let waiting = false
input.onButtonPressed(Button.A, function () {
    if (waiting) {
        basic.showNumber(input.runningTime() - start)
        waiting = false
    } else {
        basic.clearScreen()
        basic.pause(randint(1000, 4000))
        basic.showIcon(IconNames.Heart)
        start = input.runningTime()
        waiting = true
    }
})` }] },
{ cat: "Αυτοματισμοί", t: "Συναγερμός κίνησης", lvl: 2, hw: "micro:bit V2",
  d: "Οπλίζεις με το A. Αν κάποιος μετακινήσει το micro:bit χτυπάει συναγερμός. Το B αφοπλίζει.",
  v: [
   { l: "MicroPython", c: R`from microbit import *
import music

armed = False
while True:
    if button_a.was_pressed():
        armed = True
        display.show(Image.NO)
        sleep(1000)
        accelerometer.was_gesture("shake")
    if button_b.was_pressed():
        armed = False
        display.show(Image.YES)
    if armed and (accelerometer.was_gesture("shake") or abs(accelerometer.get_x()) > 400):
        while not button_b.is_pressed():
            display.show(Image.ANGRY)
            music.pitch(1000, 200)
            display.clear()
            music.pitch(700, 200)
    sleep(50)` },
   { l: "MakeCode JS", c: R`let armed = false
input.onButtonPressed(Button.A, function () {
    armed = true
    basic.showIcon(IconNames.No)
})
input.onButtonPressed(Button.B, function () {
    armed = false
    music.stopAllSounds()
    basic.showIcon(IconNames.Yes)
})
basic.forever(function () {
    if (armed && Math.abs(input.acceleration(Dimension.X)) > 400) {
        basic.showIcon(IconNames.Angry)
        music.playTone(1000, 200)
        music.playTone(700, 200)
    }
})` }] },
{ cat: "Αυτοματισμοί", t: "Καταγραφή δεδομένων (data logger V2)", lvl: 3, hw: "micro:bit V2",
  d: "Γράφει θερμοκρασία και φως κάθε 10 δευτ. στη μνήμη. Το αρχείο MY_DATA.HTM ανοίγει από τον υπολογιστή.",
  v: [
   { l: "MicroPython", c: R`from microbit import *
import log

log.set_labels("temperature", "light", timestamp=log.SECONDS)
logging = False
while True:
    if button_a.was_pressed():
        logging = not logging
        display.show(Image.YES if logging else Image.NO)
    if button_b.was_pressed():
        log.delete()
        display.show(Image.SKULL)
    if logging:
        log.add(temperature=temperature(), light=display.read_light_level())
        sleep(10000)
    sleep(50)` },
   { l: "MakeCode JS", c: R`// Επεκτάσεις → datalogger
let logging = false
input.onButtonPressed(Button.A, function () {
    logging = !(logging)
    basic.showIcon(logging ? IconNames.Yes : IconNames.No)
})
loops.everyInterval(10000, function () {
    if (logging) {
        datalogger.log(
            datalogger.createCV("temperature", input.temperature()),
            datalogger.createCV("light", input.lightLevel())
        )
    }
})` }] },
];
S.forEach(s => { s.p = "microbit"; });
window.SNIPPETS = (window.SNIPPETS || []).concat(S);
})();
