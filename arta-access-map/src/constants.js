'use strict';

// Κατηγορίες σημείων (κλειδί -> ετικέτα)
const CATEGORIES = {
  dimosia: 'Δημόσια υπηρεσία',
  ygeia: 'Υγεία',
  politismos: 'Πολιτισμός & αξιοθέατα',
  ekpaideusi: 'Εκπαίδευση',
  estiasi: 'Εστίαση & καφέ',
  emporio: 'Καταστήματα',
  trapeza: 'Τράπεζες & ΑΤΜ',
  parking: 'Θέση στάθμευσης ΑμεΑ',
  wc: 'Τουαλέτα ΑμεΑ',
  rampa: 'Ράμπα / πεζοδρόμιο',
  diavasi: 'Διάβαση / φανάρι με ήχο',
  parko: 'Πάρκο & πλατεία',
  metafores: 'Συγκοινωνίες',
  paralia: 'Παραλία',
  allo: 'Άλλο',
};

// Χαρακτηριστικά προσβασιμότητας
const FEATURES = {
  rampa: 'Ράμπα εισόδου',
  isopedo: 'Ισόπεδη είσοδος',
  anelkystiras: 'Ανελκυστήρας',
  wc: 'WC ΑμεΑ',
  parking: 'Στάθμευση ΑμεΑ',
  odigos: 'Οδηγός όδευσης τυφλών',
  ixitiko: 'Ηχητική σήμανση',
};

const LEVELS = {
  full: 'Πλήρως προσβάσιμο',
  partial: 'Μερικώς προσβάσιμο',
};

// Όρια περιοχής Δήμου Αρταίων (ορθογώνιο γύρω από τα όρια του δήμου, με μικρό περιθώριο)
const BOUNDS = { minLat: 38.99, maxLat: 39.42, minLng: 20.75, maxLng: 21.1 };
const CENTER = { lat: 39.1605, lng: 20.9856, zoom: 15 };

module.exports = { CATEGORIES, FEATURES, LEVELS, BOUNDS, CENTER };
