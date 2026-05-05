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

    if (labelFilter == [] || labelFilter == [''] || labelFilter.length < 1) {
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

          if (labelMatch && birthdayData) {
            const contact = createBirthdayContact(person, birthdayData, contactLabels);
            contacts.push(contact);
          }
        });

        pageToken = response.nextPageToken;
        attempt = 0; // Reset retry counter on success
      } catch (error) {
        handleApiError(error, attempt, maxRetries);
      }
    } while (pageToken || (attempt > 0 && attempt <= maxRetries));

    // Sort contacts based on their birthday
    const sortedContacts = sortContactsByBirthdate(contacts);

    Logger.log(`📇 Fetched ${sortedContacts.length} contacts with birthdays!`);
    return sortedContacts;
  } catch (error) {
    Logger.log(`💥 Critical error fetching contacts: ${error.message}`);
    return [];
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
    if (labelFilter.length === 0) {
      // ⚠️ Label filter empty
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

  const instagramNames = [];

  // Match all @username patterns in the notes
  const atMatches = notes.match(/@[\w.]+/g);
  if (atMatches) {
    atMatches.forEach(match => {
      const username = match.startsWith('@') ? match : '@' + match;
      if (!instagramNames.includes(username)) {
        instagramNames.push(username);
      }
    });
  }

  // Also match "Instagram: username" pattern (without @)
  const instaPattern = /Instagram:\s*([^\s,@][^\s,]*)/gi;
  let match;
  while ((match = instaPattern.exec(notes)) !== null) {
    const username = '@' + match[1].trim();
    if (!instagramNames.includes(username)) {
      instagramNames.push(username);
    }
  }

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
  const currentYear = today.getFullYear();

  if (currentMonth === 11) {
    return new Date(currentYear + 1, 0, 1);
  }
  return new Date(currentYear, currentMonth + 1, 1);
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
