/* Διαγωνισμοί ρομποτικής.
 * Οι μήνες (m) είναι η ΣΥΝΗΘΗΣ περίοδος κάθε φάσης· η εφαρμογή υπολογίζει την επόμενη εμφάνιση.
 * Οι κανόνες (ηλικίες, μέλη, υλικό) είναι ενδεικτικοί: αλλάζουν κάθε σεζόν, έλεγξε τον επίσημο κανονισμό.
 *
 * Πεδία:
 *  id, name, em, org, url, d          βασικά στοιχεία
 *  gr        true αν υπάρχει εθνική φάση στην Ελλάδα (αλλιώς χρειάζεται ταξίδι στο εξωτερικό)
 *  events    [{ n: "Φάση", m: [απόΜήνα, έωςΜήνα], intl: true/false }]  (1–12, επιτρέπεται Νοε→Μαρ)
 *  reg       [απόΜήνα, έωςΜήνα] συνήθης περίοδος εγγραφών
 *  cost      [min, max] € ενδεικτικό κόστος σεζόν ανά ομάδα (εγγραφή + αναλώσιμα, χωρίς ταξίδι εξωτερικού)
 *  prep      προτεινόμενοι μήνες προετοιμασίας
 *  lvl       1 Αρχάριο · 2 Μέσο · 3 Προχωρημένο
 *  coach     απαιτείται ενήλικας προπονητής
 *  school    απαιτείται σχολική ομάδα
 *  select    επιλογή μίας ομάδας ανά χώρα από εθνικό φορέα
 *  cats      κατηγορίες: { n, age: [min, max], team: [min, max], hw: [...] | "any" | "none", note }
 *            hw: λίστα εξοπλισμού (αρκεί ένα από αυτά), "any" = οποιοσδήποτε προγραμματιζόμενος ελεγκτής,
 *            "none" = το υλικό δίνεται από τη διοργάνωση
 */
