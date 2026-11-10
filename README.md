# ROBOTZEDES – Robotics Code Pocket

Android εφαρμογή (λειτουργεί offline) με **184 πλήρη, έτοιμα προγράμματα και οδηγούς** για εκπαιδευτική ρομποτική.

| Πλατφόρμα | Γλώσσα | Κώδικες |
|---|---|---|
| LEGO MINDSTORMS EV3 | EV3 MicroPython (Pybricks) | 26 |
| LEGO SPIKE Prime | SPIKE 3 Python | 22 |
| micro:bit | MicroPython **και** MakeCode JS | 25 |
| DFRobot Maqueen | MakeCode JS (επέκταση maqueen) **και** MicroPython | 16 |
| Arduino UNO/Nano | Arduino C++ | 34 |
| Makeblock mBot (mCore) / mBot2 (CyberPi) | Arduino C++ / Python | 21 |
| Arduino RC αυτοκίνητα (Bluetooth, IR, nRF24, Wi-Fi, gesture) | Arduino C++ | 12 |
| ESP32 | Arduino C++ | 8 |
| Raspberry Pi Pico | MicroPython | 8 |
| Οδηγοί: pinouts, συνδεσμολογίες, PID, συχνά λάθη | – | 12 |

Θεματικές: βασικά, μοτέρ, κίνηση, αισθητήρες, line follower (απλός → PID), αποφυγή εμποδίων, sumo, radio, τηλεχειρισμός, αυτοματισμοί, οθόνες, παιχνίδια.

## Λειτουργίες
- Αναζήτηση στα ελληνικά, με ή χωρίς τόνους
- Φίλτρα ανά κατηγορία και επίπεδο (Αρχάριο / Μέσο / Προχωρημένο)
- Χρωματισμός σύνταξης, αρίθμηση γραμμών, μέγεθος γραμματοσειράς
- Εναλλαγή MakeCode ⇄ MicroPython (η εφαρμογή θυμάται την επιλογή σου)
- Αντιγραφή, κοινοποίηση, αγαπημένα, πρόσφατα
- Εργαλεία: αντίσταση LED, μοίρες τροχού για απόσταση/στροφή, map(), υπερηχητικός
- Φωτεινό και σκοτεινό θέμα

## Δομή
```
app/src/main/assets/
  index.html        κέλυφος εφαρμογής
  css/app.css       εμφάνιση
  js/app.js         πλοήγηση, αναζήτηση, χρωματισμός σύνταξης, εργαλεία
  data/*.js         οι κώδικες, ένα αρχείο ανά πλατφόρμα
```
Για να προσθέσεις κώδικα, βάλε ένα αντικείμενο στο αντίστοιχο `data/*.js`:
```js
{ cat: "Αισθητήρες", t: "Τίτλος", lvl: 1, hw: "Υλικό", d: "Περιγραφή", code: R`...` }
// ή με πολλές γλώσσες:  v: [{ l: "MicroPython", c: R`...` }, { l: "MakeCode JS", c: R`...` }]
```

## Πώς βγάζω το APK
1. Κάνε push (στο `main` ή σε branch `ccr-*`) ή τρέξε χειροκίνητα: **Actions → Build Robotzedes APK → Run workflow**.
2. Όταν ολοκληρωθεί με επιτυχία, κατέβασε το artifact **Robotzedes-Code-Pocket-APK**.
3. Αποσυμπίεσε και εγκατάστησε το `app-debug.apk` στο Android (επίτρεψε «εγκατάσταση από άγνωστες πηγές»).

Για δοκιμή στον υπολογιστή αρκεί να ανοίξεις το `app/src/main/assets/index.html` σε browser.

---

## Προσβάσιμη Άρτα (ξεχωριστή εφαρμογή)
Στον φάκελο [`arta-access-map/`](arta-access-map/README.md) υπάρχει web εφαρμογή με διαδραστικό χάρτη των
προσβάσιμων σημείων της Άρτας, λογαριασμούς χρηστών και έγκριση υποβολών από διαχειριστή.
