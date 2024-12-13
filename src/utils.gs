
/**
 * Deletes events from the calendar with a title containing the specified string.
 * @param {string} calendarId - The ID of the calendar.
 * @param {string} titleString - The string to search for in the event titles.
 * @param {Date} startDate - The start date for the search.
 * @param {Date} endDate - The end date for the search.
 */
function deleteEventsWithTitle(calendarId, titleString, startDate, endDate) {
  const calendarService = CalendarApp;

  Logger.log(`Searching for events between ${startDate.toDateString()} and ${endDate.toDateString()} containing '${titleString}'...`);
  const existingEvents = calendarService.getCalendarById(calendarId).getEvents(startDate, endDate);
  const matchingEvents = existingEvents.filter((event) => event.getTitle().includes(titleString));

  Logger.log(`Found ${matchingEvents.length} events! Deleting...`);
  matchingEvents.forEach(event => {
    event.deleteEvent();
    Logger.log(`'${event.getTitle()}' wurde gelöscht`);
  });
}


/**
 * Fetches all contacts from Google Contacts.
 * @returns {Array.<BirthdayContact>} - An array of BirthdayContact objects.
 */
function getAllContacts() {
  const peopleService = People.People;

  Logger.log(`Getting all contact names and birthdays from Google Contacts...`);
  let contacts = [];

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
          contacts.push(new BirthdayContact(name, birthday, person.memberships));
          Logger.log(name + ': ' + person.memberships.join(', '));
        }
      });

      pageToken = response.nextPageToken;
    } while (pageToken);
  } catch (error) {
    Logger.log(error.message);
  }

  Logger.log(`Got ${contacts.length} contacts with birthdays!`);
  return contacts;
}


/**
 * Creates or updates monthly birthday summaries in the calendar.
 * @param {string} calendarId - The ID of the calendar.
 * @param {Array.<BirthdayContact>} contacts - An array of BirthdayContact objects.
 * @param {number} [year=new Date().getFullYear()] - The year for which to create/update the summaries.
 */
function createOrUpdateBirthdaySummaries(calendarId, contacts, year = new Date().getFullYear()) {
  if (contacts.length === 0) {
    Logger.log("No contacts found. Aborting.");
    return;
  }
  const calendar = CalendarApp.getCalendarById(calendarId);

  Logger.log(`Creating/Updating birthday summary events in ${year} for each month...`);

  for (var month = 0; month < 12; month++) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month, 2);

    const monthName = Utilities.formatDate(startDate, Session.getScriptTimeZone(), "MMMM");
    Logger.log(`Processing month ${monthName}`);

    const title = `🎉🎂 GEBURTSTAGE 🎂🎉`;
    const events = calendar.getEvents(startDate, endDate);
    let event = events.find(e => e.getTitle() === title);

    const monthContacts = contacts
      .filter(contact => contact.birthday.getMonth() === month)
      .sort((a, b) => a.birthday.getDate() - b.birthday.getDate());

    const description = `Geburtstage im ${monthNamesLong[month]}\n\n`
      + monthContacts.map(contact => contact.getStringForSummary()).join('\n');

    // Create or update event
    if (!event) {
      event = calendar.createAllDayEvent(title, new Date(startDate), { description: description, reminders: { useDefaults: false } });
      Logger.log(`${title} created for ${monthName}`);
    } else {
      event.setDescription(description);
      Logger.log(`${title} updated for ${monthName}`);
    }
  }

  Logger.log(`All summary events created/updated!`);
}


/**
 * Creates or updates individual birthday events in the calendar.
 * @param {string} calendarId - The ID of the calendar.
 * @param {Array.<BirthdayContact>} contacts - An array of BirthdayContact objects.
 * @param {number} [year=new Date().getFullYear()] - The year for which to create/update the events.
 */
function createOrUpdateBirthdays(calendarId, contacts, year = new Date().getFullYear()) {
  if (contacts.length === 0) {
    Logger.log("No contacts found. Aborting.");
    return;
  }
  const calendar = CalendarApp.getCalendarById(calendarId);

  Logger.log(`Creating/Updating birthday events in ${year} for ${contacts.length} contacts...`);

  contacts.forEach(contact => {
    const startDate = new Date(year, contact.birthday.getMonth(), contact.birthday.getDate());
    const endDate = new Date(year, contact.birthday.getMonth(), contact.birthday.getDate() + 1);

    const title = `🎂 ${contact.name} hat Geburtstag`;
    const events = calendar.getEvents(startDate, endDate);
    let event = events.find(e => e.getTitle() === title);

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
  });

  Logger.log(`All birthday events created/updated!`);
}
