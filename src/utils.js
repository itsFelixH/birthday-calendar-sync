
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
 * Logs the configuration from config.js.
 */
function logConfiguration() {
  logInfo("Configuration from config.js:");

  // Log each configuration variable.
  let calendar = CalendarApp.getCalendarById(calendarId);
  if (calendar) {
    logDebug("Calendar Name: " + calendar.getName());
  } else {
    logWarning("Calendar with ID " + calendarId + " not found.");
  }
  Logger.log("useLabel: " + useLabel);

  if (typeof labelFilter !== 'undefined') {
    Logger.log("labelFilter: " + labelFilter.join(", ")); // Assuming it's an array
  } else {
    Logger.log("labelFilter: Not defined in config.js");
  }

  Logger.log("reminderMethod: " + reminderMethod);
  Logger.log("reminderInMinutes: " + reminderInMinutes);
  Logger.log("createIndividualBirthdayEvents: " + createIndividualBirthdayEvents);
  Logger.log("createBirthdaySummaryEvents: " + createBirthdaySummaryEvents);
  Logger.log("monthsAhead: " + monthsAhead);
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
          const instagramName = extractInstagramNameFromNotes(notes)

          const contact = new BirthdayContact(name, birthday, labelNames, email, city, phoneNumber, instagramName);
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
 * Creates or updates monthly birthday summary events in the calendar for a configurable period.
 * 
 * @param {string} calendarId The ID of the calendar
 * @param {BirthdayContact[]} contacts  Array of BirthdayContact objects
 * @param {number} [monthsAhead=12] Number of months to look ahead from current month
 * @param {number} [reminderInMinutes=5760] Reminder minutes (default: 4 days)
 * @param {string} [reminderMethod='popup'] Reminder method (popup/email)
 */
function createOrUpdateMonthlyBirthdaySummaries(calendarId, contacts, monthsAhead = 12, reminderInMinutes = 5760, reminderMethod = 'popup') {
  if (contacts.length === 0) {
    Logger.log("🚫 No contacts found. Aborting monthly summaries.");
    return;
  }

  const calendar = CalendarApp.getCalendarById(calendarId);

  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + monthsAhead);

  Logger.log(`📅 Creating/updating birthday summaries for ${monthsAhead} months...`);

  let current = new Date(startDate);
  while (current <= endDate) {
    const year = current.getFullYear();
    const month = current.getMonth();
    const monthEventStart = new Date(year, month, 1);
    const monthEventEnd = new Date(year, month, 2);
    const monthName = Utilities.formatDate(monthEventStart, Session.getScriptTimeZone(), "MMMM");

    try {
      Logger.log(`Processing month ${monthName}`);

      const monthContacts = contacts
        .filter(contact => contact.birthday.getMonth() === month)
        .sort((a, b) => a.birthday.getDate() - b.birthday.getDate());

      if (monthContacts.length === 0) {
        logDebug(`⏩ Skipping ${monthName} - no birthdays`);
        current.setMonth(month + 1);
        continue;
      }

      const title = `🎉🎂 GEBURTSTAGE 🎂🎉`;
      const events = calendar.getEvents(monthEventStart, monthEventEnd);
      const existingEvent = events.find(e => e.getTitle() === title);
      
      const description = `Geburtstage im ${monthNamesLong[month]}\n\n` +
        monthContacts.map(contact => contact.getBirthdaySummaryEventString()).join('\n');

      if (!existingEvent) {
        calendar.createAllDayEvent(title, new Date(monthEventStart), {
          description: description,
          reminders: {
            useDefaults: false,
            minutes: reminderInMinutes,
            method: reminderMethod,
          }
        });
        Logger.log(`✅ Created ${monthName} ${year} summary event`);
      } else {
        if (existingEvent.getDescription() !== description) {
          existingEvent.setDescription(description);
          Logger.log(`🔄 Updated ${monthName} ${year} summary event`);
        } else {
          Logger.log(`⏩ ${monthName} ${year} summary event unchanged`);
        }
      }
    } catch (error) {
      Logger.log(`❌ Error processing ${monthName}: ${error.message}`);
    }

  current.setMonth(month + 1);

  }

  Logger.log(`All summary events created or updated!`);
}

