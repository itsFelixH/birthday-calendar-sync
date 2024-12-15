/**
 * Translations for supported languages.
 */
var translations = {
  en: {
    "birthday": "has birthday",
    "will_be": "will be",
    "birthday_today": "has birthday today",
    "no_birthday_year": "No birthday year specified",
    "summary_title": "🎉🎂 BIRTHDAYS 🎂🎉",
    "description_prefix": "Birthdays in",
    "created": "created for",
    "updated": "updated for",
    "no_contacts": "No contacts found. Aborting.",
    "getting_contacts": "Getting all contacts and birthdays from Google Contacts...",
    "got_contacts": "Got contacts with birthdays!",
    "processing_month": "Processing month",
    "searching_events": "Searching for events containing",
    "found_events": "Found events! Deleting...",
    "deleted": "was deleted",
    "monthNames": ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    "monthNamesLong": ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  },
  de: {
    "birthday": "hat Geburtstag",
    "will_be": "wird",
    "birthday_today": "hat heute Geburtstag",
    "no_birthday_year": "Kein Geburtsjahr angegeben",
    "summary_title": "🎉🎂 GEBURTSTAGE 🎂🎉",
    "description_prefix": "Geburtstage im",
    "created": "erstellt für",
    "updated": "aktualisiert für",
    "no_contacts": "Keine Kontakte gefunden. Abbruch.",
    "getting_contacts": "Alle Kontakte und Geburtstage aus Google Kontakte abrufen...",
    "got_contacts": "Kontakte mit Geburtstagen erhalten!",
    "processing_month": "Monat verarbeiten",
    "searching_events": "Suche nach Ereignissen, die",
    "found_events": "Ereignisse gefunden! Löschen...",
    "deleted": "wurde gelöscht",
    "monthNames": ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
    "monthNamesLong": ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
  },
  es: {
    // TODO
  },
  fr: {
    // TODO
  }
};


/**
 * Gets the translation object for the specified language.
 * Defaults to English if the language is not supported.
 *
 * @param {string} lang - The language code (e.g., 'en', 'de', 'es', 'fr').
 * @returns {Object} The translation object for the specified language.
 */
function getTranslations(lang) {
  return translations[lang] || translations.en; // Default to English if language not found
}


/**
 * Gets the translation string for the specified key.
 * Defaults to English if the key is not available in the specified language.
 *
 * @param {string} lang - The language code (e.g., 'en', 'de', 'es', 'fr').
 * @param {string} key - The translation key.
 * @returns {string} The translation string for the specified key.
 */
function getTranslationString(lang, key) {
  var langTranslations = getTranslations(lang);
  var fallbackTranslations = translations.en;
  return langTranslations[key] || fallbackTranslations[key] || key;
}
