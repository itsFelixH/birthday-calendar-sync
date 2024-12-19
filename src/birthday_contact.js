
/**
 * Represents a contact with a birthday and additional information.
 */
class BirthdayContact {
  /**
   * Creates an instance of BirthdayContact.
   *
   * @param {string} name - The name of the contact.
   * @param {Date} birthday - The birthday of the contact.
   * @param {Array<string>} labels - Labels/tags associated with the contact.
   * @param {string} whatsappLink - The WhatsApp link for the contact.
   * @param {string} instagramLink - The Instagram link for the contact.
   */
  constructor(name, birthday, labels = [], email = '', city = '', whatsappLink = '', instagramLink = '') {
    this.name = name;
    this.birthday = new Date(birthday);
    this.labels = Array.isArray(labels) ? labels : [];
    this.email = email || '';
    this.city = city || '';
    this.whatsappLink = whatsappLink || '';
    this.instagramLink = instagramLink || '';
  }


  /**
   * Gets the name of the contact.
   * @returns {string} The name of the contact.
   */
  getName() {
    return this.name;
  }

  /**
   * Gets the birthday of the contact.
   * @returns {Date} The birthday of the contact.
   */
  getBirthday() {
    return this.birthday;
  }

  /**
   * Gets the labels associated with the contact.
   * @returns {Array<string>} The labels of the contact.
   */
  getLabels() {
    return this.labels;
  }


  /**
   * Gets the birthday formatted as "dd.MM.".
   * 
   * @returns {string} The formatted birthday.
   */
  getBirthdayShortFormat() {
    return Utilities.formatDate(this.birthday, Session.getScriptTimeZone(), "dd.MM.");
  }


  /**
   * Gets the birthday formatted as "dd.MM.yyyy", or "dd.MM." if the year is not specified or matches the current year.
   * 
   * @returns {string} The formatted birthday with or without the year.
   */
  getBirthdayLongFormat() {
    if (this.birthday.getFullYear() == new Date().getFullYear()) {
      return this.getBirthdayShortFormat();
    } else {
      return Utilities.formatDate(this.birthday, Session.getScriptTimeZone(), "dd.MM.yyyy");
    }
  }


  /**
   * Gets the birthday formatted as "dd. MMM".
   * 
   * @returns {string} The formatted birthday.
   */
  getBirthdayLongMonthFormat() {
    return `${('0' + this.birthday.getDate()).slice(-2)}. ${monthNames[this.birthday.getMonth()]}`;
  }


  /**
   * Gets the string representation for the birthday event.
   * 
   * @returns {string} The birthday summary string.
   */
  getBirthdayEventString() {
    let string = this.hasKnownBirthYear()
      ? `${this.name} wird heute ${this.getAgeThisYear()}\nGeburtstag: ${this.getBirthdayLongFormat()}\n\n`
      : `${this.name} hat heute Geburtstag\n\n`;

    if (this.city) string += `Stadt: ${this.city}\n`;
    if (this.whatsappLink) string += `WhatsApp: ${this.whatsappLink}\n`;
    if (this.instagramLink) string += `Instagram: ${this.instagramLink}\n`;
    if (this.email) string += `Email: ${this.email}\n`;

    if (this.labels.length > 0) {
      if (this.city || this.whatsappLink || this.instagramLink || this.email) string += `\n`;
      string += `${this.labels}\n`
    }
    return string;
  }


  /**
   * Gets the string representation for the birthday summary.
   * 
   * @returns {string} The birthday summary string.
   */
  getBirthdaySummaryEventString() {
    let string = `${this.getBirthdayLongMonthFormat()}: ${this.name}`;
    if (this.hasKnownBirthYear()) {
      string += ` (${this.getAgeThisYear()})`;
    }
    return string;
  }


  /**
   * Checks if the contact has a birth year specified (i.e., not the current year).
   * 
   * @returns {boolean} True if the contact has a birth year specified, false otherwise.
   */
  hasKnownBirthYear() {
    return !(this.birthday.getFullYear() == new Date().getFullYear());
  }


