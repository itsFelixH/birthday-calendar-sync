class BirthdayContact {
  constructor(name, birthday, labels = []) {
    this.name = name;
    this.birthday = new Date(birthday);
    this.labels = labels;
  }

  logToConsole() {
    Logger.log(`🎂 ${this.name} hat Geburtstag am ${birthday.getBirthdayDDMMM()}`);
  }

  getBirthdayDDMM() {
    return Utilities.formatDate(this.birthday, Session.getScriptTimeZone(), "dd.MM.");
  }

  getBirthdayDDMMYYYY() {
    if (this.birthday.getFullYear() == new Date().getFullYear()) {
      // Contact has no birthday year specified
      return this.getBirthdayDDMM();
    } else {
      return Utilities.formatDate(this.birthday, Session.getScriptTimeZone(), "dd.MM.yyyy");
    }
  }

  getBirthdayDDMMM() {
    // return Utilities.formatDate(this.birthday, Session.getScriptTimeZone(), "dd. MMM");
    return `${('0' + this.birthday.getDate()).slice(-2)}. ${monthNames[this.birthday.getMonth()]}`;
  }

  getStringForSummary() {
    var string = `${this.getBirthdayDDMMM()}: ${this.name}`;
    if (this.hasAge()) {
      string += ` wird ${this.getAge()}`
    }
    return string;
  }

  hasAge() {
    return !(this.birthday.getFullYear() == new Date().getFullYear())
  }

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