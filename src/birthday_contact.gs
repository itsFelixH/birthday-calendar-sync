
/**
 * Represents a contact with a birthday and additional information.
 */
class BirthdayContact {
  /**
   * Creates an instance of BirthdayContact.
   * @param {string} name - The name of the contact.
   * @param {Date} birthday - The birthday of the contact.
   * @param {Array<string>} labels - Labels/tags associated with the contact.
   * @param {string} whatsappLink - The WhatsApp link for the contact.
   * @param {string} instagramLink - The Instagram link for the contact.
   */
  constructor(name, birthday, labels = [], whatsappLink = '', instagramLink = '') {
    this.name = name;
    this.birthday = new Date(birthday);
    this.labels = labels;
    this.whatsappLink = whatsappLink;
    this.instagramLink = instagramLink;
  }


  /**
   * Logs the contact's birthday to the console.
   */
  logToConsole() {
    Logger.log(`🎂 ${this.name} hat Geburtstag am ${this.getBirthdayDDMMM()}`);
  }

  logFullDetails() {
    Logger.log(`Name: ${this.name}`);
    Logger.log(`Birthday: ${this.getBirthdayDDMMYYYY()}`);
    if (this.hasAge()) Logger.log(`Age: ${this.getAge()}`);
    if (this.labels.length > 0) Logger.log(`Labels: ${this.labels.join(', ')}`);
    if (this.whatsappLink) Logger.log(`WhatsApp: ${this.whatsappLink}`);
    if (this.instagramLink) Logger.log(`Instagram: ${this.instagramLink}`);
  }


  /**
   * Gets the birthday formatted as "dd.MM.".
   * @returns {string} - The formatted birthday.
   */
  getBirthdayDDMM() {
    return Utilities.formatDate(this.birthday, Session.getScriptTimeZone(), "dd.MM.");
  }


  /**
   * Gets the birthday formatted as "dd.MM.yyyy", or "dd.MM." if the year is not specified.
   * @returns {string} - The formatted birthday with or without the year.
   */
  getBirthdayDDMMYYYY() {
    if (this.birthday.getFullYear() == new Date().getFullYear()) {
      return this.getBirthdayDDMM();
    } else {
      return Utilities.formatDate(this.birthday, Session.getScriptTimeZone(), "dd.MM.yyyy");
    }
  }


  /**
   * Gets the birthday formatted as "dd. MMM".
   * @returns {string} - The formatted birthday.
   */
  getBirthdayDDMMM() {
    return `${('0' + this.birthday.getDate()).slice(-2)}. ${monthNames[this.birthday.getMonth()]}`;
  }


  /**
   * Gets the string for the birthday summary.
   * @returns {string} - The birthday summary.
   */
  getStringForSummary() {
    var string = `${this.getBirthdayDDMMM()}: ${this.name}`;
    if (this.hasAge()) {
      string += ` wird ${this.getAge()}`;
    }
    return string;
  }


  /**
   * Checks if the contact has a specified birth year.
   * @returns {boolean} True if the contact has a birth year, false otherwise.
   */
  hasAge() {
    return !(this.birthday.getFullYear() == new Date().getFullYear());
  }


  /**
   * Gets the current age of the contact.
   * @returns {number} Current age.
   */
  getCurrentAge() {
    var today = new Date();
    if (this.birthday.getFullYear() == today.getFullYear()) {
      throw new Error("Oh noes...!");
    } else {
      var age = today.getFullYear() - this.birthday.getFullYear();
      var m = today.getMonth() - this.birthday.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < this.birthday.getDate())) {
        age--;
      }
      return age;
    }
  }


  /**
   * Gets the age the contact will turn this year.
   * @returns {number} Age turning this year.
   */
  getTurningAgeThisYear() {
    var today = new Date();
    if (this.birthday.getFullYear() == today.getFullYear()) {
      throw new Error("Oh noes...!");
    } else {
      return today.getFullYear() - this.birthday.getFullYear();
    }
  }


  /**
   * Checks if today is the contact's birthday.
   * @returns {boolean} True if today is the contact's birthday, false otherwise.
   */
  hasBirthdayToday() {
    const today = new Date();
    return today.getDate() === this.birthday.getDate() && today.getMonth() === this.birthday.getMonth();
  }


  /**
   * Checks if the contact's birthday is in the current month.
   * @returns {boolean} True if the birthday is in the current month, false otherwise.
   */
  hasBirthdayThisMonth() {
    const today = new Date();
    return today.getMonth() === this.birthday.getMonth();
  }


  /**
  * Gets the number of days until the next birthday.
  * @returns {number} Days until the next birthday.
  */
  daysUntilBirthday() {
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
   * @returns {boolean} True if the birthday was this year and has already passed, false otherwise.
   */
  wasBirthdayThisYear() {
    const today = new Date();
    const birthdayThisYear = new Date(today.getFullYear(), this.birthday.getMonth(), this.birthday.getDate());
    return today > birthdayThisYear;
  }

}
