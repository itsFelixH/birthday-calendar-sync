
/**
 * Deletes events from the calendar with a title containing the specified string.
 *
 * @param {string} calendarId The ID of the calendar.
 * @param {string} titleString The string to search for in the event titles.
 * @param {Date} startDate The start date for the search.
 * @param {Date} endDate The end date for the search.
 */
function deleteEventsByTitle(calendarId, titleString, startDate, endDate) {
  const calendar = CalendarApp.getCalendarById(calendarId);

  Logger.log(`Searching for events between ${startDate.toDateString()} and ${endDate.toDateString()} containing '${titleString}'...`);
  const existingEvents = calendar.getEvents(startDate, endDate);
  const matchingEvents = existingEvents.filter((event) => event.getTitle().includes(titleString));

  Logger.log(`Found ${matchingEvents.length} events! Deleting...`);
  matchingEvents.forEach(event => {
    event.deleteEvent();
    Logger.log(`'${event.getTitle()}' wurde gelöscht`);
  });
}


/**
 * Fetches all contact group names and their IDs.
 *
 * @returns {Object} Dictionary of label IDs and names.
 */
function fetchContactGroupLabels() {
  const user = 'people/me';
  const contactGroups = People.ContactGroups.list({
    resourceName: user,
    groupFields: 'clientData,name'
  });

  const labelMap = {};

  if (contactGroups.contactGroups) {
    contactGroups.contactGroups.forEach(contactGroup => {
      labelMap[contactGroup.resourceName] = contactGroup.name;
    });
  }

  return labelMap;
}


/**
 * Fetches all contacts with birthdays from Google Contacts, optionally filtering by labels.
 *
 * @param {string[]} labelFilter An array of label names to filter contacts by.
 * @returns {BirthdayContact[]} An array of BirthdayContact objects.
 */
function fetchContactsWithBirthdays(labelFilter = []) {
  const peopleService = People.People;
  const labelMap = fetchContactGroupLabels();

  Logger.log(`Getting all contact names and birthdays from Google Contacts...`);
  let contacts = [];

  let pageToken = null;
  const pageSize = 100;

  try {
    do {
      const response = peopleService.Connections.list('people/me', {
        pageSize: pageSize,
        personFields: 'names,birthdays,memberships,phoneNumbers,biographies',
        pageToken: pageToken
      });

      const connections = response.connections || [];
      connections.forEach(person => {
        const name = person.names?.[0]?.displayName || 'Unnamed Contact';
        const birthdayData = person.birthdays?.[0]?.date;
        const memberships = person.memberships || [];
        const phoneNumber = person.phoneNumbers?.[0]?.value || '';
        const notes = (person.biographies || []).map(bio => bio.value).join('. ');

        const labels = memberships.map(membership => labelMap[membership.contactGroupMembership?.contactGroupId] || 'No Label');
        const hasLabel = labels.some(label => labelFilter.includes(label));

        if ((!useLabel || hasLabel) && birthdayData) {
          const year = birthdayData.year || new Date().getFullYear();
          const birthday = new Date(year, birthdayData.month - 1, birthdayData.day);
          const contact = new BirthdayContact(name, birthday);

          contact.whatsappLink = generateWhatsAppLink(phoneNumber);
          contact.instagramLink = generateInstagramLink(notes);

          contacts.push(contact);
        }

      });

      pageToken = response.nextPageToken;
    } while (pageToken);
  } catch (error) {
    Logger.log('Error fetching contacts:', error.message);
  }

  Logger.log(`Got ${contacts.length} contacts with birthdays!`);
  return contacts;
}


/**
 * Creates or updates monthly birthday summary events in the calendar.
 *
 * @param {string} calendarId The ID of the calendar.
 * @param {BirthdayContact[]} contacts An array of BirthdayContact objects.
 * @param {number} [year=new Date().getFullYear()] The year for which to create/update the summaries.
 */
function createOrUpdateMonthlyBirthdaySummaries(calendarId, contacts, year = new Date().getFullYear()) {
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

    const description = `Geburtstage im ${monthNamesLong[month]}\n\n` +
      monthContacts.map(contact => contact.getStringForSummary()).join('\n');

    try {
      if (!event) {
        event = calendar.createAllDayEvent(title, new Date(startDate), {
          description: description,
          reminders: {
            useDefaults: false,
            minutes: 60 * 24 * 4,
            method: 'email',
          }
        });
        Logger.log(`${title} created for ${monthName}`);
      } else {
        // Check if the description needs to be updated
        const currentDescription = event.getDescription();
        if (currentDescription !== description) {
          event.setDescription(description);
          Logger.log(`${title} updated for ${contact.name}`);
        } else {
          Logger.log(`${title} already existed for ${monthName}`);
        }
      }
    } catch (error) {
      Logger.log(`Error creating/updating summary event for ${monthName}: ${error.message}`);
    }
  }

  Logger.log(`All summary events created/updated!`);
}


/**
 * Creates or updates individual birthday events in the calendar.
 *
 * @param {string} calendarId The ID of the calendar.
 * @param {BirthdayContact[]} contacts An array of BirthdayContact objects.
 * @param {number} year The year for which to create/update the events.
 */
function createOrUpdateIndividualBirthdays(calendarId, contacts, year = new Date().getFullYear()) {
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

    let description = contact.hasKnownBirthYear()
      ? `${contact.name} wird heute ${contact.getAge()}\n`
      : `${contact.name} hat heute Geburtstag\n`;
    description += `Geburtstag: ${contact.getBirthdayLongFormat()}`;

    try {
      if (!event) {
        event = calendar.createAllDayEvent(title, startDate, {
          description: description,
          reminders: {
            useDefaults: false,
            minutes: reminderInMinutes,
            method: addReminder,
          },
        });
        Logger.log(`${title} created for ${contact.name}`);
      } else {
        // Check if the description needs to be updated
        const currentDescription = event.getDescription();
        if (currentDescription !== description) {
          event.setDescription(description);
          Logger.log(`${title} updated for ${contact.name}`);
        } else {
          Logger.log(`${title} already existed for ${contact.name}`);
        }
      }
    } catch (error) {
      Logger.log(`Error creating/updating birthday event for ${contact.name}: ${error.message}`);
    }
  });

  Logger.log(`All birthday events created/updated!`);
}


/**
 * Generates a WhatsApp link using a phone number.
 *
 * @param {string} phoneNumber The phone number in international format.
 * @returns {string} The WhatsApp link for the given phone number, or an empty string if the phone number is invalid.
 */
function generateWhatsAppLink(phoneNumber) {
  const cleanedPhoneNumber = phoneNumber.replace(/\D/g, '');
  return cleanedPhoneNumber ? `https://wa.me/${cleanedPhoneNumber}` : '';
}


/**
 * Extracts an Instagram link from the given notes.
 *
 * @param {string} notes The notes containing the Instagram username.
 * @returns {string} The Instagram link, or an empty string if no Instagram link is found.
 */
function extractInstagramLinkFromNotes(notes) {
  const instagramPrefix = "Instagram: ";
  const instagramNote = notes.split('. ').find(note => note.startsWith(instagramPrefix));
  return instagramNote ? `https://www.instagram.com/${instagramNote.substring(instagramPrefix.length).trim()}` : '';
}