window.COMPETITIONS = [
  {
    id: "wro", name: "World Robot Olympiad (WRO)", em: "🌍", org: "WRO Association · WRO Hellas",
    url: "https://wro-association.org", gr: true,
    d: "Ο πιο διαδεδομένος μαθητικός διαγωνισμός στην Ελλάδα. Εθνικός τελικός (WRO Hellas) και διεθνής τελικός για τις καλύτερες ομάδες. Κάθε χρόνο νέο θέμα και νέες πίστες.",
    events: [
      { n: "Εθνικός τελικός Ελλάδας (WRO Hellas)", m: [5, 6] },
      { n: "Διεθνής τελικός", m: [11, 11], intl: true },
    ],
    reg: [1, 3], cost: [150, 600], prep: 4, lvl: 1, coach: true,
    cats: [
      { n: "RoboMission Elementary", age: [8, 12], team: [2, 3], hw: "any", note: "Συνήθως LEGO SPIKE Prime / EV3" },
      { n: "RoboMission Junior", age: [11, 15], team: [2, 3], hw: "any", note: "Συνήθως LEGO SPIKE Prime / EV3" },
      { n: "RoboMission Senior", age: [14, 19], team: [2, 3], hw: "any", note: "Συνήθως LEGO SPIKE Prime / EV3" },
      { n: "Future Innovators", age: [8, 19], team: [2, 3], hw: "any", note: "Έργο με θέμα της χρονιάς, οποιοδήποτε υλικό" },
      { n: "Future Engineers", age: [14, 22], team: [2, 3], hw: ["raspi", "arduino", "esp32", "pico", "spike", "ev3"], note: "Αυτόνομο όχημα με κάμερα· συνήθως Raspberry Pi + Arduino" },
      { n: "RoboSports", age: [11, 19], team: [2, 3], hw: "any", note: "Δύο ρομπότ ανά ομάδα, παιχνίδι με μπάλα" },
    ],
  },
  {
    id: "ellak", name: "Πανελλήνιος Μαθητικός Διαγωνισμός Ανοιχτών Τεχνολογιών", em: "🇬🇷", org: "ΕΕΛΛΑΚ",
    url: "https://opensource.ellak.gr", gr: true,
    d: "Σχολικές ομάδες φτιάχνουν έργο ρομποτικής ή αυτοματισμού με ανοιχτό υλικό (Arduino, micro:bit, Raspberry Pi) και ανοιχτό λογισμικό. Χωρίς κόστος συμμετοχής.",
    events: [
      { n: "Υποβολή πρότασης", m: [12, 2] },
      { n: "Τελική παρουσίαση", m: [5, 5] },
    ],
    reg: [10, 1], cost: [0, 200], prep: 5, lvl: 1, coach: true, school: true,
    cats: [
      { n: "Δημοτικό", age: [8, 12], team: [2, 10], hw: ["arduino", "microbit", "raspi", "esp32", "pico", "mbot"] },
      { n: "Γυμνάσιο", age: [12, 15], team: [2, 10], hw: ["arduino", "microbit", "raspi", "esp32", "pico", "mbot"] },
      { n: "Λύκειο", age: [15, 18], team: [2, 10], hw: ["arduino", "microbit", "raspi", "esp32", "pico", "mbot"] },
    ],
  },
  {
    id: "fll", name: "FIRST LEGO League Challenge", em: "🧩", org: "FIRST · LEGO Education",
    url: "https://www.firstlegoleague.org", gr: false,
    d: "Ρομποτικό παιχνίδι αποστολών σε τραπέζι, ερευνητικό έργο και αξίες ομαδικότητας (Core Values). Νέο θέμα κάθε Αύγουστο.",
    events: [
      { n: "Τουρνουά / εθνικοί τελικοί", m: [11, 3], intl: true },
      { n: "FIRST Championship & Open Internationals", m: [4, 6], intl: true },
    ],
    reg: [8, 10], cost: [400, 1200], prep: 4, lvl: 2, coach: true,
    cats: [
      { n: "Challenge", age: [9, 16], team: [2, 10], hw: ["spike", "ev3"], note: "Μόνο LEGO Education (SPIKE Prime / EV3)" },
    ],
  },
  {
    id: "fllexp", name: "FIRST LEGO League Explore", em: "🔍", org: "FIRST · LEGO Education",
    url: "https://www.firstlegoleague.org", gr: false,
    d: "Για μικρούς: μοντέλο LEGO με κίνηση και αφίσα ομάδας. Χωρίς βαθμολογία, γιορτή συμμετοχής.",
    events: [{ n: "Φεστιβάλ (Expo)", m: [1, 5], intl: true }],
    reg: [8, 11], cost: [200, 500], prep: 3, lvl: 1, coach: true,
    cats: [
      { n: "Explore", age: [6, 10], team: [2, 6], hw: ["spikeess", "spike"], note: "LEGO SPIKE Essential" },
    ],
  },
  {
    id: "ftc", name: "FIRST Tech Challenge (FTC)", em: "⚙️", org: "FIRST",
    url: "https://www.firstinspires.org/robotics/ftc", gr: false,
    d: "Ρομπότ μεσαίου μεγέθους με μεταλλικά εξαρτήματα, Android Control Hub και Java/Blocks. Συμμαχίες 2 ομάδων.",
    events: [
      { n: "Qualifiers / Regionals", m: [10, 3], intl: true },
      { n: "FIRST Championship", m: [4, 4], intl: true },
    ],
    reg: [5, 9], cost: [2000, 5000], prep: 5, lvl: 3, coach: true,
    cats: [
      { n: "FTC", age: [12, 18], team: [2, 15], hw: ["rev"], note: "REV Control Hub + kit (REV / goBILDA)" },
    ],
  },
  {
    id: "frc", name: "FIRST Robotics Competition (FRC)", em: "🏗️", org: "FIRST",
    url: "https://www.firstinspires.org/robotics/frc", gr: false,
    d: "Μεγάλα ρομπότ (έως ~55 kg), 6 εβδομάδες κατασκευής μετά το kickoff του Ιανουαρίου. Απαιτεί εργαστήριο, χορηγούς και μεγάλη ομάδα.",
    events: [
      { n: "Regionals / District events", m: [2, 4], intl: true },
      { n: "FIRST Championship", m: [4, 4], intl: true },
    ],
    reg: [8, 11], cost: [15000, 40000], prep: 4, lvl: 3, coach: true,
    cats: [
      { n: "FRC", age: [14, 18], team: [10, 60], hw: ["frc"], note: "Kit of Parts FRC + εργαστήριο κατασκευών" },
    ],
  },
  {
    id: "fgc", name: "FIRST Global Challenge", em: "🌐", org: "FIRST Global",
    url: "https://first.global", gr: true,
    d: "«Ολυμπιάδα» ρομποτικής: μία εθνική ομάδα ανά χώρα. Το kit δίνεται από τη διοργάνωση. Η Ελλάδα επιλέγει ομάδα μέσω εθνικού φορέα.",
    events: [{ n: "Παγκόσμιος διαγωνισμός", m: [9, 10], intl: true }],
    reg: [1, 4], cost: [0, 1500], prep: 5, lvl: 2, coach: true, select: true,
    cats: [
      { n: "Εθνική ομάδα", age: [14, 18], team: [3, 7], hw: "none", note: "Το kit δίνεται από το FIRST Global" },
    ],
  },
  {
    id: "vexiq", name: "VEX IQ Robotics Competition", em: "🟦", org: "REC Foundation",
    url: "https://www.vexrobotics.com/competition", gr: false,
    d: "Πλαστικό σύστημα VEX IQ, παιχνίδι συνεργασίας 2 ομάδων και αποστολές προγραμματισμού. Το νέο παιχνίδι ανακοινώνεται κάθε Μάιο.",
    events: [
      { n: "Τουρνουά σεζόν", m: [9, 3], intl: true },
      { n: "VEX Robotics World Championship", m: [4, 5], intl: true },
    ],
    reg: [5, 10], cost: [600, 1500], prep: 4, lvl: 1, coach: true,
    cats: [
      { n: "Elementary School", age: [8, 11], team: [2, 10], hw: ["vexiq"] },
      { n: "Middle School", age: [11, 15], team: [2, 10], hw: ["vexiq"] },
    ],
  },
  {
    id: "vexv5", name: "VEX V5 Robotics Competition", em: "🔩", org: "REC Foundation",
    url: "https://www.vexrobotics.com/competition", gr: false,
    d: "Μεταλλικά ρομπότ VEX V5, αυτόνομη περίοδος και τηλεχειρισμός, συμμαχίες 2 ομάδων.",
    events: [
      { n: "Τουρνουά σεζόν", m: [9, 3], intl: true },
      { n: "VEX Robotics World Championship", m: [4, 5], intl: true },
    ],
    reg: [5, 10], cost: [1500, 4000], prep: 5, lvl: 2, coach: true,
    cats: [
      { n: "Middle School", age: [11, 15], team: [2, 15], hw: ["vexv5"] },
      { n: "High School", age: [14, 19], team: [2, 15], hw: ["vexv5"] },
    ],
  },
  {
    id: "rcj", name: "RoboCup Junior", em: "⚽", org: "RoboCup Federation",
    url: "https://junior.robocup.org", gr: false,
    d: "Ποδόσφαιρο ρομπότ, διάσωση σε γραμμή ή λαβύρινθο και καλλιτεχνική παράσταση. Οποιοδήποτε υλικό. Το διεθνές διεξάγεται μαζί με το RoboCup.",
    events: [
      { n: "Περιφερειακά / εθνικά (άλλες χώρες)", m: [2, 5], intl: true },
      { n: "RoboCup Junior International", m: [7, 7], intl: true },
    ],
    reg: [11, 2], cost: [300, 1500], prep: 5, lvl: 2, coach: true,
    cats: [
      { n: "Rescue Line", age: [11, 19], team: [2, 4], hw: "any", note: "Για το διεθνές: 14–19 ετών" },
      { n: "Rescue Maze", age: [11, 19], team: [2, 4], hw: "any", note: "Για το διεθνές: 14–19 ετών" },
      { n: "Soccer", age: [11, 19], team: [2, 4], hw: "any", note: "Για το διεθνές: 14–19 ετών· καλύτερα custom PCB" },
      { n: "OnStage", age: [11, 19], team: [2, 5], hw: "any", note: "Για το διεθνές: 14–19 ετών" },
    ],
  },
  {
    id: "robotex", name: "Robotex International", em: "🏁", org: "Robotex (Ταλίν, Εσθονία)",
    url: "https://robotex.international", gr: false,
    d: "Ένα από τα μεγαλύτερα φεστιβάλ ρομποτικής στην Ευρώπη: line following, sumo, folkrace, LEGO κατηγορίες. Ανοιχτό σε όλες τις ηλικίες· ιδανικό για ρομπότ Arduino / mBot.",
    events: [{ n: "Robotex International (Ταλίν)", m: [11, 12], intl: true }],
    reg: [9, 11], cost: [100, 400], prep: 2, lvl: 1, coach: false,
    cats: [
      { n: "Line Following", age: [7, 99], team: [1, 5], hw: "any" },
      { n: "Mini Sumo / Sumo", age: [7, 99], team: [1, 5], hw: "any" },
      { n: "LEGO Sumo / LEGO Challenge", age: [7, 19], team: [1, 5], hw: ["spike", "ev3"] },
      { n: "Folkrace", age: [7, 99], team: [1, 5], hw: "any" },
    ],
  },
  {
    id: "makex", name: "MakeX Robotics Competition", em: "🤖", org: "Makeblock",
    url: "https://www.makex.cc", gr: false,
    d: "Διαγωνισμός της Makeblock με κατηγορίες από δημιουργικά έργα έως μάχες ρομπότ. Χρησιμοποιεί υλικό Makeblock (mBot2, MakeX kits).",
    events: [
      { n: "Περιφερειακοί διαγωνισμοί", m: [3, 10], intl: true },
      { n: "MakeX World Championship", m: [12, 12], intl: true },
    ],
    reg: [2, 8], cost: [300, 1200], prep: 3, lvl: 1, coach: true,
    cats: [
      { n: "Spark / Starter", age: [6, 13], team: [2, 4], hw: ["mbot"], note: "mBot2 / Makeblock kit της σεζόν" },
      { n: "Challenge", age: [13, 18], team: [2, 4], hw: ["mbot"], note: "Kit MakeX Challenge της σεζόν" },
    ],
  },
  {
    id: "eurobot", name: "Eurobot", em: "🇪🇺", org: "Eurobot",
    url: "https://www.eurobot.org", gr: false,
    d: "Αυτόνομα ρομπότ σε τραπέζι αγώνων, 100 δευτερόλεπτα ανά αγώνα. Για μεγαλύτερους μαθητές, φοιτητές και ομίλους.",
    events: [
      { n: "Εθνικοί προκριματικοί (άλλες χώρες)", m: [4, 5], intl: true },
      { n: "Eurobot Open – τελικός", m: [5, 6], intl: true },
    ],
    reg: [9, 1], cost: [800, 3000], prep: 6, lvl: 3, coach: false,
    cats: [
      { n: "Eurobot Open", age: [15, 30], team: [2, 10], hw: "any", note: "Συνήθως ESP32 / STM32 / Raspberry Pi + 3D printing" },
    ],
  },
  {
    id: "erc", name: "European Rover Challenge", em: "🪐", org: "European Space Foundation",
    url: "https://roverchallenge.eu", gr: false,
    d: "Διαστημικά οχήματα (rovers) σε προσομοίωση εδάφους του Άρη. Για φοιτητικές ομάδες και ερευνητικά εργαστήρια.",
    events: [{ n: "Τελικοί (Πολωνία)", m: [9, 9], intl: true }],
    reg: [11, 2], cost: [5000, 20000], prep: 9, lvl: 3, coach: false,
    cats: [
      { n: "On-site", age: [18, 35], team: [6, 30], hw: ["raspi", "esp32", "arduino"], note: "Πανεπιστημιακές ομάδες" },
    ],
  },
];

