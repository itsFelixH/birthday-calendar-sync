/**
 * Logs the configuration from config.js.
 */
function logConfiguration() {
  Logger.log("Configuration from config.js:");

  // Log each configuration variable.
  let calendar = CalendarApp.getCalendarById(calendarId);
  if (calendar) {
    Logger.log("Calendar Name: " + calendar.getName());
  } else {
    Logger.log("Calendar with ID " + calendarId + " not found.");
  }
  Logger.log("useLabel: " + useLabel);

  if (typeof labelFilter !== 'undefined') {
    Logger.log("labelFilter: " + labelFilter.join(", "));
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
 * @param {string[]} [labelFilter=[]] Array of label names to filter
 * @param {number} [maxRetries=3] Max API retry attempts
 * @returns {BirthdayContact[]} Array of BirthdayContact objects
 */
function fetchContactsWithBirthdays(labelFilter = [], maxRetries = 3) {
  try {
    validateLabelFilter(labelFilter);
    const peopleService = People.People;
    var labelManager = new LabelManager();
    let contacts = [];
    let pageToken = null;
    let attempt = 0;

    if (!useLabel || labelFilter == [] || labelFilter == [''] || labelFilter.length < 1) {
      Logger.log(`🔍 Fetching all contacts from Google Contacts...`);
    } else {
      Logger.log(`🔍 Fetching all contacts with any label(s) from '${labelFilter}' from Google Contacts...`);
    }

    do {
      attempt++;
      try {
        const response = peopleService.Connections.list('people/me', {
          pageSize: 100,
          personFields: 'names,birthdays,memberships,emailAddresses,phoneNumbers,addresses,biographies',
          pageToken: pageToken
        });

        const connections = response.connections || [];
        connections.forEach(person => {
          const birthdayData = person.birthdays?.[0]?.date;
          const contactLabels = getContactLabels(person, labelManager)
          const labelMatch = contactMatchesLabelFilter(labelFilter, contactLabels)

          if ((!useLabel || labelMatch) && birthdayData) {
            const contact = createBirthdayContact(person, birthdayData, contactLabels);
            contacts.push(contact);
          }
        });

        pageToken = response.nextPageToken;
        attempt = 0; // Reset retry counter on success
      } catch (error) {
        handleApiError(error, attempt, maxRetries);
      }
    } while (pageToken && attempt <= maxRetries);

    // Sort contacts based on their birthday
    const sortedContacts = sortContactsByBirthdate(contacts);

    Logger.log(`📇 Fetched ${sortedContacts.length} contacts with birthdays!`);
    return sortedContacts;
  } catch (error) {
    Logger.log(`💥 Critical error fetching contacts: ${error.message}`);
  }
}

/**
 * Handles API errors with retry logic
 * @param {Error} error - Original error object
 * @param {number} attempt - Current attempt number
 * @param {number} maxRetries - Maximum allowed retries
 * @throws {Error} If retries exhausted
 */
function handleApiError(error, attempt, maxRetries) {
  const retryDelay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;

  Logger.log(`❌ API Error (attempt ${attempt}/${maxRetries}): ${error.message}`);
  Logger.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);

  if (attempt >= maxRetries) {
    Logger.log("💥 Maximum retries exceeded");
    throw error;
  }

  Utilities.sleep(retryDelay);
}

/**
 * Checks if there were any changes made to the calendar
 * @param {Object} changes Object containing changes made to calendar
 * @returns {boolean} True if there were any changes
 */
function hasChanges(changes) {
  return changes.individual.created.length > 0 ||
    changes.individual.updated.length > 0 ||
    changes.summary.created.length > 0 ||
    changes.summary.updated.length > 0;
}

/**
 * Creates BirthdayContact object from API response
 */
function createBirthdayContact(person, birthdayData, labelNames) {
  try {
    const year = birthdayData.year || new Date().getFullYear();
    const birthday = new Date(year, birthdayData.month - 1, birthdayData.day);

    return new BirthdayContact(
      person.names?.[0]?.displayName || 'Unnamed Contact',
      birthday,
      labelNames,
      person.emailAddresses?.[0]?.value,
      (person.addresses || []).map(address => address.city).filter(Boolean).join(', '),
      person.phoneNumbers?.[0]?.value || '',
      extractInstagramNamesFromNotes((person.biographies || []).map(bio => bio.value).join('. '))
    );
  } catch (error) {
    Logger.log(`⚠️ Error creating contact: ${error.message}`);
    return null;
  }
}

/**
 * Retrieves all contact labels for a person
 * @param {Object} person - People API response object
 * @param {LabelManager} labelManager - Label management instance
 * @returns {string[]} Array of label names
 */
function getContactLabels(person, labelManager) {
  try {
    const memberships = person.memberships || [];
    const labelIds = memberships
      .filter(m => m.contactGroupMembership)
      .map(m => m.contactGroupMembership.contactGroupId);
    const labelNames = labelManager.getLabelNamesByIds(labelIds);

    if (!Array.isArray(labelNames)) {
      // ⚠️ Invalid labels format for person.resourceName
      return [];
    }

    return labelNames;
  } catch (error) {
    Logger.log(`❌ Error getting labels: ${error.message}`);
    return [];
  }
}

/**
 * Determines if contact matches label filter criteria
 * @param {string[]} labelFilter - Configured label filter
 * @param {string[]} contactLabels - Contact's assigned labels
 * @returns {boolean} Match result
 */
function contactMatchesLabelFilter(labelFilter, contactLabels) {
  try {
    if (!useLabel) {
      // ⏩ Label filtering disabled in config
      return true;
    }

    if (labelFilter.length === 0) {
      // ⚠️ Label filter empty but label usage enabled
      return true;
    }

    // Check for matches
    const hasMatch = contactLabels.some(label =>
      labelFilter.includes(label.trim())
    );

    return hasMatch;
  } catch (error) {
    Logger.log(`❌ Label matching failed: ${error.message}`);
    return false;
  }
}

/**
 * Creates or updates monthly birthday summary events in the calendar for a configurable period.
 * 
 * @param {string} calendarId The ID of the calendar
 * @param {BirthdayContact[]} contacts  Array of BirthdayContact objects
 * @param {number} [monthsAhead=12] Number of months to look ahead from current month
 * @param {number} [reminderInMinutes=5760] Reminder minutes (default: 4 days)
 * @param {string} [reminderMethod='popup'] Reminder method (popup/email)
 * @returns {Object} Object containing arrays of created and updated events
 */
function createOrUpdateMonthlyBirthdaySummaries(calendarId, contacts, monthsAhead = 12, reminderInMinutes = 5760, reminderMethod = 'popup') {
  if (contacts.length === 0) {
    Logger.log("🚫 No contacts found. Aborting monthly summaries.");
    return { created: [], updated: [] };
  }

  const calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) throw new Error("Calendar not found");

  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + monthsAhead);

  const stats = {
    processed: 0,
    created: [],
    updated: [],
    skipped: 0,
    errors: 0
  };

  Logger.log(`📅 Creating/updating birthday summaries for ${monthsAhead} months...`);

  let current = new Date(startDate);
  while (current <= endDate) {
    const year = current.getFullYear();
    const month = current.getMonth();
    const monthEventStart = new Date(year, month, 1);
    const monthEventEnd = new Date(year, month, 2);
    const monthName = Utilities.formatDate(monthEventStart, Session.getScriptTimeZone(), "MMMM");

    try {
      stats.processed++;
      Logger.log(`Processing month ${monthName} ${year}`);

      const monthContacts = contacts
        .filter(contact => contact.birthday.getMonth() === month)
        .sort((a, b) => a.birthday.getDate() - b.birthday.getDate());

      if (monthContacts.length === 0) {
        stats.skipped++;
        Logger.log(`⏩ Skipping ${monthName} - no birthdays`);
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
        stats.created.push(`${monthName} ${year}`);
        Logger.log(`✅ Created ${monthName} ${year} summary event`);
      } else {
        if (existingEvent.getDescription() !== description) {
          existingEvent.setDescription(description);
          stats.updated.push(`${monthName} ${year}`);
          Logger.log(`🔄 Updated ${monthName} ${year} summary event`);
        } else {
          stats.skipped++;
          Logger.log(`⏩ ${monthName} ${year} summary event unchanged`);
        }
      }
    } catch (error) {
      stats.errors++;
      Logger.log(`❌ Error processing ${monthName}: ${error.message}`);
    }
    current.setMonth(month + 1);
  }

  Logger.log([
    `All summary events created or updated!`,
    `Processed: ${stats.processed}`,
    `Created: ${stats.created.length}`,
    `Updated: ${stats.updated.length}`,
    `Skipped: ${stats.skipped}`,
    `Errors: ${stats.errors}`
  ].join('\n'));

  return {
    created: stats.created,
    updated: stats.updated
  };
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
    .sort((a, b) => a.birthday.getDate() - b.birthday.getDate() || a.name.localeCompare(b.name));
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
      <h3>🎉 Geburtstage im ${monthNamesLong[month]}</h3>
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
  Logger.log(`Birthday summary email sent successfully!`);
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
  const todaysContacts = getContactsByBirthday(contacts, day, month);
  const nextDaysContacts = getContactsByBirthdayBetweenDates(contacts, startDate, endDate);

  // Check if there are any birthdays in the specified timespan
  if (todaysContacts.length === 0) {
    Logger.log('No birthdays found for today.');
    return;
  }

  const recipientName = getCurrentUserFirstName();
  const subject = '🎁 Heutige Geburtstage 🎁';
  const senderName = DriveApp.getFileById(ScriptApp.getScriptId()).getName();
  const toEmail = Session.getActiveUser().getEmail();
  const fromEmail = Session.getActiveUser().getEmail();

  // Build the email content
  const content = `
    ${EmailTemplates.header(
      '🎉 Heutige Geburtstage',
      `${day}. ${monthNamesLong[month]} ${date.getFullYear()}`
    )}
    
    <div class="section">
      <p>Hallo${recipientName ? ` ${recipientName}` : ''},</p>
      <p>heute haben ${todaysContacts.length} deiner Kontakte Geburtstag. 
      Hier sind alle Details, die du brauchst, um zu gratulieren:</p>
    </div>

    <div class="section">
      <h3 class="section-title">🎂 Heute</h3>
      <ul class="birthday-list">
        ${todaysContacts.map(contact => `
          <li class="birthday-item">
            <strong>${contact.name}</strong>
            ${contact.age ? ` - wird heute ${contact.age} Jahre alt!` : ''}
            <div class="contact-info">
              ${contact.email ? `
                <span>📧</span>
                <span>
                  <a href="mailto:${contact.email}"
                    class="button">Glückwunsch-Mail senden</a>
                </span>
              ` : ''}
              ${contact.phone ? `
                <span>📱</span>
                <span><a href="tel:${contact.phone}" class="button">Anrufen</a></span>
              ` : ''}
              ${contact.instagramNames && contact.instagramNames.length > 0 ? `
                <span>📸</span>
                <span>${contact.instagramNames.map(name => 
                  `<a href="https://instagram.com/${name.replace('@', '')}" class="button">${name}</a>`
                ).join(' ')}</span>
              ` : ''}
            </div>
          </li>
        `).join('')}
      </ul>
    </div>

    ${nextDaysContacts.length > 0 ? `
      <div class="section">
        <h3 class="section-title">📅 Kommende Geburtstage</h3>
        <p>In den nächsten ${previewDays} Tagen ${nextDaysContacts.length > 1 ? 
          `haben ${nextDaysContacts.length} deiner Kontakte` : 
          'hat einer deiner Kontakte'} Geburtstag:</p>
        <ul class="birthday-list">
          ${nextDaysContacts.map(contact => `
            <li class="birthday-item">
              <strong>${contact.name}</strong> - 
              ${contact.getBirthdayDateString()}
              <div class="contact-info">
                ${contact.email ? `<span>📧 ${contact.email}</span>` : ''}
                ${contact.phone ? `<span>📱 ${contact.phone}</span>` : ''}
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
    ` : ''}

    <div class="action-buttons">
      <a href="https://calendar.google.com/calendar/r" class="button">Kalender öffnen</a>
      <a href="https://contacts.google.com" class="button">Kontakte verwalten</a>
      <a href="https://github.com/itsFelixH/birthday-calendar-sync" class="button">Git-Repo</a>
    </div>

    ${EmailTemplates.footer()}
  `;

  const mailBody = EmailTemplates.wrapEmail(content);
  sendMail(toEmail, fromEmail, senderName, subject, '', mailBody);
  Logger.log(`Daily reminder email sent successfully!`);
}

/**
 * Sends an email with details about calendar changes
 * @param {Object} changes Object containing changes made to calendar
 */
function sendCalendarUpdateEmail(changes) {
  const recipientName = getCurrentUserFirstName();

  const subject = '📅 Geburtstags Updates 📅';
  const senderName = DriveApp.getFileById(ScriptApp.getScriptId()).getName();
  const toEmail = Session.getActiveUser().getEmail();
  const fromEmail = Session.getActiveUser().getEmail();

  let mailBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h3>🔄 Updates zu Geburtstags-Events</h3>
      <p>Hallo${recipientName ? ` ${recipientName},` : ','}</p>
      <p>die folgenden Geburtstags-Events wurden deinem Kalender hinzugefügt:</p>`;

  if (changes.individual.created.length > 0 || changes.individual.updated.length > 0) {
    mailBody += `<h4>Individuelle Geburtstage:</h4>`;

    if (changes.individual.created.length > 0) {
      mailBody += `<p>✨ Neue Geburtstage:</p><ul>`;
      changes.individual.created.forEach(event => {
        mailBody += `<li>${event}</li>`;
      });
      mailBody += `</ul>`;
    }

    if (changes.individual.updated.length > 0) {
      mailBody += `<p>🔄 Aktualisierte Geburtstage:</p><ul>`;
      changes.individual.updated.forEach(event => {
        mailBody += `<li>${event}</li>`;
      });
      mailBody += `</ul>`;
    }
  }

  if (changes.summary.created.length > 0 || changes.summary.updated.length > 0) {
    mailBody += `<h4>Monatliche Geburtstagsübersichten:</h4>`;

    if (changes.summary.created.length > 0) {
      mailBody += `<p>✨ Neue Monatsübersichten:</p><ul>`;
      changes.summary.created.forEach(event => {
        mailBody += `<li>${event}</li>`;
      });
      mailBody += `</ul>`;
    }

    if (changes.summary.updated.length > 0) {
      mailBody += `<p>🔄 Aktualisierte Monatsübersichten:</p><ul>`;
      changes.summary.updated.forEach(event => {
        mailBody += `<li>${event}</li>`;
      });
      mailBody += `</ul>`;
    }
  }

  mailBody += `
      <hr style="border:0; height:1px; background:#ccc;">
      <p style="text-align: center; margin-top: 2em;">
        <a href="https://calendar.google.com/calendar/r" style="color: #007BFF;">View Calendar</a><br>
        <a href="https://github.com/itsFelixH/birthday-calendar-sync" style="color: #007BFF;">Git-Repo</a>
      </p>
    </div>
  `;

  sendMail(toEmail, fromEmail, senderName, subject, '', mailBody);
  Logger.log('Calendar update email sent successfully!');
}