/**
 * Creates and sends a monthly birthday summary email.
 *
 * @param {BirthdayContact[]} contacts An array of BirthdayContact objects.
 * @param {number} month The numeric month (0-indexed) for the summary.
 * @param {number} year The year for the summary.
 */
function createMonthlyBirthdaySummaryMail(contacts, month, year = new Date().getFullYear()) {
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

  // Check if there are any birthdays in the specified month
  if (monthContacts.length === 0) {
    Logger.log('No birthdays found for this month.');
    return;
  }

  const numBirthdays = monthContacts.length;
  const recipientName = getCurrentUserFirstName();

  const subject = '🎂 Geburtstags Reminder 🎂';
  const senderName = DriveApp.getFileById(ScriptApp.getScriptId()).getName();
  const toEmail = Session.getActiveUser().getEmail();
  const fromEmail = Session.getActiveUser().getEmail();

  // Build the email body with formatted birthdates
  let mailBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h3>🎉 Geburtstage im ${monthNamesLong[month]} 🎉</h3>
      <p>Hallo${recipientName ? ` ${recipientName},` : ','}</p>
      <p>Mach dich bereit zum Feiern! Hier sind die Geburtstage deiner Kontakte im ${monthNamesLong[month]} ${year}. Vergiss nicht, ihnen zu gratulieren!</p>
      <p>Insgesamt gibt es ${numBirthdays} Geburtstag${numBirthdays > 1 ? 'e' : ''} in diesem Monat:</p>
      <ul style="list-style-type: none; padding: 0;">
        ${monthContacts.map(contact => `<li>${contact.getBirthdaySummaryMailString()}</li>`).join('')}
      </ul><br>
      <hr style="border:0; height:1px; background:#ccc;">
      <p style="text-align: center; margin-top: 2em;">
        <a href="https://calendar.google.com/calendar/r" style="color: #007BFF;">Google Kalender anzeigen</a><br>
        <a href="https://github.com/itsFelixH/birthday-calendar-sync" style="color: #007BFF;">Git-Repo</a>
      </p>
    </div>
  `;

  sendMail(toEmail, fromEmail, senderName, subject, '', mailBody)
  Logger.log(`Email sent successfully!`);
}


/**
 * Sends birthday emails for the specified number of days.
 *
 * @param {BirthdayContact[]} contacts An array of BirthdayContact objects.
 * @param {date} date The date to look for birthdays. Defaults to today.
 * @param {number} previewDays The number of days for which to send emails. Defaults to 5.
 */
function createDailyBirthdayMail(contacts, date = new Date(), previewDays = 5) {
  if (contacts.length === 0) {
    Logger.log("No contacts found. Aborting.");
    return;
  }

  const startDate = new Date(date);
  startDate.setDate(date.getDate() + 1);
  const endDate = new Date(date);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  endDate.setTime(date.getTime() + (previewDays * millisecondsPerDay));
  const day = date.getDate();
  const month = date.getMonth();

  Logger.log(`Creating daily mail`);

  // Filter contacts with birthdays in the specified time
  const todaysContacts = getContactsByBirthday(contacts, day, month)
  const nextDaysContacts = getContactsByBirthdayBetweenDates(contacts, startDate, endDate)

  // Check if there are any birthdays in the specified timespan
  if (todaysContacts.length === 0) {
    Logger.log('No birthdays found for today.');
    return;
  }

  Logger.log(todaysContacts);
  Logger.log(nextDaysContacts);

  const recipientName = getCurrentUserFirstName();

  const subject = '🎂 Heutige Geburtstage 🎂';
  const senderName = DriveApp.getFileById(ScriptApp.getScriptId()).getName();
  const toEmail = Session.getActiveUser().getEmail();
  const fromEmail = Session.getActiveUser().getEmail();

  // Build the email body with formatted birthdates
  let mailBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h3>🎉 Geburtstage am ${day}. ${monthNamesLong[month]} 🎉</h3>
      <p>Hallo${recipientName ? ` ${recipientName},` : ','}</p>
      <p>Hier sind die heutigen Geburtstage deiner Kontakte:</p>
      ${todaysContacts.map(contact => contact.getMainBirthdayMailString()).join('<br>')}
      <br><br>
      ${nextDaysContacts.length > 0
      ? `<p>In den nächsten Tagen ${nextDaysContacts.length > 1 ? `haben ${nextDaysContacts.length}` : `hat einer`} deiner Kontakte Geburtstag:</p>
            <ul style="list-style-type: none; padding: 0;">
              ${nextDaysContacts.map(contact => `<li>${contact.getNextBirthdayMailString()}</li>`).join('')}
            </ul><br><br>`
      : ''}
      <hr style="border:0; height:1px; background:#ccc;">
      <p style="text-align: center; margin-top: 2em;">
        <a href="https://calendar.google.com/calendar/r" style="color: #007BFF;">Google Kalender anzeigen</a><br>
        <a href="https://github.com/itsFelixH/birthday-calendar-sync" style="color: #007BFF;">Git-Repo</a>
      </p>
    </div>
  `;

  sendMail(toEmail, fromEmail, senderName, subject, '', mailBody)
  Logger.log(`Email sent successfully!`);
}