/* Εξοπλισμός που μπορεί να έχει μια ομάδα: κλειδί → όνομα, ενδεικτικό κόστος αγοράς (€) */
window.EQUIPMENT = [
  { k: "spike",    n: "LEGO SPIKE Prime",           cost: 450 },
  { k: "ev3",      n: "LEGO MINDSTORMS EV3",        cost: 400 },
  { k: "spikeess", n: "LEGO SPIKE Essential",       cost: 300 },
  { k: "microbit", n: "micro:bit (ή Maqueen)",      cost: 40 },
  { k: "arduino",  n: "Arduino UNO / Nano",         cost: 40 },
  { k: "mbot",     n: "Makeblock mBot / mBot2",     cost: 150 },
  { k: "esp32",    n: "ESP32",                      cost: 15 },
  { k: "pico",     n: "Raspberry Pi Pico",          cost: 10 },
  { k: "raspi",    n: "Raspberry Pi 4/5",           cost: 90 },
  { k: "vexiq",    n: "VEX IQ",                     cost: 600 },
  { k: "vexv5",    n: "VEX V5",                     cost: 1800 },
  { k: "rev",      n: "REV / goBILDA (FTC kit)",    cost: 2200 },
  { k: "frc",      n: "FRC Kit of Parts",           cost: 8000 },
];
