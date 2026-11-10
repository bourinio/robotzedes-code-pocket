/* Διαγωνισμοί ρομποτικής σε όλο τον κόσμο.
 *
 * ΣΗΜΑΝΤΙΚΟ: οι μήνες (m) είναι η ΣΥΝΗΘΗΣ περίοδος κάθε φάσης και οι κανόνες είναι ενδεικτικοί.
 * Αλλάζουν κάθε σεζόν: ενημέρωσέ τους από τον επίσημο κανονισμό.
 *
 * id, name, em, org, url     βασικά στοιχεία
 * d        { el, en } περιγραφή
 * nat      "wide":   υπάρχουν εθνικές/περιφερειακές φάσεις σε πολλές χώρες
 *          "select": μία εθνική ομάδα ανά χώρα (επιλογή από εθνικό φορέα)
 *          "none":   ένας διεθνής διαγωνισμός (στη χώρα host)
 *          "local":  διαγωνισμός μόνο για τις χώρες του `only`
 * natIn    χώρες (ISO) όπου έχει επιβεβαιωθεί εθνική φάση
 * host     χώρα (ISO) του διεθνούς διαγωνισμού, αν είναι σταθερή
 * only     μόνο ομάδες από αυτές τις χώρες
 * events   [{ n: {el,en}, m: [από, έως], intl }]   μήνες 1–12 (επιτρέπεται π.χ. [11, 3])
 * reg      [από, έως] συνήθης περίοδος εγγραφών
 * cost     [min, max] € κόστος σεζόν ανά ομάδα (εγγραφή + αναλώσιμα, χωρίς εξοπλισμό και ταξίδι)
 * prep     προτεινόμενοι μήνες προετοιμασίας · lvl 1 Αρχάριο, 2 Μέσο, 3 Προχωρημένο
 * coach    απαιτείται ενήλικας προπονητής · school: μόνο σχολικές ομάδες
 * cats     [{ n, age:[min,max], team:[min,max], hw, rec, note:{el,en} }]
 *          hw: λίστα κλειδιών εξοπλισμού (αρκεί ένα) · "any" οποιοσδήποτε ελεγκτής · "none" το δίνει η διοργάνωση
 *          rec: προτεινόμενα εργαλεία (π.χ. printer3d) – δεν είναι υποχρεωτικά
 */
const OPEN_HW = ["arduino", "microbit", "raspi", "esp32", "pico", "mbot"];

