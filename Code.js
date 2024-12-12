// CONFIG
var calendarId = "99406ed07130a00e82235b91df15a0fe67a28b8fd7bbaf08f81fff2fd2b77a9a@group.calendar.google.com";
var useLabel = false;
var labelId = "2b335be8d2ec275";
var addReminder = "popup";
var reminderInMinutes = 60 * 12; // 12 hours earlier
var yearToUse = new Date().getFullYear() // Use current year for creating events
var deleteString = "hat Geburtstag";
var deleteStartDate = new Date("2023-01-01");
var deleteEndDate = new Date("2025-12-31");

var monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
var monthNamesLong = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];


class BirthdayContact {
  constructor(name, birthday) {
    this.name = name;
    this.birthday = new Date(birthday);
  }

  logToConsole() {
    Logger.log(`🎂 ${this.name} hat Geburtstag am ${birthday.toDateString()}`);
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
    return `${this.getBirthdayDDMMM()}: ${this.name}`;
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

// MAIN FUNCTIONS
function updateBirthdaysAndSummaries() {
  var Contacts = getAllContacts();
  createOrUpdateBirthdays(calendarId, Contacts);
  createOrUpdateBirthdaySummaries(calendarId, Contacts);
}

function updateBirthdays() {
  var Contacts = getAllContacts();
  createOrUpdateBirthdays(calendarId, Contacts);
}

function updateBirthdaySummaries() {
  var Contacts = getAllContacts();
  createOrUpdateBirthdaySummaries(calendarId, Contacts);
}

function deleteEvents() {
  deleteEventsWithTitle(calendarId, deleteString, deleteStartDate, deleteEndDate);
}


// FUNCTIONS

function deleteEventsWithTitle(calendarId, titleString, startDate, endDate) {
  const calendarService = CalendarApp;

  Logger.log(`Searching for events between ${startDate.toDateString()} and ${endDate.toDateString()} containing '${titleString}'...`);
  const ExistingEvents = calendarService.getCalendarById(calendarId).getEvents(startDate, endDate);
  const matchingEvents = ExistingEvents.filter((event) => event.getTitle().includes(titleString));

  Logger.log(`Found ${matchingEvents.length} events! Deleting...`)
  for (var event of matchingEvents) {
    event.deleteEvent();
    // show event name in log
    Logger.log(`'${event.getTitle()}' wurde gelöscht`);
  }
}


function getAllContacts() {
  const peopleService = People.People;

  Logger.log(`Getting all contact names and birthdays from Google Contacts...`);
  let Contacts = [];

  let pageToken = null;
  const pageSize = 100;

  try {
    do {
      const response = peopleService.Connections.list('people/me', {
        pageSize: pageSize,
        personFields: 'names,birthdays,memberships',
        pageToken: pageToken
      });

      const connections = response.connections || [];
      connections.forEach(person => {
        const name = person.names?.[0]?.displayName || 'Unnamed Contact';
        const birthdayData = person.birthdays?.[0]?.date;
        const hasLabel = person.memberships?.some(m => m.contactGroupMembership?.contactGroupId === labelId);

        if ((!useLabel || hasLabel) && birthdayData) {
          const year = birthdayData.year || new Date().getFullYear();
          const birthday = new Date(year, birthdayData.month - 1, birthdayData.day);
          Contacts.push(new BirthdayContact(name, birthday));
        }
      });

      pageToken = response.nextPageToken;
    } while (pageToken);
  } catch (error) {
    Logger.log(error.message);
  }

  Logger.log(`Got ${Contacts.length} Contacts with birthdays!`);
  return Contacts;
}


function createOrUpdateBirthdaySummaries(calendarId, Contacts, year = new Date().getFullYear()) {
  const calendarService = CalendarApp;

  Logger.log(`Creating/Updating birthday summary events for each month...`);

  for (var month = 0; month < 12; month++) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month, 2);

    var monthName = Utilities.formatDate(startDate, Session.getScriptTimeZone(), "MMMM");
    Logger.log(`Processing month ${monthName}`);

    const title = `🎉🎂 GEBURTSTAGE 🎂🎉`;
    const Events = calendarService.getCalendarById(calendarId).getEvents(startDate, endDate);
    let event = Events.find(e => e.getTitle() === title);

    const MonthContacts = Contacts
      .filter(contact => contact.birthday.getMonth() === month)
      .sort((a, b) => a.birthday.getDate() - b.birthday.getDate());

    const description = `Geburtstage im ${monthNamesLong[month]}\n\n`
      + MonthContacts.map(contact => contact.getStringForSummary()).join('\n');

    // Create or update event
    if (!event) {
      event = calendar.createAllDayEvent(title, new Date(startDate), { description: description, reminders: { useDefaults: false }  });
      Logger.log(`${title} created for ${monthName}`);
    } else { // Update event description if it exists
      event.setDescription(description);
      Logger.log(`${title} updated for ${monthName}`);
    }
  }

  Logger.log(`All summary events created/updated!`);
}


function createOrUpdateBirthdays(calendarId, Contacts, year = new Date().getFullYear()) {
  const calendar = CalendarApp.getCalendarById(calendarId);

  Logger.log(`Creating/Updating birthday events for ${Contacts.length} contacts...`);
  
  Contacts.forEach(contact => {
    const startDate = new Date(year, contact.birthday.getMonth(), contact.birthday.getDate());
    const endDate = new Date(year, contact.birthday.getMonth(), contact.birthday.getDate() + 1);

    const title = `🎂 ${contact.name} hat Geburtstag`;
    const Events = calendar.getEvents(startDate, endDate);
    let event = Events.find(e => e.getTitle() === title);

    let description = contact.hasAge()
      ? `${contact.name} wird heute ${contact.getAge()}\n`
      : `${contact.name} hat heute Geburtstag\n`;
    description += `Geburtstag: ${contact.getBirthdayDDMMYYYY()}`;

    if (!event) {
      event = calendar.createAllDayEvent(title, startDate, {
        description: description,
        reminders: { useDefaults: false, minutes: reminderInMinutes, method: addReminder }
      });
      Logger.log(`${title} created for ${contact.name}`);
    } else {
      event.setDescription(description);
      Logger.log(`${title} updated for ${contact.name}`);
    }
  })

  Logger.log(`All birthday events created/updated!`);
}



