/**
 * Creates or updates monthly birthday summary events in the calendar.
 *
 * @param {string} calendarId The ID of the calendar
 * @param {BirthdayContact[]} contacts Array of BirthdayContact objects
 * @param {number} [monthsAhead=12] Number of months to look ahead
 * @param {number} [reminderInMinutes=5760] Reminder minutes (default: 4 days)
 * @param {string} [reminderMethod='popup'] Reminder method (popup/email)
 * @returns {{created: string[], updated: string[]}} Created and updated event names
 */
function createOrUpdateMonthlyBirthdaySummaries(calendarId, contacts, monthsAhead = 12, reminderInMinutes = 5760, reminderMethod = 'popup') {
  if (contacts.length === 0) {
    Logger.log("🚫 No contacts found. Aborting monthly summaries.");
    return { created: [], updated: [] };
  }

  const isDryRun = typeof dryRun !== 'undefined' && dryRun;
  if (isDryRun) Logger.log('🧪 DRY RUN MODE — no changes will be made');

  const calendarManager = isDryRun ? null : new CalendarManager({ calendarId: calendarId });
  const { start: startDate, end: endDate } = getMonthlyDateRange(monthsAhead);

  const stats = { processed: 0, created: [], updated: [], skipped: 0, errors: 0 };

  Logger.log(`📅 Creating/updating birthday summaries for ${monthsAhead} months...`);

  let current = new Date(startDate);
  while (current <= endDate) {
    const year = current.getFullYear();
    const month = current.getMonth();
    const monthEventStart = new Date(year, month, 1);
    const monthEventEnd = new Date(year, month, 2);
    const monthName = isDryRun
      ? monthNamesLong[month]
      : calendarManager.formatDate(monthEventStart, 'MMMM');

    try {
      stats.processed++;

      // Filter deceased contacts based on config
      const handling = typeof deceasedHandling !== 'undefined' ? deceasedHandling : 'skip';
      const monthContacts = contacts
        .filter(contact => {
          if (contact.birthday.getMonth() !== month) return false;
          if (contact.isDeceased() && handling === 'skip') return false;
          return true;
        })
        .sort((a, b) => a.birthday.getDate() - b.birthday.getDate());

      if (monthContacts.length === 0) {
        stats.skipped++;
        current.setMonth(month + 1);
        continue;
      }

      const summaryTag = `${eventTag}:summary:${year}-${('0' + (month + 1)).slice(-2)}`;
      const titles = typeof eventTitles !== 'undefined' ? eventTitles : {};
      const title = titles.summary || '🎉🎂 GEBURTSTAGE 🎂🎉';
      const description = `Geburtstage im ${monthNamesLong[month]}\n\n` +
        monthContacts.map(contact => {
          if (contact.isDeceased() && handling === 'memorial') {
            const base = `${contact.getBirthdayLongMonthFormat()}: 🕯️ ${contact.name}`;
            const birthYear = contact.hasKnownBirthYear() ? `*${contact.birthday.getFullYear()}` : '';
            const deathYear = contact.deathDate ? `†${contact.deathDate.getFullYear()}` : '';
            const lifespan = [birthYear, deathYear].filter(Boolean).join(' ');
            return lifespan ? `${base} (${lifespan})` : base;
          }
          return contact.getBirthdaySummaryEventString();
        }).join('\n') +
        `\n\n${summaryTag}`;

      if (isDryRun) {
        stats.created.push(`${monthName} ${year}`);
        Logger.log(`🧪 [DRY RUN] Would create/update ${monthName} ${year} summary event`);
        current.setMonth(month + 1);
        continue;
      }

      const events = calendarManager.getEventsInRange(monthEventStart, monthEventEnd);
      // Match by tag in description (prevents duplicates if title format changes)
      const existingEvent = events.find(e =>
        e.getDescription() && e.getDescription().includes(summaryTag)
      ) || events.find(e => e.getTitle() === title);

      if (!existingEvent) {
        calendarManager.createAllDayEvent({
          title: title,
          date: monthEventStart,
          description: description,
          reminders: [{ type: reminderMethod, minutes: reminderInMinutes }]
        });
        stats.created.push(`${monthName} ${year}`);
        Logger.log(`✅ Created ${monthName} ${year} summary event`);
      } else {
        if (existingEvent.getDescription() !== description) {
          existingEvent.setDescription(description);
          existingEvent.setTitle(title);
          stats.updated.push(`${monthName} ${year}`);
          Logger.log(`🔄 Updated ${monthName} ${year} summary event`);
        } else {
          stats.skipped++;
        }
      }
    } catch (error) {
      stats.errors++;
      Logger.log(`❌ Error processing ${monthName}: ${error.message}`);
    }
    current.setMonth(month + 1);
  }

  logSyncStats('summary', stats);
  return { created: stats.created, updated: stats.updated };
}


