
/**
 * BirthdayContact class to store contact information and format birthdays.
 */
class BirthdayContact {
  /**
   * Creates an instance of BirthdayContact.
   * @param {string} name - The name of the contact.
   * @param {Date|string} birthday - The birthday of the contact.
   * @param {Array.<string>} [labels=[]] - The labels associated with the contact.
   */
  constructor(name, birthday, labels = []) {
    this.name = name;
    this.birthday = new Date(birthday);
    this.labels = labels;
  }


  /**
   * Logs the contact's birthday to the console.
   */
  logToConsole() {
    Logger.log(`🎂 ${this.name} hat Geburtstag am ${this.getBirthdayDDMMM()}`);
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
   * Checks if the contact has a specified age.
   * @returns {boolean} - True if the contact has a specified age, false otherwise.
   */
  hasAge() {
    return !(this.birthday.getFullYear() == new Date().getFullYear());
  }


  /**
   * Gets the age of the contact.
   * @returns {number} - The age of the contact.
   * @throws {Error} - If the birthday year is not specified.
   */
  getAge() {
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

}