/**
 * Creates or updates individual birthday events in the calendar for an upcoming time span.
 *
 * @param {string} calendarId The ID of the calendar
 * @param {BirthdayContact[]} contacts An array of BirthdayContact objects
 * @param {number} [monthsAhead=12] Number of months to look ahead for birthdays
 * @param {number} [reminderMinutes=1440] Minutes before event for reminder (default: 1 day)
 * @param {string} [reminderMethod='popup'] Reminder method (popup/email)
 */
function createOrUpdateIndividualBirthdays(calendarId, contacts, monthsAhead = 12, reminderMinutes = 1440, reminderMethod = 'popup') {
  if (contacts.length === 0) {
    Logger.log("No contacts found. Aborting");
    return;
  }

  const calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) throw new Error("Calendar not found");

  const today = new Date();
  const startDate = new Date(today);
  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + monthsAhead);

  const stats = {
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  };

  Logger.log(`Creating/Updating birthday events between for the next ${monthsAhead} months`);

  contacts.forEach((contact, index) => {
    try {
      stats.processed++;
      const nextBirthday = contact.getNextBirthdayInRange(startDate, endDate);

      if (!nextBirthday) {
        stats.skipped++;
        Logger.log(`Skipped: ${contact.name} - No birthday in range`);
        return;
      }

      const eventDate = new Date(nextBirthday);
      eventDate.setHours(0, 0, 0, 0);
      const eventEnd = new Date(eventDate);
      eventEnd.setDate(eventEnd.getDate() + 1);

      const title = `🎂 ${contact.name} hat Geburtstag`;
      const existingEvents = calendar.getEvents(eventDate, eventEnd);
      const existingEvent = existingEvents.find(e => e.getTitle() === title);

      const description = contact.getBirthdayEventString();

      if (!existingEvent) {
        calendar.createAllDayEvent(title, eventDate, {
          description: description,
          reminders: {
            useDefaults: false,
            minutes: reminderInMinutes,
            method: reminderMethod,
          },
        });
        stats.created++;
        Logger.log(`Created: '${title}' for ${contact.name}`);
      } else {
        let needsUpdate = false;
        if (existingEvent.getDescription() !== description) {
          existingEvent.setDescription(description);
          needsUpdate = true;
        }
        if (reminderMethod === 'popup' || reminderMethod === 'email') {
          const currentPopup = existingEvent.getPopupReminders();
          const currentEmail = existingEvent.getEmailReminders();

          const isPopupCorrect = reminderMethod === 'popup' &&
            currentPopup[0] === reminderMinutes &&
            currentEmail.length === 0;

          const isEmailCorrect = reminderMethod === 'email' &&
            currentEmail[0] === reminderMinutes &&
            currentPopup.length === 0;

          if (!isPopupCorrect && !isEmailCorrect) {
            existingEvent.setPopupReminders([]);
            existingEvent.setEmailReminders([]);

            if (reminderMethod === 'popup') {
              existingEvent.setPopupReminders([reminderMinutes]);
            } else {
              existingEvent.setEmailReminders([reminderMinutes]);
            }
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          stats.updated++;
          Logger.log(`Updated: '${title}' for ${contact.name}`);
        }
        else {
          stats.skipped++;
          Logger.log(`Already existed: '${title}' for ${contact.name}`);
        }
      }

      // Add delay every 20 operations to avoid rate limits
      if (index % 20 === 0) Utilities.sleep(500);

    } catch (error) {
      stats.errors++;
      Logger.log(`Failed to process ${contact.name}: ${error.message}`);
    }
  });

  Logger.log([
    `Operation complete.`,
    `Processed: ${stats.processed}`,
    `Created: ${stats.created}`,
    `Updated: ${stats.updated}`,
    `Skipped: ${stats.skipped}`,
    `Errors: ${stats.errors}`
  ].join('\n'));
}

