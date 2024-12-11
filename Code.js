// CONFIG

// CHANGE THIS ID TO THE CALENDAR ID FOR THE CALENDAR YOU WANT TO USE
// var calendarId = "primary";
var calendarId = "99406ed07130a00e82235b91df15a0fe67a28b8fd7bbaf08f81fff2fd2b77a9a@group.calendar.google.com";

// CHANGE THIS TO 'var onlyContactLabel = true' IF YOU ONLY WANT TO COPY BIRTHDAYS FOR CONTACTS WITH A SPECIFIC LABEL
// DON'T FORGET TO SET THE contactLabelID BELOW IF THIS IS true
var useLabel = false;
// THE LAST PART OF THE ADDRESS IS THE contactLabelID: https://contacts.google.com/label/[contactLabelID]
var labelId = "2b335be8d2ec275";

// REMINDER IN MINUTES
// addReminder must be set to none, email or popup. Use 'none' for the calendar's default reminder
var addReminder = "popup";
var reminderInMinutes = 60 * 12; // 12 HOURS EARLIER = 12:00PM THE PREVIOUS DAY

// Use for function "deleteEvents()"
// STRING TO SEARCH FOR WHEN DELETING EVENTS
var deleteString = "s Birthday";
// TIME SPAN IN WHICH MATCHING EVENTS ARE DELETED
var deleteStartDate = new Date("2024-01-01");
var deleteEndDate = new Date("2024-12-31");

// ===============================================

var monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
var monthNamesLong = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];


// Custom Class
class BirthdayContact {
  constructor(name, birthday) {
    this.name = name;
    this.birthday = birthday;
  }

  logToConsole() {
    Logger.log(`🎂 ${this.name} hat Geburtstag am ${birthday.toDateString()}`);
  }

  getBirthdayDDMM() {
    return `${('0' + this.birthday.getDate()).slice(-2)}.${('0' + (this.birthday.getMonth() + 1)).slice(-2)}.`;
  }

  getBirthdayDDMMYYYY() {
    if (this.birthday.getFullYear() == new Date().getFullYear()) {
      // Contact has no birthday year specified
      return this.getBirthdayString();
    }
    else {
      return `${this.getBirthdayString()}${this.birthday.getFullYear()}`;
    }
  }

  getBirthdayDDMMM() {
    return `${('0' + this.birthday.getDate()).slice(-2)}. ${monthNames[this.birthday.getMonth()]}`;
  }

  getStringForSummary() {
    return `${this.getBirthdayDDMMM()}: ${this.name}`;
  }
}

// MAIN FUNCTIONS
function deleteEvents() {
  deleteEventsWithTitle(calendarId, deleteString, deleteStartDate, deleteEndDate);
}

function updateBirthdays() {
  createSpecialEventsForAllContacts(calendarId);
}

function updateBirthdaySummaries() {
  var contactList = getAllContacts();
  createOrUpdateBirthdaySummaries(calendarId, contactList);
}


// FUNCTIONS

function deleteEventsWithTitle(calendarId, titleString, startDate, endDate) {
  const calendarService = CalendarApp;
  const existingEvents = calendarService.getCalendarById(calendarId).getEvents(startDate, endDate);

  for (var i = 0; i < existingEvents.length; i++) {
    var event = existingEvents[i];
    if (event.getTitle().includes(titleString)) {
      event.deleteEvent();
      // show event name in log
      Logger.log(`"${event.getTitle()}" wurde gelöscht`);
    }
  }
}


function getAllContacts() {
  const peopleService = People.People;

  let contactList = [];

  let pageToken = null;
  const pageSize = 100;

  try {
    do {
      var response;
      response = peopleService.Connections.list('people/me', {
        pageSize: pageSize,
        personFields: 'names,birthdays,events,memberships',
        pageToken: pageToken
      });

      const connections = response.connections || [];

      connections.forEach(connection => {
        const names = connection.names || [];
        const memberships = connection.memberships || [];

        let hasLabel = false;
        memberships.forEach(membership => {
          if (membership.contactGroupMembership != null && membership.contactGroupMembership.contactGroupId.includes(labelId)) {
            hasLabel = true;
          }
        });

        const contactName = names.length > 0 ? names[0].displayName : 'Unnamed Contact';

        if (!onlyContactLabel || hasLabel) {
          // Process Birthdays
          const birthdays = connection.birthdays || [];
          if (birthdays.length > 1) {
            Logger.log(`🎂 ${contactName} hat mehr als einen Geburtstag! Skipping ...`);
          } else if (birthdays.length == 1) {
            const year = birthdays[0].date.year || new Date().getFullYear();
            const formattedBirthday = new Date(year, birthdays[0].date.month - 1, birthdays[0].date.day);

            var birthdayContact = new BirthdayContact(contactName, formattedBirthday);
            contactList.push(birthdayContact);
          }
        }
      });

      pageToken = response.nextPageToken;
    } while (pageToken);
  } catch (error) {
    Logger.log(error.message);
  }

  return contactList;
}