  /**
   * Calculates the age of the contact in years.
   *
   * @returns {number} The age of the contact in years.
   */
  calculateAge() {
    var today = new Date();
    const birthDate = new Date(this.birthday);

    if (this.hasKnownBirthYear()) {
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } else {
      Logger.log('Birth year is missing for contact:', this.name);
      return 0;
    }
  }


  /**
   * Gets the age the contact will turn this year.
   *
   * @returns {number} Age turning this year.
   */
  getAgeThisYear() {
    var today = new Date();
    const birthDate = new Date(this.birthday);

    if (this.hasKnownBirthYear()) {
      return today.getFullYear() - birthDate.getFullYear();
    } else {
      Logger.log('Birth year is missing for contact:', this.name);
      return 0;
    }
  }


  /**
   * Checks if today is the contact's birthday.
   *
   * @returns {boolean} True if today is the contact's birthday, false otherwise.
   */
  isBirthdayToday() {
    const today = new Date();
    return today.getDate() === this.birthday.getDate() && today.getMonth() === this.birthday.getMonth();
  }


  /**
   * Checks if the contact's birthday is in the current month.
   *
   * @returns {boolean} True if the birthday is in the current month, false otherwise.
   */
  isBirthdayThisMonth() {
    const today = new Date();
    return today.getMonth() === this.birthday.getMonth();
  }


  /**
   * Gets the number of days until the next birthday.
   *
   * @returns {number} Days until the next birthday.
   */
  daysToNextBirthday() {
    const today = new Date();
    const nextBirthday = new Date(today.getFullYear(), this.birthday.getMonth(), this.birthday.getDate());

    if (today > nextBirthday) {
      nextBirthday.setFullYear(today.getFullYear() + 1);
    }

    const oneDay = 24 * 60 * 60 * 1000; // One day in milliseconds
    return Math.round((nextBirthday - today) / oneDay);
  }


  /**
   * Checks if the contact's birthday was in this year and has already passed.
   *
   * @returns {boolean} True if the birthday was this year and has already passed, false otherwise.
   */
  wasBirthdayThisYear() {
    const today = new Date();
    const birthdayThisYear = new Date(today.getFullYear(), this.birthday.getMonth(), this.birthday.getDate());
    return today > birthdayThisYear;
  }


  /**
   * Calculates the contact's age in days.
   *
   * @returns {number} The age in days.
   */
  getAgeInDays() {
    const today = new Date();
    const ageInMilliseconds = today.getTime() - this.birthday.getTime();
    return Math.floor(ageInMilliseconds / (1000 * 60 * 60 * 24));
  }


  /**
   * Gets an array of social media links as key-value pairs.
   *
   * @returns {Object} An object containing social media platform names as keys and their respective links as values.
   */
  getSocialMediaLinks() {
    return {
      WhatsApp: this.whatsappLink,
      Instagram: this.instagramLink,
    };
  }


  /**
   * Logs the contact's name and birthday in a formatted message to the console.
   * 
   * @returns {void}
   */
  logBirthdaySummary() {
    Logger.log(`🎂 ${this.name} hat Geburtstag am ${this.getBirthdayShortMonthFormat()}`);
  }


  /**
   * Logs detailed information about the contact to the console, including name, birthday, age (if available), labels, WhatsApp link (if available), and Instagram link (if available).
   * 
   * @returns {void}
   */
  logContactDetails() {
    Logger.log(`Name: ${this.name}`);
    Logger.log(`Birthday: ${this.getBirthdayLongFormat()}`);
    if (this.hasKnownBirthYear()) Logger.log(`Age: ${this.calculateAge()}`);
    if (this.labels.length > 0) Logger.log(`Labels: ${this.labels.join(', ')}`);
    if (this.email) Logger.log(`Emails: ${this.email}`);
    if (this.city) Logger.log(`City: ${this.city}`);
    if (this.whatsappLink) Logger.log(`WhatsApp: ${this.whatsappLink}`);
    if (this.instagramLink) Logger.log(`Instagram: ${this.instagramLink}`);
  }