/**
 * Extracts an Instagram username from the given notes.
 *
 * @param {string} notes The notes containing the Instagram username.
 * @returns {string} The Instagram link, or an empty string if no Instagram link is found.
 */
function extractInstagramNameFromNotes(notes) {
  const instagramPrefixes = ["Instagram: ", "@"];

  const instagramNote = notes.split('. ').find(note => {
    return instagramPrefixes.some(prefix => note.startsWith(prefix));
  });

  if (instagramNote) {
    const prefix = instagramPrefixes.find(prefix => instagramNote.startsWith(prefix));
    let username = instagramNote.substring(prefix.length).trim();
    if (!username.startsWith('@')) {
      username = '@' + username;
    }
    return username;
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

function sendMail(toEmail, fromEmail, senderName, subject, textBody, htmlBody) {
  const boundary = "boundaryboundary";
  const mailData = [
    `MIME-Version: 1.0`,
    `To: ${toEmail}`,
    `From: "${senderName}" <${fromEmail}>`,
    `Subject: =?UTF-8?B?${Utilities.base64Encode(subject, Utilities.Charset.UTF_8)}?=`,
    `Content-Type: multipart/alternative; boundary=${boundary}`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    textBody,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Utilities.base64Encode(htmlBody, Utilities.Charset.UTF_8),
    ``,
    `--${boundary}--`,
  ].join("\r\n");

  rawMessage = Utilities.base64EncodeWebSafe(mailData);
  Gmail.Users.Messages.send({ raw: rawMessage }, "me");
}


/**
 * Gets the current user's first name.
 */
function getCurrentUserFirstName() {
  try {
    const peopleResponse = People.People.getBatchGet({
      resourceNames: ['people/me'],
      personFields: 'names'
    });

    // Check if response exists and extract the first name
    if (peopleResponse && peopleResponse.responses && peopleResponse.responses.length > 0) {
      const person = peopleResponse.responses[0].person;
      if (person && person.names && person.names.length > 0) {
        const firstName = person.names[0].givenName;
        return firstName;
      } else {
        Logger.log("User names not available.");
      }
    } else {
      Logger.log("No valid response received.");
    }
  } catch (err) {
    Logger.log('Failed to get own profile with an error: ' + err.message);
  }
}
