
/**
 * Deletes events from the calendar with a title containing the specified string.
 *
 * @param {string} calendarId The ID of the calendar.
 * @param {string} titleString The string to search for in the event titles.
 * @param {Date} startDate The start date for the search.
 * @param {Date} endDate The end date for the search.
 */
function deleteEventsByTitle(calendarId) {
  // The string to search for in the event titles that should be deleted.
  var titleString = '🎉🎂 GEBURTSTAGE 🎂🎉';

  // The start date from which to search for events to delete.
  // Only events on or after this date will be considered for deletion.
  var startDate = new Date('2025-01-01');

  // The end date until which to search for events to delete.
  // Only events on or before this date will be considered for deletion.
  var endDate = new Date('2025-12-31');

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
 * Fetches all contacts with birthdays from Google Contacts, optionally filtering by labels.
 *
 * @param {string[]} labelFilter An array of label names to filter contacts by.
 * @returns {BirthdayContact[]} An array of BirthdayContact objects.
 */
function fetchContactsWithBirthdays(labelFilter = []) {
  const peopleService = People.People;
  var labelManager = new LabelManager();

  if (labelFilter == [] || labelFilter == [''] || labelFilter == '' || labelFilter.length < 1) {
    Logger.log(`Fetching all contacts from Google Contacts...`);
  } else {
    Logger.log(`Fetching all contacts with any label(s) from '${labelFilter}' from Google Contacts...`);
  }

  let contacts = [];

  let pageToken = null;
  const pageSize = 100;

  try {
    do {
      const response = peopleService.Connections.list('people/me', {
        pageSize: pageSize,
        personFields: 'names,birthdays,memberships,emailAddresses,phoneNumbers,addresses,biographies',
        pageToken: pageToken
      });

      const connections = response.connections || [];
      connections.forEach(person => {
        const birthdayData = person.birthdays?.[0]?.date;
        const memberships = person.memberships || [];
        const labelIds = memberships.map(membership => membership.contactGroupMembership.contactGroupId);
        const labelNames = labelManager.getLabelNamesByIds(labelIds);
        const labelMatch = labelNames.length === 0 || labelNames.some(labelName => {
          return labelFilter.includes(labelName);
        });

        if ((!useLabel || labelMatch) && birthdayData) {
          const year = birthdayData.year || new Date().getFullYear();
          const birthday = new Date(year, birthdayData.month - 1, birthdayData.day);

          const name = person.names?.[0]?.displayName || 'Unnamed Contact';
          const email = person.emailAddresses?.[0]?.value;
          const city = (person.addresses || []).map(address => address.city || '').join(', ');
          const phoneNumber = person.phoneNumbers?.[0]?.value || '';
          const notes = (person.biographies || []).map(bio => bio.value).join('. ');

          var whatsappLink = generateWhatsAppLink(phoneNumber)
          var instagramLink = extractInstagramLinkFromNotes(notes)

          const contact = new BirthdayContact(name, birthday, labelNames, email, city, whatsappLink, instagramLink);
          contacts.push(contact);
        }

      });

      pageToken = response.nextPageToken;
    } while (pageToken);
  } catch (error) {
    Logger.log('Error fetching contacts:', error.toString());
  }

  // Sort contacts based on their birthday
  contacts.sort((a, b) => {
    const monthA = a.birthday.getMonth();
    const dayA = a.birthday.getDate();
    const monthB = b.birthday.getMonth();
    const dayB = b.birthday.getDate();
  
    if (monthA < monthB) {
      return -1; 
    } else if (monthA > monthB) {
      return 1;
    } else { // months are the same
      return dayA - dayB; 
    }
  });

  Logger.log(`Got ${contacts.length} contacts with birthdays!`);
  return contacts;
}


/**
 * Creates or updates monthly birthday summary events in the calendar.
 *
 * @param {string} calendarId The ID of the calendar.
 * @param {BirthdayContact[]} contacts An array of BirthdayContact objects.
 * @param {number} [year=new Date().getFullYear()] The year for which to create / update the summaries.
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
      monthContacts.map(contact => contact.getBirthdaySummaryEventString()).join('\n');

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
        Logger.log(`Event '${title}' for ${monthName} created`);
      } else {
        if (event.getDescription() != description) {
          event.setDescription(description);
          Logger.log(`Event '${title}' for ${monthName} updated`);
        }
        else {
          Logger.log(`Event '${title}' for ${monthName} already existed`);
        }
      }
    } catch (error) {
      Logger.log(`Error creating/updating summary event for ${monthName}:`, error.toString());
    }
  }

  Logger.log(`All summary events created or updated!`);
}

/**
 * Creates and sends a monthly birthday summary email.
 *
 * @param {string} calendarId - The ID of the calendar to search for birthdays.
 * @param {object[]} contacts - An array of contact objects, each with a "birthday" property (Date object).
 * @param {number} month - The numeric month (0-indexed) for the summary.
 * @param {number} year - The year for the summary.
 */
function createMonthlyBirthdaySummaryMail(calendarId, contacts, month, year) {
  if (contacts.length === 0) {
    Logger.log("No contacts found. Aborting.");
    return;
  }

  const startDate = new Date(year, month, 1);
  const monthName = Utilities.formatDate(startDate, Session.getScriptTimeZone(), "MMMM");
  Logger.log(`Creating summary mail for ${monthName} ${year}...`);

  // Filter contacts with birthdays in the specified month
  const monthContacts = contacts.filter(contact => contact.birthday.getMonth() === month)
                                .sort((a, b) => a.birthday.getDate() - b.birthday.getDate());

  // Build the email body with formatted birthdates
  let mailBody = `Geburtstage im ${monthNamesLong[month]}\n\n`
  mailBody += monthContacts.map(contact => contact.getBirthdaySummaryMailString()).join('\n');
  mailBody += `\n\n---\n\n`;
  mailBody += 'Diese E-Mail wurde automatisch von einem Google Apps Script generiert.\n'
  mailBody += 'Script-Name: ' + ScriptApp.getActiveScript().getName() + '\n'
  mailBody += 'Script-URL: ' + ScriptApp.getActiveScriptUrl();

  const subject = `🎉🎂 GEBURTSTAGS REMINDER 🎂🎉`;

  sendMail(subject, mailBody);
  Logger.log(`Email sent!`);
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
    const description = contact.getBirthdayEventString();

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
        Logger.log(`Event '${title}' for ${contact.name} created`);
      } else {
        if (event.getDescription() != description) {
          event.setDescription(description);
          Logger.log(`Event '${title}' for ${contact.name} updated`);
        }
        else {
          Logger.log(`Event '${title}' for ${contact.name} already existed`);
        }
      }
    } catch (error) {
      Logger.log(`Error creating/updating birthday event for ${contact.name}`, error.toString());
    }
  });

  Logger.log(`All birthday events created or updated!`);
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
  const instagramPrefixes = ["Instagram: ", "@"];
  const baseUrl = "https://www.instagram.com/";

  const instagramNote = notes.split('. ').find(note => {
    return instagramPrefixes.some(prefix => note.startsWith(prefix));
  });

  if (instagramNote) {
    const prefix = instagramPrefixes.find(prefix => instagramNote.startsWith(prefix));
    let username = instagramNote.substring(prefix.length).trim();
    if (username.startsWith('@')) {
      username = username.substring(1);
    }
    return `${baseUrl}${username}`;
  }
  return '';
}