/**
 * Creates or updates individual birthday events in the calendar for an upcoming time span.
 *
 * @param {string} calendarId The ID of the calendar
 * @param {BirthdayContact[]} contacts An array of BirthdayContact objects
 * @param {number} [monthsAhead=12] Number of months to look ahead for birthdays
 * @param {number} [reminderMinutes=1440] Minutes before event for reminder (default: 1 day)
 * @param {string} [reminderMethod='popup'] Reminder method (popup/email)
 * @returns {Object} Object containing arrays of created and updated events
 */
function createOrUpdateIndividualBirthdays(calendarId, contacts, monthsAhead = 12, reminderMinutes = 1440, reminderMethod = 'popup') {
  if (contacts.length === 0) {
    Logger.log("No contacts found. Aborting");
    return { created: [], updated: [] };
  }

  const calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) throw new Error("Calendar not found");

  const today = new Date();
  const startDate = new Date(today);
  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + monthsAhead);

  const stats = {
    processed: 0,
    created: [],
    updated: [],
    skipped: 0,
    errors: 0
  };

  Logger.log(`📅 Creating/Updating birthday events for the next ${monthsAhead} months`);

  contacts.forEach((contact, index) => {
    try {
      stats.processed++;
      const nextBirthday = contact.getNextBirthdayInRange(startDate, endDate);

      if (!nextBirthday) {
        stats.skipped++;
        Logger.log(`⏩ ${contact.name} skipped: No birthday in range`);
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
            minutes: reminderMinutes,
            method: reminderMethod,
          },
        });
        stats.created.push(`${contact.name} (${Utilities.formatDate(eventDate, Session.getScriptTimeZone(), "dd.MM.yyyy")})`);
        Logger.log(`✅ Created ${contact.name} birthday event`);
      } else {
        if (existingEvent.getDescription() !== description) {
          stats.updated.push(`${contact.name} (${Utilities.formatDate(eventDate, Session.getScriptTimeZone(), "dd.MM.yyyy")})`);
          existingEvent.setDescription(description);
          Logger.log(`🔄 Updated ${contact.name} birthday event`);
        }
        else {
          stats.skipped++;
          Logger.log(`⏩ ${contact.name} birthday event unchanged`);
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
    `All birthday events created or updated!`,
    `Processed: ${stats.processed}`,
    `Created: ${stats.created.length}`,
    `Updated: ${stats.updated.length}`,
    `Skipped: ${stats.skipped}`,
    `Errors: ${stats.errors}`
  ].join('\n'));

  return {
    created: stats.created,
    updated: stats.updated
  };
}