/**
 * Creates or updates individual birthday events in the calendar.
 *
 * @param {string} calendarId The ID of the calendar
 * @param {BirthdayContact[]} contacts Array of BirthdayContact objects
 * @param {number} [monthsAhead=12] Number of months to look ahead
 * @param {number} [reminderMinutes=1440] Minutes before event for reminder (default: 1 day)
 * @param {string} [reminderMethod='popup'] Reminder method (popup/email)
 * @returns {{created: string[], updated: string[]}} Created and updated event names
 */
function createOrUpdateIndividualBirthdays(calendarId, contacts, monthsAhead = 12, reminderMinutes = 1440, reminderMethod = 'popup') {
  if (contacts.length === 0) {
    Logger.log("🚫 No contacts found. Aborting individual birthdays.");
    return { created: [], updated: [] };
  }

  const isDryRun = typeof dryRun !== 'undefined' && dryRun;
  if (isDryRun) Logger.log('🧪 DRY RUN MODE — no changes will be made');

  const useRecurrence = typeof eventRecurrence !== 'undefined' && eventRecurrence === 'recurring';
  const calendarManager = isDryRun ? null : new CalendarManager({ calendarId: calendarId });
  const { start: startDate, end: endDate } = isDryRun
    ? getMonthlyDateRange(monthsAhead)
    : calendarManager.getDateRange(monthsAhead);

  const stats = { processed: 0, created: [], updated: [], skipped: 0, errors: 0 };

  Logger.log(`📅 Creating/updating birthday events for the next ${monthsAhead} months (mode: ${useRecurrence ? 'recurring' : 'single'})`);

  contacts.forEach((contact, index) => {
    try {
      stats.processed++;

      // Handle deceased contacts
      const handling = typeof deceasedHandling !== 'undefined' ? deceasedHandling : 'skip';
      if (contact.isDeceased()) {
        if (handling === 'skip') {
          stats.skipped++;
          return;
        }
        // 'memorial' and 'normal' continue below
      }

      const nextBirthday = contact.getNextBirthdayInRange(startDate, endDate);

      if (!nextBirthday) {
        stats.skipped++;
        return;
      }

      const eventDate = new Date(nextBirthday);
      eventDate.setHours(0, 0, 0, 0);
      const eventEnd = new Date(eventDate);
      eventEnd.setDate(eventEnd.getDate() + 1);

      // Unique tag per contact based on birthday (stable even if name changes)
      const contactTag = `${eventTag}:${contact.birthday.getMonth() + 1}-${contact.birthday.getDate()}:${contact.name.replace(/[^a-zA-ZäöüÄÖÜß ]/g, '').trim()}`;

      // Determine title and description based on deceased/milestone status
      const isMemorial = contact.isDeceased() && handling === 'memorial';
      const eventYear = eventDate.getFullYear();
      const isMilestone = !isMemorial && typeof highlightMilestones !== 'undefined' && highlightMilestones && contact.isMilestoneBirthday(eventYear);

      // For recurring events, don't include age in description (it changes yearly)
      // For single events, include the specific age for that year
      const ageInYear = contact.hasKnownBirthYear() ? contact.getAgeInYear(eventYear) : undefined;

      // Get configurable title templates
      const titles = typeof eventTitles !== 'undefined' ? eventTitles : {};

      let title;
      let description;
      if (isMemorial) {
        const birthYear = contact.hasKnownBirthYear() ? contact.birthday.getFullYear() : '?';
        const deathYear = contact.deathDate ? contact.deathDate.getFullYear() : '';
        const lifespan = deathYear ? `*${birthYear} †${deathYear}` : `*${birthYear}`;
        const template = titles.memorial || '🕯️ {name} ({lifespan})';
        title = template.replace('{name}', contact.name).replace('{lifespan}', lifespan);
        description = contact.getMemorialEventString() + `\n${contactTag}`;
      } else if (useRecurrence) {
        // Recurring events: static title/description without year-specific age
        const template = titles.recurring || '🎂 {name} hat Geburtstag';
        title = template.replace('{name}', contact.name).replace('{birthdate}', contact.getBirthdayLongFormat());
        description = contact.getBirthdayEventString(null) + `\n${contactTag}`;
      } else if (isMilestone) {
        const template = titles.milestone || '🎂🎉 {name} wird {age}! 🎉';
        title = template.replace('{name}', contact.name).replace('{age}', ageInYear);
        description = contact.getBirthdayEventString(ageInYear) + `\n${contactTag}`;
      } else {
        const template = titles.birthday || '🎂 {name} hat Geburtstag';
        title = template.replace('{name}', contact.name).replace('{age}', ageInYear);
        description = contact.getBirthdayEventString(ageInYear) + `\n${contactTag}`;
      }

      if (isDryRun) {
        const suffix = isMemorial ? ' 🕯️ MEMORIAL' : (isMilestone ? ' 🎉 MILESTONE' : '');
        const recurrenceInfo = useRecurrence ? ' [🔁 recurring]' : '';
        stats.created.push(`${contact.name} (${eventDate.toLocaleDateString()})${suffix}`);
        Logger.log(`🧪 [DRY RUN] Would create/update event: ${title} on ${eventDate.toLocaleDateString()}${recurrenceInfo}`);
        return;
      }

      // For recurring events with leap year birthdays, skip recurrence (use single instead)
      // Google Calendar skips recurring events on Feb 29 in non-leap years
      const shouldRecur = useRecurrence && !isMemorial && !contact.isLeapYearBirthday();

      const existingEvents = calendarManager.getEventsInRange(eventDate, eventEnd);
      // Match by tag first (handles name changes), fall back to title match
      const existingEvent = existingEvents.find(e =>
        e.getDescription() && e.getDescription().includes(contactTag)
      ) || existingEvents.find(e => e.getTitle() === title);

      if (!existingEvent) {
        calendarManager.createAllDayEvent({
          title: title,
          date: eventDate,
          description: description,
          reminders: [{ type: reminderMethod, minutes: reminderMinutes }],
          recurrence: shouldRecur
        });
        stats.created.push(`${contact.name} (${calendarManager.formatDate(eventDate)})`);
        Logger.log(`✅ Created ${contact.name} birthday event${shouldRecur ? ' (recurring)' : ''}`);
      } else {
        const currentDescription = existingEvent.getDescription() || '';
        const currentTitle = existingEvent.getTitle() || '';

        const needsUpdate = currentDescription !== description ||
          currentTitle !== title;

        if (needsUpdate) {
          existingEvent.setDescription(description);
          existingEvent.setTitle(title);
          stats.updated.push(`${contact.name} (${calendarManager.formatDate(eventDate)})`);
          Logger.log(`🔄 Updated ${contact.name} birthday event`);
        } else {
          stats.skipped++;
        }
      }

      // Add delay every 20 operations to avoid rate limits
      if (index > 0 && index % 20 === 0) Utilities.sleep(500);

    } catch (error) {
      stats.errors++;
      Logger.log(`❌ Failed to process ${contact.name}: ${error.message}`);
    }
  });

  logSyncStats('individual', stats);
  return { created: stats.created, updated: stats.updated };
}


/**
 * Gets the date range for monthly summary processing (starts at 1st of current month).
 * @param {number} monthsAhead - Number of months to look ahead
 * @returns {{start: Date, end: Date}}
 */
function getMonthlyDateRange(monthsAhead) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(start);
  end.setMonth(end.getMonth() + monthsAhead);
  return { start, end };
}


/**
 * Logs sync operation statistics.
 * @param {string} type - Type of sync ('individual' or 'summary')
 * @param {Object} stats - Stats object with processed, created, updated, skipped, errors
 */
function logSyncStats(type, stats) {
  Logger.log([
    `✅ ${type} sync complete`,
    `   Processed: ${stats.processed}`,
    `   Created: ${stats.created.length}`,
    `   Updated: ${stats.updated.length}`,
    `   Skipped: ${stats.skipped}`,
    `   Errors: ${stats.errors}`
  ].join('\n'));
}