function createOrUpdateBirthdaySummaries(calendarId, contactList) {
  const calendarService = CalendarApp;

  for (var month = 0; month < 12; month++) {
    Logger.log("Processing month " + (month + 1));

    const year = new Date().getFullYear(); // Use current year
    const startDate = new Date(year, month, 1);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    var monthName = Utilities.formatDate(startDate, Session.getScriptTimeZone(), "MMMM");
    eventTitle = `🎉🎂 GEBURTSTAGE 🎂🎉`;

    // Check for existing events specifically for this contact on the event date
    const existingEvents = calendarService.getCalendarById(calendarId).getEvents(startDate, endDate);
    const eventExists = existingEvents.some(event => event.getTitle() === eventTitle);
    var event;

    // Filter birthday for month
    const filterList = contactList.filter((contact) => contact.birthday.getMonth() == month)
    const sortedList = filterList.sort((contactA, contactB) => contactA.birthday.getDate() - contactB.birthday.getDate());

    let eventDesc = `Geburtstage im ${monthNamesLong[month]}` + '\n\n';
    sortedList.forEach(contact => {
      eventDesc += contact.getStringForSummary() + '\n';
    });

    // Create the event if it doesn't already exist
    if (!eventExists) {
      event = calendarService.getCalendarById(calendarId).createAllDayEvent(
        eventTitle,
        startDate,
        { description: eventDesc, reminders: { useDefaults: false } },
      );
      Logger.log(`${eventTitle} created for ${monthName} on ${startDate.toDateString()}!`);
    
    } else { // Update event description if it exists

      for (var i = 0; i < existingEvents.length; i++) {
        var event = existingEvents[i];
        if (event.getTitle() === eventTitle) {
          event.setDescription(eventDesc);
        }
      }
      Logger.log(`${eventTitle} already exists for ${monthName} on ${startDate.toDateString()}. Description updated!`);
    }
  }
}


function createOrUpdateBirthdays(calendarId, contactList) {
  const calendarService = CalendarApp;

  for (var birthdayContact of contactList) {
    const year = new Date().getFullYear();
    const startDate = new Date(year, birthdayContact.birthday.getMonth() + 1, birthdayContact.birthday.getDate());
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    var eventTitle = `🎂 ${birthdayContact.name} hat Geburtstag`;

    // Check for existing events specifically for this contact on the event date
    const existingEvents = calendarService.getCalendarById(calendarId).getEvents(startDate, endDate);
    const eventExists = existingEvents.some(event => event.getTitle() === eventTitle);
    var event;

    var eventDesc = `${birthdayContact.getBirthdayDDMMYYYY()}`;

    // Create the event if it doesn't already exist
    if (!eventExists) {
      event = calendarService.getCalendarById(calendarId).createAllDayEvent(
        eventTitle,
        startDate,
        { description: eventDesc },
      );
      switch (addReminder) {
        case "email":
          event.addEmailReminder(reminderMinutes);
          break;
        case "popup":
          event.addPopupReminder(reminderMinutes);
          break;
        default:
          break;
      }
      Logger.log(`${eventTitle} created for ${contactName} on ${startDate.toDateString()}!`);

    } else { // Update event description if it exists

      for (var i = 0; i < existingEvents.length; i++) {
        var event = existingEvents[i];
        if (event.getTitle() === eventTitle) {
          event.setDescription(eventDesc);
        }
      }
      Logger.log(`${eventTitle} already exists for ${contactName} on ${startDate.toDateString()}. Description updated!`);
    }
  }
}