  /**
   * Logs all birthday-related information about the contact to the console.
   * 
   * @returns {void}
   */
  logBirthdayInformation() {
    Logger.log(`Name: ${this.name}`);
    Logger.log(`Birthday: ${this.getBirthdayLongFormat()}`);
    if (this.hasKnownBirthYear()) {
      Logger.log(`Age: ${this.calculateAge()}`);
      Logger.log(`Days until next birthday: ${this.daysToNextBirthday()}`);
      Logger.log(`Age in days: ${this.getAgeInDays()}`);
    }
    Logger.log(`Is birthday today: ${this.isBirthdayToday()}`);
    Logger.log(`Is birthday this month: ${this.isBirthdayThisMonth()}`);
    Logger.log(`Was birthday this year: ${this.wasBirthdayThisYear()}`);
  }

}



/**
 * Retrieves a contact by their name.
 *
 * @param {BirthdayContact[]} contacts - An array of BirthdayContact objects to search through.
 * @param {string} name - The name of the contact to search for.
 * @returns {BirthdayContact|null} The BirthdayContact object if found, or null if not found.
 */
function getContactByName(contacts, name) {
  const contact = contacts.find(contact => contact.name.toLowerCase() === name.toLowerCase());
  return contact || null; // Return the contact if found, otherwise return null
}


/**
 * Retrieves all contacts with birthdays this month.
 *
 * @param {BirthdayContact[]} contacts - An array of BirthdayContact objects to filter.
 * @returns {BirthdayContact[]} An array of BirthdayContact objects with birthdays this month.
 */
function getContactsWithBirthdaysThisMonth(contacts) {
  return contacts.filter(contact => contact.isBirthdayThisMonth());
}


/**
 * Retrieves all contacts with at least one label from the specified list.
 *
 * @param {BirthdayContact[]} contacts - An array of BirthdayContact objects to filter.
 * @param {string[]} labels - An array of label names to match.
 * @returns {BirthdayContact[]} An array of BirthdayContact objects that have at least one matching label.
 */
function getContactsByLabels(contacts, labels) {
  return contacts.filter(contact => contact.labels.some(label => labels.includes(label)));
}


/**
 * Retrieves all contacts with birthdays upcoming within a specified number of days.
 *
 * @param {BirthdayContact[]} contacts - An array of BirthdayContact objects to filter.
 * @param {number} days - The number of days to look ahead for upcoming birthdays.
 * @returns {BirthdayContact[]} An array of BirthdayContact objects with upcoming birthdays.
 */
function getUpcomingBirthdays(contacts, days) {
  const today = new Date();
  return contacts.filter(contact => {
    const nextBirthday = new Date(today.getFullYear(), contact.birthday.getMonth(), contact.birthday.getDate());
    if (today > nextBirthday) {
      nextBirthday.setFullYear(today.getFullYear() + 1);
    }
    const diffDays = Math.round((nextBirthday - today) / (1000 * 60 * 60 * 24));
    return diffDays <= days;
  });
}


/**
 * Retrieves all contacts that do not have any labels.
 *
 * @param {BirthdayContact[]} contacts - An array of BirthdayContact objects to filter.
 * @returns {BirthdayContact[]} An array of BirthdayContact objects without labels.
 */
function getContactsWithoutLabels(contacts) {
  return contacts.filter(contact => contact.labels.length === 0);
}


/**
 * Retrieves contacts that have multiple labels.
 *
 * @param {BirthdayContact[]} contacts - An array of BirthdayContact objects to filter.
 * @param {number} minLabels - The minimum number of labels a contact must have.
 * @returns {BirthdayContact[]} An array of BirthdayContact objects with at least the specified number of labels.
 */
