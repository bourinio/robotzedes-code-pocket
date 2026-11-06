/* LEGO SPIKE Prime — SPIKE App 3 (Python) */
(function () {
const R = String.raw;
const HEAD = R`from hub import light_matrix, button, motion_sensor, sound, port
import runloop
import motor
import motor_pair
import color_sensor
import distance_sensor
import force_sensor
import color
`;
const PAIR = R`
# Μοτέρ οδήγησης: A = αριστερό, B = δεξί
motor_pair.pair(motor_pair.PAIR_1, port.A, port.B)
`;
const S = [
{ cat: "Βασικά", t: "Hello SPIKE: οθόνη & ήχος", lvl: 1, hw: "SPIKE Prime Hub",
  d: "Γράφει κείμενο στον πίνακα LED 5x5, δείχνει εικόνα και παίζει ήχο. Στο SPIKE 3 όλα τρέχουν μέσα σε async main().",
  code: HEAD + R`
async def main():
    await light_matrix.write("Hi!")
    light_matrix.show_image(light_matrix.IMAGE_HAPPY)
    await sound.beep(440, 300, 100)
    await sound.beep(660, 300, 100)
    await runloop.sleep_ms(1000)
    light_matrix.clear()

runloop.run(main())` },
{ cat: "Βασικά", t: "Κουμπιά αριστερά/δεξιά", lvl: 1, hw: "SPIKE Prime Hub",
  d: "Μετρητής: το δεξί κουμπί αυξάνει, το αριστερό μειώνει τον αριθμό στην οθόνη.",
  code: HEAD + R`
async def main():
    count = 0
    light_matrix.write(str(count))
    while True:
        if button.pressed(button.RIGHT):
            count += 1
            light_matrix.write(str(count))
            await runloop.until(lambda: not button.pressed(button.RIGHT))
        if button.pressed(button.LEFT):
            count -= 1
            light_matrix.write(str(count))
            await runloop.until(lambda: not button.pressed(button.LEFT))
        await runloop.sleep_ms(20)

runloop.run(main())` },
{ cat: "Βασικά", t: "Pixels στον πίνακα LED", lvl: 1, hw: "SPIKE Prime Hub",
  d: "Ανάβει pixels ένα-ένα (x, y, φωτεινότητα 0-100) δημιουργώντας ένα κινούμενο φίδι.",
  code: HEAD + R`
async def main():
    for y in range(5):
        for x in range(5):
            light_matrix.set_pixel(x, y, 100)
            await runloop.sleep_ms(80)
    await runloop.sleep_ms(500)
    light_matrix.clear()

runloop.run(main())` },
{ cat: "Βασικά", t: "Μελωδία", lvl: 1, hw: "SPIKE Prime Hub",
  d: "Παίζει μια σειρά από νότες με συχνότητα (Hz) και διάρκεια (ms).",
  code: HEAD + R`
NOTES = [(262, 300), (294, 300), (330, 300), (349, 300),
         (392, 600), (392, 600), (440, 300), (440, 300), (392, 900)]

async def main():
    for freq, ms in NOTES:
        await sound.beep(freq, ms, 80)
        await runloop.sleep_ms(30)

runloop.run(main())` },
{ cat: "Μοτέρ", t: "Ένα μοτέρ: μοίρες, χρόνος, συνεχές", lvl: 1, hw: "Μοτέρ στη θύρα A",
  d: "Οι βασικές εντολές μοτέρ. Η ταχύτητα (velocity) είναι σε μοίρες/δευτερόλεπτο.",
  code: HEAD + R`
async def main():
    # Γύρνα 360° με 720 °/s
    await motor.run_for_degrees(port.A, 360, 720)
    # Γύρνα 2 δευτερόλεπτα ανάποδα
    await motor.run_for_time(port.A, 2000, -500)
    # Πήγαινε σε απόλυτη θέση 0°
    await motor.run_to_absolute_position(port.A, 0, 500)
    # Συνεχής κίνηση και stop
    motor.run(port.A, 300)
    await runloop.sleep_ms(1500)
    motor.stop(port.A)

runloop.run(main())` },
{ cat: "Μοτέρ", t: "Μοτέρ ως ποτενσιόμετρο", lvl: 2, hw: "Μοτέρ στη θύρα A (το γυρνάς με το χέρι)",
  d: "Γυρίζοντας με το χέρι το μοτέρ, η θέση του εμφανίζεται στην οθόνη και αλλάζει τη συχνότητα του ήχου.",
  code: HEAD + R`
async def main():
    motor.reset_relative_position(port.A, 0)
    while True:
        pos = motor.relative_position(port.A)
        light_matrix.write(str(pos // 10))
        await sound.beep(max(100, 300 + pos), 100, 50)

runloop.run(main())` },
{ cat: "Κίνηση", t: "Οδήγηση: μπροστά, στροφή, πίσω", lvl: 1, hw: "Μοτέρ A (αριστερό) + B (δεξί)",
  d: "Ζεύγος μοτέρ με motor_pair. Το steering: 0 = ευθεία, 100 = στροφή επί τόπου δεξιά, -100 αριστερά.",
  code: HEAD + PAIR + R`
async def main():
    await motor_pair.move_for_degrees(motor_pair.PAIR_1, 720, 0, velocity=500)
    await motor_pair.move_for_degrees(motor_pair.PAIR_1, 180, 100, velocity=300)
    await motor_pair.move_for_degrees(motor_pair.PAIR_1, -360, 0, velocity=500)

runloop.run(main())` },
{ cat: "Κίνηση", t: "Κίνηση σε εκατοστά", lvl: 2, hw: "Μοτέρ A + B, τροχοί 5.6 cm",
  d: "Μετατρέπει εκατοστά σε μοίρες τροχού. Περιφέρεια τροχού = π × διάμετρος.",
  code: HEAD + PAIR + R`
WHEEL_CM = 5.6                     # διάμετρος μικρού τροχού SPIKE
CIRCUMFERENCE = 3.1416 * WHEEL_CM

def cm_to_deg(cm):
    return int(cm / CIRCUMFERENCE * 360)

async def drive_cm(cm, speed=500):
    await motor_pair.move_for_degrees(motor_pair.PAIR_1, cm_to_deg(cm), 0, velocity=speed)

async def main():
    await drive_cm(30)
    await drive_cm(-15)

runloop.run(main())` },
{ cat: "Κίνηση", t: "Τετράγωνο με tank", lvl: 1, hw: "Μοτέρ A + B",
  d: "Κίνηση τύπου tank (ξεχωριστή ταχύτητα κάθε τροχού) για να σχεδιάσει τετράγωνο.",
  code: HEAD + PAIR + R`
async def main():
    for i in range(4):
        await motor_pair.move_tank_for_degrees(motor_pair.PAIR_1, 600, 500, 500)
        await motor_pair.move_tank_for_degrees(motor_pair.PAIR_1, 190, 300, -300)

runloop.run(main())` },
{ cat: "Κίνηση", t: "Ακριβής στροφή με γυροσκόπιο", lvl: 2, hw: "Μοτέρ A + B",
  d: "Χρησιμοποιεί το εσωτερικό γυροσκόπιο (yaw) του hub για στροφή ακριβώς 90°. Οι τιμές είναι σε δέκατα μοίρας.",
  code: HEAD + PAIR + R`
async def turn(degrees):
    motion_sensor.reset_yaw(0)
    await runloop.until(motion_sensor.stable)
    target = degrees * 10
    if degrees > 0:
        motor_pair.move_tank(motor_pair.PAIR_1, 200, -200)
        await runloop.until(lambda: -motion_sensor.tilt_angles()[0] >= target)
    else:
        motor_pair.move_tank(motor_pair.PAIR_1, -200, 200)
        await runloop.until(lambda: -motion_sensor.tilt_angles()[0] <= target)
    motor_pair.stop(motor_pair.PAIR_1)

async def main():
    await turn(90)
    await runloop.sleep_ms(500)
    await turn(-90)

runloop.run(main())` },
{ cat: "Κίνηση", t: "Ευθεία με διόρθωση γυροσκοπίου", lvl: 3, hw: "Μοτέρ A + B",
  d: "Κρατά σταθερή πορεία: αν το ρομπότ φύγει από τη γωνία 0, διορθώνει το steering αναλογικά.",
  code: HEAD + PAIR + R`
async def main():
    motion_sensor.reset_yaw(0)
    motor.reset_relative_position(port.A, 0)
    Kp = 0.3
    while abs(motor.relative_position(port.A)) < 1500:
        yaw = motion_sensor.tilt_angles()[0]      # δέκατα μοίρας
        steering = int(max(-100, min(100, Kp * yaw)))
        motor_pair.move(motor_pair.PAIR_1, steering, velocity=500)
        await runloop.sleep_ms(10)
    motor_pair.stop(motor_pair.PAIR_1)

runloop.run(main())` },
{ cat: "Αισθητήρες", t: "Distance sensor: stop στα 10 cm", lvl: 1, hw: "Distance στη θύρα D, μοτέρ A + B",
  d: "Προχωρά μέχρι το εμπόδιο να είναι κοντύτερα από 100 mm. Η τιμή -1 σημαίνει «δεν βλέπω τίποτα».",
  code: HEAD + PAIR + R`
def close():
    d = distance_sensor.distance(port.D)
    return d != -1 and d < 100

async def main():
    motor_pair.move(motor_pair.PAIR_1, 0, velocity=400)
    await runloop.until(close)
    motor_pair.stop(motor_pair.PAIR_1)
    light_matrix.show_image(light_matrix.IMAGE_SURPRISED)
    await sound.beep(880, 300, 100)

runloop.run(main())` },
{ cat: "Αισθητήρες", t: "Color sensor: χρώμα → αντίδραση", lvl: 1, hw: "Color στη θύρα C",
  d: "Ανάλογα με το χρώμα δείχνει διαφορετικό γράμμα και ήχο.",
  code: HEAD + R`
async def main():
    while True:
        c = color_sensor.color(port.C)
        if c == color.RED:
            light_matrix.write("R")
            await sound.beep(300, 200, 80)
        elif c == color.GREEN:
            light_matrix.write("G")
            await sound.beep(600, 200, 80)
        elif c == color.BLUE:
            light_matrix.write("B")
            await sound.beep(900, 200, 80)
        else:
            light_matrix.clear()
        await runloop.sleep_ms(100)

runloop.run(main())` },
{ cat: "Αισθητήρες", t: "Force sensor: κουμπί εκκίνησης", lvl: 1, hw: "Force στη θύρα E, μοτέρ A + B",
  d: "Ξεκινά όταν πατηθεί ο αισθητήρας δύναμης. Η force() δίνει τιμή σε δεκάτους του Newton.",
  code: HEAD + PAIR + R`
async def main():
    light_matrix.write("?")
    await runloop.until(lambda: force_sensor.pressed(port.E))
    light_matrix.show_image(light_matrix.IMAGE_YES)
    await motor_pair.move_for_degrees(motor_pair.PAIR_1, 720, 0, velocity=500)
    while True:
        light_matrix.write(str(force_sensor.force(port.E) // 10))
        await runloop.sleep_ms(200)

runloop.run(main())` },
{ cat: "Αισθητήρες", t: "Κλίση hub (tilt)", lvl: 2, hw: "SPIKE Prime Hub",
  d: "Δείχνει βέλος προς την πλευρά που γέρνει το hub (pitch / roll σε δέκατα μοίρας).",
  code: HEAD + R`
async def main():
    while True:
        yaw, pitch, roll = motion_sensor.tilt_angles()
        if pitch > 200:
            light_matrix.show_image(light_matrix.IMAGE_ARROW_N)
        elif pitch < -200:
            light_matrix.show_image(light_matrix.IMAGE_ARROW_S)
        elif roll > 200:
            light_matrix.show_image(light_matrix.IMAGE_ARROW_E)
        elif roll < -200:
            light_matrix.show_image(light_matrix.IMAGE_ARROW_W)
        else:
            light_matrix.show_image(light_matrix.IMAGE_SQUARE_SMALL)
        await runloop.sleep_ms(50)

runloop.run(main())` },
{ cat: "Line Follower", t: "Line follower: απλός", lvl: 1, hw: "Color C (κοιτά κάτω), μοτέρ A + B",
  d: "Ακολουθεί την άκρη της μαύρης γραμμής με δύο καταστάσεις (zig-zag).",
  code: HEAD + PAIR + R`
THRESHOLD = 50

async def main():
    while True:
        if color_sensor.reflection(port.C) < THRESHOLD:
            motor_pair.move_tank(motor_pair.PAIR_1, 100, 350)
        else:
            motor_pair.move_tank(motor_pair.PAIR_1, 350, 100)
        await runloop.sleep_ms(5)

runloop.run(main())` },
{ cat: "Line Follower", t: "Line follower: PID", lvl: 3, hw: "Color C, μοτέρ A + B",
  d: "Ομαλή και γρήγορη ακολούθηση με PID. Ρύθμισε πρώτα το Kp, μετά το Kd, τελευταίο το Ki.",
  code: HEAD + PAIR + R`
TARGET = 50
BASE = 350
Kp, Ki, Kd = 4.0, 0.0, 12.0

async def main():
    integral = 0
    last_error = 0
    while not button.pressed(button.LEFT):
        error = color_sensor.reflection(port.C) - TARGET
        integral = max(-300, min(300, integral + error))
        derivative = error - last_error
        turn = int(Kp * error + Ki * integral + Kd * derivative)
        motor_pair.move_tank(motor_pair.PAIR_1, BASE + turn, BASE - turn)
        last_error = error
        await runloop.sleep_ms(5)
    motor_pair.stop(motor_pair.PAIR_1)

runloop.run(main())` },
{ cat: "Line Follower", t: "Line follower με 2 αισθητήρες + διασταυρώσεις", lvl: 3, hw: "Color C (αριστερά) + D (δεξιά), μοτέρ A + B",
  d: "Δύο αισθητήρες εκατέρωθεν της γραμμής. Μετράει διασταυρώσεις (και οι δύο στο μαύρο) και σταματά στην 3η.",
  code: HEAD + PAIR + R`
BLACK = 30

async def main():
    crossings = 0
    while crossings < 3:
        left = color_sensor.reflection(port.C)
        right = color_sensor.reflection(port.D)
        if left < BLACK and right < BLACK:
            crossings += 1
            light_matrix.write(str(crossings))
            await motor_pair.move_for_degrees(motor_pair.PAIR_1, 90, 0, velocity=300)
        else:
            turn = (left - right) * 3
            motor_pair.move_tank(motor_pair.PAIR_1, 300 + turn, 300 - turn)
        await runloop.sleep_ms(5)
    motor_pair.stop(motor_pair.PAIR_1)

runloop.run(main())` },
{ cat: "Obstacle Avoidance", t: "Αποφυγή εμποδίων", lvl: 2, hw: "Distance D, μοτέρ A + B",
  d: "Κινείται και όταν βρει εμπόδιο κάνει πίσω και στρίβει.",
  code: HEAD + PAIR + R`
async def main():
    while True:
        d = distance_sensor.distance(port.D)
        if d != -1 and d < 150:
            motor_pair.stop(motor_pair.PAIR_1)
            await motor_pair.move_for_degrees(motor_pair.PAIR_1, -200, 0, velocity=400)
            await motor_pair.move_for_degrees(motor_pair.PAIR_1, 200, 100, velocity=300)
        else:
            motor_pair.move(motor_pair.PAIR_1, 0, velocity=500)
        await runloop.sleep_ms(20)

runloop.run(main())` },
{ cat: "Sumo", t: "Sumo SPIKE", lvl: 3, hw: "Color C (κάτω), Distance D (μπροστά), μοτέρ A + B",
  d: "Ψάχνει τον αντίπαλο, επιτίθεται με full ταχύτητα και αποφεύγει την άσπρη άκρη.",
  code: HEAD + PAIR + R`
WHITE = 60

async def main():
    for i in [3, 2, 1]:
        light_matrix.write(str(i))
        await runloop.sleep_ms(1000)
    while True:
        d = distance_sensor.distance(port.D)
        if color_sensor.reflection(port.C) > WHITE:
            await motor_pair.move_for_degrees(motor_pair.PAIR_1, -300, 0, velocity=800)
            await motor_pair.move_for_degrees(motor_pair.PAIR_1, 250, 100, velocity=600)
        elif d != -1 and d < 400:
            motor_pair.move(motor_pair.PAIR_1, 0, velocity=1000)
        else:
            motor_pair.move_tank(motor_pair.PAIR_1, 300, -300)
        await runloop.sleep_ms(5)

runloop.run(main())` },
{ cat: "Αυτοματισμοί", t: "Πολλαπλές εργασίες ταυτόχρονα", lvl: 3, hw: "Μοτέρ A + B",
  d: "Με runloop.run(task1(), task2()) τρέχουν παράλληλα: κίνηση και κινούμενη εικόνα.",
  code: HEAD + PAIR + R`
async def drive():
    for i in range(4):
        await motor_pair.move_for_degrees(motor_pair.PAIR_1, 500, 0, velocity=400)
        await motor_pair.move_for_degrees(motor_pair.PAIR_1, 190, 100, velocity=300)

async def blink():
    for i in range(20):
        light_matrix.show_image(light_matrix.IMAGE_HEART)
        await runloop.sleep_ms(300)
        light_matrix.show_image(light_matrix.IMAGE_HEART_SMALL)
        await runloop.sleep_ms(300)

runloop.run(drive(), blink())` },
{ cat: "Αυτοματισμοί", t: "Μπάρα στάθμευσης", lvl: 2, hw: "Distance D, μοτέρ C (μπάρα)",
  d: "Όταν πλησιάσει αυτοκίνητο, η μπάρα σηκώνεται, περιμένει 3 δευτ. και κατεβαίνει.",
  code: HEAD + R`
def car_here():
    d = distance_sensor.distance(port.D)
    return d != -1 and d < 100

async def main():
    await motor.run_to_absolute_position(port.C, 0, 300)
    while True:
        await runloop.until(car_here)
        distance_sensor.show(port.D, [100, 100, 100, 100])
        await motor.run_to_absolute_position(port.C, 90, 300)
        await runloop.sleep_ms(3000)
        await motor.run_to_absolute_position(port.C, 0, 300)
        distance_sensor.clear(port.D)

runloop.run(main())` },
];
S.forEach(s => { s.p = "spike"; s.lang = "SPIKE 3 Python"; });
window.SNIPPETS = (window.SNIPPETS || []).concat(S);
})();