window.RA_COMPETITIONS = [
  {
    id: "wro", name: "World Robot Olympiad (WRO)", em: "🌍", org: "WRO Association", url: "https://wro-association.org",
    nat: "wide", natIn: ["GR"],
    d: { el: "Από τους πιο διαδεδομένους μαθητικούς διαγωνισμούς παγκοσμίως. Εθνικοί τελικοί σε δεκάδες χώρες και διεθνής τελικός για τις καλύτερες ομάδες. Νέο θέμα κάθε χρόνο.",
         en: "One of the most widespread student competitions worldwide. National finals in dozens of countries and an international final for the best teams. New theme every year." },
    events: [
      { n: { el: "Εθνικοί τελικοί", en: "National finals" }, m: [5, 6] },
      { n: { el: "Διεθνής τελικός", en: "International final" }, m: [11, 11], intl: true },
    ],
    reg: [1, 3], cost: [150, 600], prep: 4, lvl: 1, coach: true,
    cats: [
      { n: "RoboMission Elementary", age: [8, 12], team: [2, 3], hw: "any", note: { el: "Συνήθως LEGO SPIKE Prime / EV3", en: "Usually LEGO SPIKE Prime / EV3" } },
      { n: "RoboMission Junior", age: [11, 15], team: [2, 3], hw: "any", note: { el: "Συνήθως LEGO SPIKE Prime / EV3", en: "Usually LEGO SPIKE Prime / EV3" } },
      { n: "RoboMission Senior", age: [14, 19], team: [2, 3], hw: "any", note: { el: "Συνήθως LEGO SPIKE Prime / EV3", en: "Usually LEGO SPIKE Prime / EV3" } },
      { n: "Future Innovators", age: [8, 19], team: [2, 3], hw: "any", note: { el: "Έργο με το θέμα της χρονιάς, οποιοδήποτε υλικό", en: "Project on the season theme, any materials" } },
      { n: "Future Engineers", age: [14, 22], team: [2, 3], hw: ["raspi", "arduino", "esp32", "pico", "spike", "ev3"], rec: ["camera", "printer3d"], note: { el: "Αυτόνομο όχημα με κάμερα", en: "Autonomous car with camera" } },
      { n: "RoboSports", age: [11, 19], team: [2, 3], hw: "any", note: { el: "Δύο ρομπότ ανά ομάδα, παιχνίδι με μπάλα", en: "Two robots per team, ball game" } },
    ],
  },
  {
    id: "fll", name: "FIRST LEGO League Challenge", em: "🧩", org: "FIRST · LEGO Education", url: "https://www.firstlegoleague.org",
    nat: "wide", natIn: [],
    d: { el: "Ρομποτικό παιχνίδι αποστολών, ερευνητικό έργο και Core Values. Το θέμα ανακοινώνεται κάθε Αύγουστο. Τουρνουά σε περίπου 100 χώρες.",
         en: "Robot game missions, an innovation project and Core Values. The theme is released every August. Tournaments in about 100 countries." },
    events: [
      { n: { el: "Τουρνουά / εθνικοί τελικοί", en: "Tournaments / national finals" }, m: [11, 3] },
      { n: { el: "FIRST Championship & Open Internationals", en: "FIRST Championship & Open Internationals" }, m: [4, 6], intl: true },
    ],
    reg: [8, 10], cost: [400, 1200], prep: 4, lvl: 2, coach: true,
    cats: [{ n: "Challenge", age: [9, 16], team: [2, 10], hw: ["spike", "ev3"], note: { el: "Μόνο LEGO Education", en: "LEGO Education only" } }],
  },
  {
    id: "fllexp", name: "FIRST LEGO League Explore", em: "🔍", org: "FIRST · LEGO Education", url: "https://www.firstlegoleague.org",
    nat: "wide", natIn: [],
    d: { el: "Για μικρούς: μοντέλο LEGO με κίνηση και αφίσα ομάδας. Χωρίς βαθμολογία.", en: "For young kids: a moving LEGO model and a team poster. Non-competitive." },
    events: [{ n: { el: "Φεστιβάλ (Expo)", en: "Festivals (Expo)" }, m: [1, 5] }],
    reg: [8, 11], cost: [200, 500], prep: 3, lvl: 1, coach: true,
    cats: [{ n: "Explore", age: [6, 10], team: [2, 6], hw: ["spikeess", "spike"] }],
  },
  {
    id: "ftc", name: "FIRST Tech Challenge (FTC)", em: "⚙️", org: "FIRST", url: "https://www.firstinspires.org/robotics/ftc",
    nat: "wide", natIn: [],
    d: { el: "Μεσαία ρομπότ με μεταλλικά εξαρτήματα και Android Control Hub, συμμαχίες 2 ομάδων.", en: "Mid-size metal robots with an Android Control Hub, alliances of 2 teams." },
    events: [
      { n: { el: "Qualifiers / Regionals", en: "Qualifiers / Regionals" }, m: [10, 3] },
      { n: { el: "FIRST Championship", en: "FIRST Championship" }, m: [4, 4], intl: true },
    ],
    reg: [5, 9], cost: [500, 1500], prep: 5, lvl: 3, coach: true,
    cats: [{ n: "FTC", age: [12, 18], team: [2, 15], hw: ["rev"], rec: ["printer3d"] }],
  },
  {
    id: "frc", name: "FIRST Robotics Competition (FRC)", em: "🏗️", org: "FIRST", url: "https://www.firstinspires.org/robotics/frc",
    nat: "wide", natIn: [],
    d: { el: "Μεγάλα ρομπότ, 6–8 εβδομάδες κατασκευής μετά το kickoff του Ιανουαρίου. Χρειάζεται εργαστήριο, χορηγούς και μεγάλη ομάδα.",
         en: "Large robots built in 6–8 weeks after the January kickoff. Needs a workshop, sponsors and a big team." },
    events: [
      { n: { el: "Regionals / District events", en: "Regionals / District events" }, m: [2, 4] },
      { n: { el: "FIRST Championship", en: "FIRST Championship" }, m: [4, 4], intl: true },
    ],
    reg: [8, 11], cost: [6000, 25000], prep: 4, lvl: 3, coach: true,
    cats: [{ n: "FRC", age: [14, 18], team: [10, 60], hw: ["frc"], rec: ["printer3d"] }],
  },
  {
    id: "fgc", name: "FIRST Global Challenge", em: "🌐", org: "FIRST Global", url: "https://first.global",
    nat: "select", natIn: [],
    d: { el: "«Ολυμπιάδα» ρομποτικής: μία εθνική ομάδα ανά χώρα. Το kit δίνεται από τη διοργάνωση.", en: "A robotics “Olympics”: one national team per country. The kit is provided." },
    events: [{ n: { el: "Παγκόσμιος διαγωνισμός", en: "World event" }, m: [9, 10], intl: true }],
    reg: [1, 4], cost: [0, 1500], prep: 5, lvl: 2, coach: true,
    cats: [{ n: { el: "Εθνική ομάδα", en: "National team" }, age: [14, 18], team: [3, 7], hw: "none" }],
  },
  {
    id: "vexiq", name: "VEX IQ Robotics Competition", em: "🟦", org: "REC Foundation", url: "https://www.roboticseducation.org",
    nat: "wide", natIn: [],
    d: { el: "Σύστημα VEX IQ, παιχνίδι συνεργασίας 2 ομάδων και αποστολές προγραμματισμού. Νέο παιχνίδι κάθε Μάιο.", en: "VEX IQ system, a 2-team cooperative game and skills missions. New game every May." },
    events: [
      { n: { el: "Τουρνουά σεζόν", en: "Season tournaments" }, m: [9, 3] },
      { n: { el: "VEX Robotics World Championship", en: "VEX Robotics World Championship" }, m: [4, 5], intl: true },
    ],
    reg: [5, 10], cost: [200, 600], prep: 4, lvl: 1, coach: true,
    cats: [
      { n: "Elementary School", age: [8, 11], team: [2, 10], hw: ["vexiq"] },
      { n: "Middle School", age: [11, 15], team: [2, 10], hw: ["vexiq"] },
    ],
  },
  {
    id: "vexv5", name: "VEX V5 Robotics Competition", em: "🔩", org: "REC Foundation", url: "https://www.roboticseducation.org",
    nat: "wide", natIn: [],
    d: { el: "Μεταλλικά ρομπότ VEX V5, αυτόνομη περίοδος και τηλεχειρισμός, συμμαχίες 2 ομάδων.", en: "VEX V5 metal robots, autonomous and driver periods, 2-team alliances." },
    events: [
      { n: { el: "Τουρνουά σεζόν", en: "Season tournaments" }, m: [9, 3] },
      { n: { el: "VEX Robotics World Championship", en: "VEX Robotics World Championship" }, m: [4, 5], intl: true },
    ],
    reg: [5, 10], cost: [300, 900], prep: 5, lvl: 2, coach: true,
    cats: [
      { n: "Middle School", age: [11, 15], team: [2, 15], hw: ["vexv5"] },
      { n: "High School", age: [14, 19], team: [2, 15], hw: ["vexv5"] },
    ],
  },
  {
    id: "rcj", name: "RoboCup Junior", em: "⚽", org: "RoboCup Federation", url: "https://junior.robocup.org",
    nat: "wide", natIn: [],
    d: { el: "Ποδόσφαιρο ρομπότ, διάσωση σε γραμμή ή λαβύρινθο και καλλιτεχνική παράσταση με οποιοδήποτε υλικό. Το διεθνές γίνεται μαζί με το RoboCup.",
         en: "Robot soccer, line or maze rescue and on-stage performance with any hardware. The international event runs alongside RoboCup." },
    events: [
      { n: { el: "Περιφερειακά / εθνικά", en: "Regional / national events" }, m: [2, 5] },
      { n: { el: "RoboCup Junior International", en: "RoboCup Junior International" }, m: [7, 7], intl: true },
    ],
    reg: [11, 2], cost: [200, 1000], prep: 5, lvl: 2, coach: true,
    cats: [
      { n: "Rescue Line", age: [11, 19], team: [2, 4], hw: "any", note: { el: "Διεθνές: 14–19 ετών", en: "International: ages 14–19" } },
      { n: "Rescue Maze", age: [11, 19], team: [2, 4], hw: "any", rec: ["printer3d"], note: { el: "Διεθνές: 14–19 ετών", en: "International: ages 14–19" } },
      { n: "Soccer", age: [11, 19], team: [2, 4], hw: "any", rec: ["printer3d", "camera"], note: { el: "Διεθνές: 14–19 ετών", en: "International: ages 14–19" } },
      { n: "OnStage", age: [11, 19], team: [2, 5], hw: "any", note: { el: "Διεθνές: 14–19 ετών", en: "International: ages 14–19" } },
    ],
  },
  {
    id: "robocup", name: "RoboCup (Major leagues)", em: "🎓", org: "RoboCup Federation", url: "https://www.robocup.org",
    nat: "none",
    d: { el: "Ερευνητικοί διαγωνισμοί για πανεπιστήμια: ποδόσφαιρο ρομπότ, @Home, Rescue, Industrial. Η πόλη αλλάζει κάθε χρόνο.",
         en: "Research competitions for universities: robot soccer, @Home, Rescue, Industrial. The host city changes every year." },
    events: [{ n: { el: "RoboCup", en: "RoboCup" }, m: [7, 7], intl: true }],
    reg: [11, 2], cost: [2000, 10000], prep: 9, lvl: 3, coach: false,
    cats: [{ n: "Major leagues", age: [18, 99], team: [3, 30], hw: "any", rec: ["printer3d", "camera"], note: { el: "Απαιτείται qualification (paper/βίντεο)", en: "Qualification (paper/video) required" } }],
  },
  {
    id: "robotex", name: "Robotex International", em: "🏁", org: "Robotex", url: "https://robotex.international",
    nat: "none", host: "EE",
    d: { el: "Μεγάλο φεστιβάλ ρομποτικής στο Ταλίν: line following, sumo, folkrace, LEGO κατηγορίες. Ανοιχτό σε όλες τις ηλικίες· ιδανικό για ρομπότ Arduino.",
         en: "Large robotics festival in Tallinn: line following, sumo, folkrace, LEGO categories. Open to all ages; great for Arduino robots." },
    events: [{ n: { el: "Robotex International (Ταλίν)", en: "Robotex International (Tallinn)" }, m: [11, 12], intl: true }],
    reg: [9, 11], cost: [50, 300], prep: 2, lvl: 1, coach: false,
    cats: [
      { n: "Line Following", age: [7, 99], team: [1, 5], hw: "any" },
      { n: "Mini Sumo / Sumo", age: [7, 99], team: [1, 5], hw: "any", rec: ["printer3d"] },
      { n: "LEGO Sumo / LEGO Challenge", age: [7, 19], team: [1, 5], hw: ["spike", "ev3"] },
      { n: "Folkrace", age: [7, 99], team: [1, 5], hw: "any" },
    ],
  },
  {
    id: "makex", name: "MakeX Robotics Competition", em: "🤖", org: "Makeblock", url: "https://www.makex.cc",
    nat: "wide", natIn: [],
    d: { el: "Διαγωνισμός της Makeblock, από δημιουργικά έργα μέχρι μάχες ρομπότ, με υλικό Makeblock.", en: "Makeblock's competition, from creative projects to robot battles, using Makeblock hardware." },
    events: [
      { n: { el: "Περιφερειακοί διαγωνισμοί", en: "Regional competitions" }, m: [3, 10] },
      { n: { el: "MakeX World Championship", en: "MakeX World Championship" }, m: [12, 12], intl: true },
    ],
    reg: [2, 8], cost: [200, 800], prep: 3, lvl: 1, coach: true,
    cats: [
      { n: "Spark / Starter", age: [6, 13], team: [2, 4], hw: ["mbot"], note: { el: "mBot2 / kit της σεζόν", en: "mBot2 / season kit" } },
      { n: "Challenge", age: [13, 18], team: [2, 4], hw: ["mbot"], note: { el: "Kit MakeX Challenge της σεζόν", en: "Season MakeX Challenge kit" } },
    ],
  },
  {
    id: "botball", name: "Botball", em: "🎯", org: "KISS Institute for Practical Robotics", url: "https://www.kipr.org/botball",
    nat: "wide", natIn: [],
    d: { el: "Αυτόνομα ρομπότ με το kit KIPR που δίνεται με την εγγραφή. Περιφερειακά τουρνουά και Global Conference.", en: "Autonomous robots built with the KIPR kit that comes with registration. Regional tournaments and a Global Conference." },
    events: [
      { n: { el: "Περιφερειακά τουρνουά", en: "Regional tournaments" }, m: [3, 5] },
      { n: { el: "Global Conference (GCER)", en: "Global Conference (GCER)" }, m: [7, 7], intl: true },
    ],
    reg: [10, 1], cost: [2500, 3500], prep: 3, lvl: 2, coach: true,
    cats: [{ n: "Botball", age: [11, 18], team: [2, 15], hw: "none", note: { el: "Το kit περιλαμβάνεται στο κόστος εγγραφής", en: "The kit is included in the registration fee" } }],
  },
  {
    id: "eurobot", name: "Eurobot", em: "🇪🇺", org: "Eurobot", url: "https://www.eurobot.org",
    nat: "wide", natIn: [],
    d: { el: "Αυτόνομα ρομπότ σε τραπέζι αγώνων, 100 δευτερόλεπτα ανά αγώνα. Για μεγαλύτερους μαθητές, φοιτητές και ομίλους.",
         en: "Autonomous robots on a game table, 100-second matches. For older students, university students and clubs." },
    events: [
      { n: { el: "Εθνικοί προκριματικοί", en: "National qualifiers" }, m: [4, 5] },
      { n: { el: "Eurobot Open – τελικός", en: "Eurobot Open – final" }, m: [5, 6], intl: true },
    ],
    reg: [9, 1], cost: [500, 2000], prep: 6, lvl: 3, coach: false,
    cats: [{ n: "Eurobot Open", age: [15, 30], team: [2, 10], hw: "any", rec: ["printer3d"] }],
  },
  {
    id: "erc", name: "European Rover Challenge", em: "🪐", org: "European Space Foundation", url: "https://roverchallenge.eu",
    nat: "none", host: "PL",
    d: { el: "Διαστημικά οχήματα (rovers) σε προσομοίωση εδάφους του Άρη. Για φοιτητικές ομάδες.", en: "Space rovers on a simulated Mars terrain. For university teams." },
    events: [{ n: { el: "Τελικοί", en: "Finals" }, m: [9, 9], intl: true }],
    reg: [11, 2], cost: [3000, 15000], prep: 9, lvl: 3, coach: false,
    cats: [{ n: "On-site", age: [18, 35], team: [6, 30], hw: ["raspi", "esp32", "arduino"], rec: ["printer3d", "camera"] }],
  },
  {
    id: "ellak", name: "Πανελλήνιος Μαθητικός Διαγωνισμός Ανοιχτών Τεχνολογιών", em: "🇬🇷", org: "ΕΕΛΛΑΚ / GFOSS", url: "https://opensource.ellak.gr",
    nat: "local", only: ["GR"], natIn: ["GR"],
    d: { el: "Σχολικές ομάδες στην Ελλάδα φτιάχνουν έργο ρομποτικής ή αυτοματισμού με ανοιχτό υλικό και λογισμικό. Χωρίς κόστος συμμετοχής.",
         en: "School teams in Greece build robotics or automation projects with open hardware and software. Free to enter." },
    events: [
      { n: { el: "Υποβολή πρότασης", en: "Proposal submission" }, m: [12, 2] },
      { n: { el: "Τελική παρουσίαση", en: "Final presentation" }, m: [5, 5] },
    ],
    reg: [10, 1], cost: [0, 200], prep: 5, lvl: 1, coach: true, school: true,
    cats: [
      { n: { el: "Δημοτικό", en: "Primary school" }, age: [8, 12], team: [2, 10], hw: OPEN_HW },
      { n: { el: "Γυμνάσιο", en: "Lower secondary" }, age: [12, 15], team: [2, 10], hw: OPEN_HW },
      { n: { el: "Λύκειο", en: "Upper secondary" }, age: [15, 18], team: [2, 10], hw: OPEN_HW },
    ],
  },
];