/**
 * Validates label filter configuration
 * @param {Array} labelFilter - Labels to validate
 * @throws {Error} If invalid label format
 */
function validateLabelFilter(labelFilter) {
  if (!Array.isArray(labelFilter)) {
    throw new Error('🔴 Label filter must be an array');
  }

  if (labelFilter.some(label => typeof label !== 'string')) {
    throw new Error('🔴 All labels must be strings');
  }
}

/**
 * Extracts Instagram usernames from the given notes.
 * Supports multiple usernames in different notes and comma-separated lists.
 *
 * @param {string} notes The notes containing Instagram usernames.
 * @returns {string[]} Array of Instagram usernames (with @ prefix), or empty array if none found.
 */
function extractInstagramNamesFromNotes(notes) {
  // Handle empty/undefined notes
  if (!notes) return [];

  const instagramPrefix = "@";
  const instagramNames = [];

  // Split notes into individual entries
  const noteEntries = notes.split('. ');

  // Process each note entry
  noteEntries.forEach(note => {
    // Extract usernames - could be comma-separated
    const usernamePart = note.substring(instagramPrefix.length).trim();
    const usernames = usernamePart.split(',').map(username => {
      username = username.trim();
      return username.startsWith('@') ? username : '@' + username;
    });
    instagramNames.push(...usernames);
    // Find all matches after prefix
    const matches = note.match(new RegExp(`(?:${instagramPrefix}|,\\s*)([^,\\s]+)`, 'g'));
    if (matches) {
      const usernames = matches.map(match => {
        // Clean up the username
        const cleaned_name = match.replace(/^,\s*/, '').trim();
        return cleaned_name.startsWith('@') ? cleaned_name : '@' + cleaned_name;
      });
      instagramNames.push(...usernames);
    }
  });

  return instagramNames;
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

/**
 * Shared email components and styles
 */
const EmailTemplates = {
  styles: `
    .email-container {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .title {
      color: #1a1a1a;
      font-size: 24px;
      font-weight: bold;
      margin: 10px 0;
    }
    .subtitle {
      color: #666;
      font-size: 16px;
      margin: 10px 0;
    }
    .section {
      margin: 20px 0;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 6px;
    }
    .section-title {
      color: #2c3e50;
      font-size: 18px;
      margin-bottom: 15px;
      border-bottom: 2px solid #e9ecef;
      padding-bottom: 5px;
    }
    .birthday-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .birthday-item {
      padding: 10px;
      margin: 5px 0;
      border-left: 4px solid #007bff;
      background: white;
      transition: all 0.2s;
    }
    .birthday-item:hover {
      transform: translateX(5px);
    }
    .contact-info {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 10px;
      align-items: center;
      margin-top: 5px;
      font-size: 14px;
      color: #666;
    }
    .action-buttons {
      margin-top: 15px;
      text-align: center;
    }
    .button {
      display: inline-block;
      padding: 8px 16px;
      margin: 0 5px;
      background-color: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-size: 14px;
      transition: background-color 0.2s;
    }
    .button:hover {
      background-color: #0056b3;
    }
    .stats {
      display: flex;
      justify-content: space-around;
      margin: 20px 0;
      text-align: center;
    }
    .stat-item {
      flex: 1;
      padding: 10px;
    }
    .stat-number {
      font-size: 24px;
      font-weight: bold;
      color: #007bff;
    }
    .stat-label {
      font-size: 14px;
      color: #666;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eaeaea;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .footer a {
      color: #007bff;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
  `,

  header: (title, subtitle = '') => `
    <div class="header">
      <h1 class="title">${title}</h1>
      ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ''}
    </div>
  `,

  footer: () => `
    <div class="footer">
      <p>
        Sent by Birthday Calendar Sync •
        <a href="https://calendar.google.com/calendar/r">View Calendar</a> •
        <a href="https://contacts.google.com">Manage Contacts</a> •
        <a href="https://github.com/itsFelixH/birthday-calendar-sync">GitHub Repo</a>
      </p>
    </div>
  `,

  wrapEmail: (content) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>${EmailTemplates.styles}</style>
    </head>
    <body>
      <div class="email-container">
        ${content}
      </div>
    </body>
    </html>
  `
};

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