/**
 * Updates the reminders for an existing event.
 *
 * @param {CalendarApp.CalendarEvent} event The event to update.
 * @param {CalendarApp.Reminder[]} newReminders An array of new reminder objects.
 */
function updateEventReminders(event, newReminders) {
  event.setReminders(newReminders);
  event.saveEvent();
  Logger.log(`Reminders for ${event.getTitle()} updated successfully.`);
}


/**
 * Sends an email using the Gmail API.
 *
 * @param {string} subject - The subject of the email.
 * @param {string} body - The body of the email.
 */
function sendMail(subject, body) {
  const recipient = Session.getActiveUser().getEmail();
  const sender = ScriptApp.getActiveScript().getName(); 
  const message = {
    to: recipient,
    subject: subject,
    body: body,
    from: sender + " <" + Session.getActiveUser().getEmail() + ">"
  };

  const rawMessage = Utilities.base64EncodeWebSafe(
    `From: ${message.from}\r\n` +
    `To: ${message.to}\r\n` +
    `Subject: ${message.subject}\r\n\r\n` +
    message.body
  );

  Gmail.Users.Messages.send({ raw: rawMessage }, 'me');
}

/**
 * Calculates the date for the beginning of the next month.
 *
 * @returns {Date} - The date object representing the beginning of the next month.
 */
function getNextMonth() {
  const today = new Date();
  const currentMonth = today.getMonth();
  const nextMonth = (currentMonth + 1) % 12;

  return new Date(today.getFullYear(), nextMonth, 1);
}