function getContactsWithMultipleLabels(contacts, minLabels) {
  return contacts.filter(contact => contact.labels.length >= minLabels);
}


/**
 * Retrieves contacts whose age falls within a specified range.
 *
 * @param {BirthdayContact[]} contacts - An array of BirthdayContact objects to filter.
 * @param {number} minAge - The minimum age of the contacts.
 * @param {number} maxAge - The maximum age of the contacts.
 * @returns {BirthdayContact[]} An array of BirthdayContact objects within the specified age range.
 */
function getContactsByAgeRange(contacts, minAge, maxAge) {
  return contacts.filter(contact => {
    const age = contact.calculateAge();
    return age >= minAge && age <= maxAge;
  });
}


/**
 * Retrieves contacts with a birthday on a specific day.
 *
 * @param {BirthdayContact[]} contacts - An array of BirthdayContact objects to filter.
 * @param {number} day - The day of the month (1-31).
 * @param {number} month - The month (0 = January, 11 = December).
 * @returns {BirthdayContact[]} An array of BirthdayContact objects with a birthday on the specified day and month.
 */
function getContactsByBirthday(contacts, day, month) {
  return contacts.filter(contact => contact.birthday.getDate() === day && contact.birthday.getMonth() === month);
}


/**
 * Retrieves contacts that have a specified social media link.
 *
 * @param {BirthdayContact[]} contacts - An array of BirthdayContact objects to filter.
 * @param {string} socialMedia - The social media platform to filter by ('WhatsApp' or 'Instagram').
 * @returns {BirthdayContact[]} An array of BirthdayContact objects that have the specified social media link.
 */
function getContactsBySocialMediaLink(contacts, socialMedia) {
  return contacts.filter(contact => {
    if (socialMedia === 'WhatsApp') {
      return contact.whatsappLink !== '';
    } else if (socialMedia === 'Instagram') {
      return contact.instagramLink !== '';
    }
    return false;
  });
}


/**
 * Logs the names of a list of BirthdayContact objects.
 *
 * @param {BirthdayContact[]} contacts - An array of BirthdayContact objects to log.
 * @returns {void}
 */
function logContactsNames(contacts) {
  if (contacts.length === 0) {
    Logger.log('No contacts to display.');
    return;
  }

  const names = contacts.map(contact => contact.getName());
  Logger.log(names)
}


/**
 * Logs the details of a list of BirthdayContact objects.
 *
 * @param {BirthdayContact[]} contacts - An array of BirthdayContact objects to log.
 * @returns {void}
 */
function logContactsSummaryList(contacts) {
  if (contacts.length === 0) {
    Logger.log('No contacts to display.');
    return;
  }

  contacts.forEach(contact => {
    contact.logBirthdaySummary();
    Logger.log('------------------------');
  });
}


/**
 * Logs detailed information for a list of BirthdayContact instances.
 *
 * @param {BirthdayContact[]} contacts - An array of BirthdayContact objects to log.
 * @returns {void}
 */
function logDetailedContactsList(contacts) {
  if (contacts.length === 0) {
    Logger.log('No contacts to display.');
    return;
  }

  contacts.forEach(contact => {
    contact.logContactDetails();
    Logger.log('------------------------');
  });
}

/**
 * Logs contacts that have a specific label.
 *
 * @param {BirthdayContact[]} contacts - An array of BirthdayContact objects to log.
 * @param {string} label - The label to filter contacts by.
 * @returns {void}
 */
function logContactsByLabel(contacts, label) {
  const filteredContacts = contacts.filter(contact => contact.labels.includes(label));

  if (filteredContacts.length === 0) {
    Logger.log(`No contacts found with label: ${label}`);
    return;
  }

  Logger.log(`Contacts with label: ${label}`);
  filteredContacts.forEach(contact => {
    contact.logContactDetails();
    Logger.log('------------------------');
  });
}


