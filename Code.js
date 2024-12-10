
// USE YOUR PRIMARY GOOGLE CALENDAR
var useMainCalendar = true

// CHANGE THIS ID TO THE CALENDAR ID FOR THE CALENDAR YOU WANT TO USE
// This is ignored if useMainCalendar = true
var calendarId = "f3700774e56fe5f35a9dfa694233f98e77cff17321917d9536e39cf0918488ac@group.calendar.google.com";

// STRING TO SEARCH FOR
var deleteString = "s Birthday";

// CHANGE THIS TO 'var onlyContactLabel = true' IF YOU ONLY WANT TO COPY BIRTHDAYS FOR CONTACTS WITH A SPECIFIC LABEL
// DON'T FORGET TO SET THE contactLabelID BELOW IF THIS IS true
var onlyContactLabel = false;
// TO GET THE contactLabelID OPEN https://contacts.google.com/ CLICK YOUR LABEL AND NOTE THE PAGE ADDRESS
// THE LAST PART OF THE ADDRESS IS THE contactLabelID: https://contacts.google.com/label/[contactLabelID]
var contactLabelID = "xxxxxxxxxxxxxx";

// REMINDER IN MINUTES
// addReminder must be set to none, email or popup. When using 'none' the calendar's default reminder will be applied, if set.
var addReminder = "popup";
var reminderMinutes = 60 * 12; // 12 HOURS EARLIER = 12:00PM THE PREVIOUS DAY
// For hours/days write arithmetic e.g for 10pm four days earlier use: 3 * 24 * 60 + 2 * 60
// Note: birthdays start at 00:00 so the above is 3 days + 2 hours earlier (4 days earlier)


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

  getBirthdayString() {
    return `${('0' + this.birthday.getDate()).slice(-2)}.${('0' + (this.birthday.getMonth() + 1)).slice(-2)}.${this.birthday.getFullYear()}`;
  }

  getSummaryString() {
    return `${('0' + this.birthday.getDate()).slice(-2)}.${('0' + (this.birthday.getMonth() + 1)).slice(-2)}: ${this.name}`;
  }
}

function deleteEvents() {
  deleteEventsWithTitle(useMainCalendar ? "primary" : calendarId, deleteString);
}

function updateBirthdays() {
  createSpecialEventsForAllContacts(useMainCalendar ? "primary" : calendarId);
}

function updateBirthdaySummaries() {
  var contactList = getAllContacts();
  createOrUpdateBirthdaySummaries(useMainCalendar ? "primary" : calendarId, contactList);
}


function deleteEventsWithTitle(calendarId, titleString) {
  const calendarService = CalendarApp;

  var startDate = new Date("1940-01-01");
  var endDate = new Date("2100-12-31");

  const existingEvents = calendarService.getCalendarById(calendarId).getEvents(startDate, endDate);

  for(var i=0; i < existingEvents.length; i++){
    var event = existingEvents[i];
    if(event.getTitle().includes(titleString)){
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
          if (membership.contactGroupMembership != null && membership.contactGroupMembership.contactGroupId.includes(contactLabelID)) {
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
            // Handle cases where the event year might be undefined
            const year = new Date().getFullYear(); // Use current year
            const formattedBirthday = new Date(year, birthdays[0].date.month - 1, birthdays[0].date.day);
            var birthdayContact = new BirthdayContact(contactName, formattedBirthday);
            contactList.push(birthdayContact);
          }
        }
      });

      pageToken = response.nextPageToken;
    } while (pageToken);
  } catch (error) {
    Logger.log("Check if the CONFIGURATION section is correct: " + error.message);
  }

  return contactList;
}


function createOrUpdateBirthdaySummaries(calendarId, contactList) {
  const calendarService = CalendarApp;

  for (var month = 0; month < 12; month++) {
    Logger.log("Processing month " + (month+1));

    const year = new Date().getFullYear();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    var monthName = Utilities.formatDate(startDate, Session.getScriptTimeZone(), "MMMM");
    eventTitle = `🎉🎂 GEBURTSTAGE 🎂🎉`;

    // Check for existing events specifically for this contact on the event date
    const existingEvents = calendarService.getCalendarById(calendarId).getEvents(startDate, endDate);
    const eventExists = existingEvents.some(event => event.getTitle() === eventTitle);
    var event;

    // filter birthday for month
    const filterList = contactList.filter((contact) => contact.birthday.getMonth() == month)
    const sortedList = filterList.sort((contactA,contactB) => contactA.birthday.getDate() - contactB.birthday.getDate());
    
    let eventDesc = `Geburtstage im ${monthNamesLong[month]}`+ '\n\n';
    sortedList.forEach(contact => {
      eventDesc += contact.getSummaryString() + '\n';
    });
    
    // Create the event if it doesn't already exist
    if (!eventExists) {
      // Use CalendarApp to create a regular event in a regular calendar
      event = calendarService.getCalendarById(calendarId).createAllDayEvent(
        eventTitle,
        startDate,
        //CalendarApp.newRecurrence().addYearlyRule(),
        {description: eventDesc, reminders: {useDefaults: false}},
      );
      Logger.log(`${eventTitle} for ${monthName} created on ${startDate.toDateString()}`);
    } else {
      Logger.log(`${eventTitle} for ${monthName} already exists on ${startDate.toDateString()}`);
      Logger.log(`Updating event description...`);
      
      for (var i = 0; i < existingEvents.length; i++) {
        var event = existingEvents[i];
        if (event.getTitle() === eventTitle) {
          event.setDescription(eventDesc);
        }
      }

    }
  }
}


function createOrUpdateBirthdays(calendarId, contactList) {
  const calendarService = CalendarApp;

  for (var birthdayContact of contactList) {
    Logger.log(`Processing ${birthdayContact.name}`);

    const year = new Date().getFullYear();
    const startDate = new Date(year, birthdayContact.birthday.month - 1, birthdayContact.birthday.day);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    var eventTitle = `🎂 ${birthdayContact.name} hat Geburtstag`;

    // Check for existing events specifically for this contact on the event date
    const existingEvents = calendarService.getCalendarById(calendarId).getEvents(startDate, endDate);
    const eventExists = existingEvents.some(event => event.getTitle() === eventTitle);
    var event;
    
    var eventDesc = `${birthdayContact.getBirthdayString}`+ '\n';
    
    // Create the event if it doesn't already exist
    if (!eventExists) {
      // Use CalendarApp to create a regular event in a regular calendar
      event = calendarService.getCalendarById(calendarId).createAllDayEvent(
        eventTitle,
        startDate,
        //CalendarApp.newRecurrence().addYearlyRule(),
        {description: eventDesc},
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
      Logger.log(`${eventTitle} created for ${contactName} on ${startDate.toDateString()}`);
    } else {
      Logger.log(`${eventTitle} already exists for ${contactName} on ${startDate.toDateString()}`);
    }
  }
}



