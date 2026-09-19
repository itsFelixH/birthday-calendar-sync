
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
  const eventDay = typeof summaryEventDay !== 'undefined' ? summaryEventDay : 1;
  const texts = typeof eventTexts !== 'undefined' ? eventTexts : {};
  const summaryHeaderTemplate = texts.summaryHeader || 'Geburtstage im {month}';

  const stats = { processed: 0, created: [], updated: [], skipped: 0, errors: 0 };
  const startTime = Date.now();
  const maxExecutionMs = 5 * 60 * 1000;

  Logger.log(`📅 Creating/updating birthday summaries for ${monthsAhead} months...`);

  let current = new Date(startDate);
  while (current <= endDate) {
    if (Date.now() - startTime > maxExecutionMs) {
      Logger.log('⏳ Monthly summary sync reached 5-minute quota threshold. Halting gracefully.');
      break;
    }
    const year = current.getFullYear();
    const month = current.getMonth();
    const monthEventStart = new Date(year, month, eventDay);
    const monthEventEnd = new Date(year, month, eventDay + 1);
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

      const titles = typeof eventTitles !== 'undefined' ? eventTitles : {};
      const title = (titles.summary || '🎉🎂 GEBURTSTAGE 🎂🎉')
        .replace('{month}', monthNamesLong[month])
        .replace('{year}', year)
        .replace('{count}', monthContacts.length);
      const headerLine = summaryHeaderTemplate
        .replace('{month}', monthNamesLong[month])
        .replace('{year}', year)
        .replace('{count}', monthContacts.length);
      const description = `${headerLine}\n\n` +
        monthContacts.map(contact => {
          if (contact.isDeceased() && handling === 'memorial') {
            const base = `${contact.getBirthdayLongMonthFormat()}: 🕯️ ${contact.name}`;
            const birthYear = contact.hasKnownBirthYear() ? `*${contact.birthday.getFullYear()}` : '';
            const deathYear = contact.deathDate ? `†${contact.deathDate.getFullYear()}` : '';
            const lifespan = [birthYear, deathYear].filter(Boolean).join(' ');
            return lifespan ? `${base} (${lifespan})` : base;
          }
          return contact.getBirthdaySummaryEventString(year);
        }).join('\n');

      if (isDryRun) {
        stats.created.push(`${monthName} ${year}`);
        Logger.log(`🧪 [DRY RUN] Would create/update ${monthName} ${year} summary event`);
        current.setMonth(month + 1);
        continue;
      }

      const events = calendarManager.getEventsInRange(monthEventStart, monthEventEnd);
      const existingEvent = events.find(e =>
        e.getTitle() === title || (e.getDescription() && e.getDescription().includes(headerLine))
      );

      if (!existingEvent) {
        calendarManager.createAllDayEvent({
          title: title,
          date: monthEventStart,
          description: description,
          reminders: [{ type: reminderMethod, minutes: reminderInMinutes }]
        });
        // Apply event color if configured
        const colors = typeof eventColors !== 'undefined' ? eventColors : {};
        const summaryColor = colors.summary || '';
        if (summaryColor) {
          const createdEvents = calendarManager.getEventsInRange(monthEventStart, monthEventEnd);
          const newEvent = createdEvents.find(e =>
            e.getTitle() === title || (e.getDescription() && e.getDescription().includes(headerLine))
          );
          if (newEvent && newEvent.setColor) newEvent.setColor(summaryColor);
        }
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
  const batchSize = 20;
  const delayMs = 500;

  const calendarManager = isDryRun ? null : new CalendarManager({ calendarId: calendarId });
  const { start: startDate, end: endDate } = isDryRun
    ? getMonthlyDateRange(monthsAhead)
    : calendarManager.getDateRange(monthsAhead);

  const stats = { processed: 0, created: [], updated: [], skipped: 0, errors: 0 };
  const startTime = Date.now();
  const maxExecutionMs = 5 * 60 * 1000;

  Logger.log(`📅 Creating/updating birthday events for the next ${monthsAhead} months (mode: ${useRecurrence ? 'recurring' : 'single'})`);

  for (let index = 0; index < contacts.length; index++) {
    const contact = contacts[index];
    if (Date.now() - startTime > maxExecutionMs) {
      Logger.log('⏳ Individual birthday sync reached 5-minute quota threshold. Halting gracefully.');
      break;
    }
    try {
      stats.processed++;

      // Handle deceased contacts
      const handling = typeof deceasedHandling !== 'undefined' ? deceasedHandling : 'skip';
      if (contact.isDeceased()) {
        if (handling === 'skip') {
          stats.skipped++;
          continue;
        }
        // 'memorial' and 'normal' continue below
      }

      const nextBirthday = contact.getNextBirthdayInRange(startDate, endDate);

      if (!nextBirthday) {
        stats.skipped++;
        continue;
      }

      const eventDate = new Date(nextBirthday);
      eventDate.setHours(0, 0, 0, 0);
      const eventEnd = new Date(eventDate);
      eventEnd.setDate(eventEnd.getDate() + 1);

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
        title = replaceTitlePlaceholders(template, contact, { lifespan });
        description = contact.getMemorialEventString();
      } else if (useRecurrence) {
        // Recurring events: static title/description without year-specific age
        const template = titles.recurring || '🎂 {name} hat Geburtstag';
        title = replaceTitlePlaceholders(template, contact, {});
        description = contact.getBirthdayEventString(null);
      } else if (isMilestone) {
        const template = titles.milestone || '🎂🎉 {name} wird {age}! 🎉';
        title = replaceTitlePlaceholders(template, contact, { age: ageInYear });
        description = contact.getBirthdayEventString(ageInYear);
      } else {
        const template = titles.birthday || '🎂 {name} hat Geburtstag';
        title = replaceTitlePlaceholders(template, contact, { age: ageInYear });
        description = contact.getBirthdayEventString(ageInYear);
      }

      if (isDryRun) {
        const suffix = isMemorial ? ' 🕯️ MEMORIAL' : (isMilestone ? ' 🎉 MILESTONE' : '');
        const recurrenceInfo = useRecurrence ? ' [🔁 recurring]' : '';
        stats.created.push(`${contact.name} (${eventDate.toLocaleDateString()})${suffix}`);
        Logger.log(`🧪 [DRY RUN] Would create/update event: ${title} on ${eventDate.toLocaleDateString()}${recurrenceInfo}`);
        continue;
      }

      // For recurring events with leap year birthdays, skip recurrence (use single instead)
      // Google Calendar skips recurring events on Feb 29 in non-leap years
      const shouldRecur = useRecurrence && !isMemorial && !contact.isLeapYearBirthday();

      const existingEvents = calendarManager.getEventsInRange(eventDate, eventEnd);
      const existingEvent = existingEvents.find(e =>
        e.getTitle() === title || (contact.name && e.getTitle().includes(contact.name))
      );

      if (!existingEvent) {
        calendarManager.createAllDayEvent({
          title: title,
          date: eventDate,
          description: description,
          reminders: [{ type: reminderMethod, minutes: reminderMinutes }],
          recurrence: shouldRecur
        });
        // Apply event color if configured
        const colors = typeof eventColors !== 'undefined' ? eventColors : {};
        let eventColor = '';
        if (isMemorial) eventColor = colors.memorial || '';
        else if (isMilestone) eventColor = colors.milestone || '';
        else eventColor = colors.birthday || '';
        if (eventColor) {
          const createdEvents = calendarManager.getEventsInRange(eventDate, eventEnd);
          const newEvent = createdEvents.find(e =>
            e.getTitle() === title || (contact.name && e.getTitle().includes(contact.name))
          );
          if (newEvent && newEvent.setColor) newEvent.setColor(eventColor);
        }
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

      // Rate limiting: pause between batches to avoid Google API limits
      if (index > 0 && index % batchSize === 0) Utilities.sleep(delayMs);

    } catch (error) {
      stats.errors++;
      Logger.log(`❌ Failed to process ${contact.name}: ${error.message}`);
    }
  }

  logSyncStats('individual', stats);
  return { created: stats.created, updated: stats.updated };
}


/**
 * Replaces placeholders in a title template with contact data.
 * Available: {name}, {age}, {birthdate}, {city}, {lifespan}
 * @param {string} template - Template string
 * @param {BirthdayContact} contact - Contact object
 * @param {Object} [extra] - Additional values (age, lifespan)
 * @returns {string}
 */
function replaceTitlePlaceholders(template, contact, extra = {}) {
  const zodiac = contact.getZodiacSign ? contact.getZodiacSign() : { symbol: '', name: '', full: '' };
  const targetYear = extra.year !== undefined ? extra.year : (extra.age !== undefined && contact.hasKnownBirthYear() ? contact.birthday.getFullYear() + extra.age : new Date().getFullYear());
  const weekday = contact.getWeekdayName ? contact.getWeekdayName(targetYear) : '';

  return template
    .replace('{name}', contact.name)
    .replace('{birthdate}', contact.hasKnownBirthYear() ? contact.getBirthdayLongFormat() : contact.getBirthdayShortFormat())
    .replace('{city}', contact.city || '')
    .replace('{email}', contact.email || '')
    .replace('{age}', extra.age !== undefined ? extra.age : '')
    .replace('{lifespan}', extra.lifespan || '')
    .replace('{weekday}', weekday)
    .replace('{zodiac}', zodiac.full)
    .replace('{zodiacSymbol}', zodiac.symbol)
    .replace('{zodiacName}', zodiac.name);
}


/**
 * Wraps a string in zero-width characters to hide it visually while keeping it searchable.
 * @param {string} text - The text to hide
 * @returns {string} The text wrapped in zero-width spaces
 */
function wrapInvisible(text) {
  // Use zero-width space (U+200B) as wrapper markers
  return '\u200B' + text + '\u200B';
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


/**
 * Strips legacy watermark tags and zero-width strings from event descriptions.
 *
 * @param {string} text - The description text to clean
 * @returns {string} Cleaned description text
 */
function stripWatermarkFromText(text) {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text;

  // 1. Remove zero-width wrapped tag strings (e.g. \u200B[BirthdaySync]:...\u200B)
  cleaned = cleaned.replace(/\u200B\[BirthdaySync\][^\u200B\n]*\u200B?/gi, '');

  // 2. Remove any line containing [BirthdaySync]
  cleaned = cleaned.replace(/^[^\n]*\[BirthdaySync\][^\n]*\n?/gim, '');

  // 3. Remove standalone zero-width space characters left behind
  cleaned = cleaned.replace(/\u200B/g, '');

  // 4. Clean trailing whitespace and multiple blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}


/**
 * Scans past and future calendar events and strips legacy watermark tags from descriptions.
 *
 * @param {string} calendarId - Google Calendar ID
 * @param {number} [monthsPast=12] - Number of months in the past to scan
 * @param {number} [monthsAhead=12] - Number of months in the future to scan
 * @returns {{scanned: number, cleaned: number, errors: number}} Cleanup statistics
 */
function cleanExistingEventWatermarks(calendarId, monthsPast = 12, monthsAhead = 12) {
  const isDryRun = typeof dryRun !== 'undefined' && dryRun;
  if (isDryRun) Logger.log('🧪 DRY RUN MODE — no calendar modifications will be saved');

  const calendar = CalendarApp.getCalendarById(calendarId);
  if (!calendar) {
    throw new Error(`Calendar not found: ${calendarId}`);
  }

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - monthsPast, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + monthsAhead + 1, 0, 23, 59, 59);

  Logger.log(`🧹 Scanning calendar events for watermarks from ${startDate.toDateString()} to ${endDate.toDateString()}...`);

  const events = calendar.getEvents(startDate, endDate);
  const stats = { scanned: events.length, cleaned: 0, errors: 0 };

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    try {
      const description = event.getDescription() || '';
      if (description.includes('[BirthdaySync]') || description.includes('\u200B')) {
        const cleanedDescription = stripWatermarkFromText(description);
        if (cleanedDescription !== description) {
          stats.cleaned++;
          if (isDryRun) {
            Logger.log(`🧪 [DRY RUN] Would clean watermark from event: "${event.getTitle()}" on ${event.getStartTime().toDateString()}`);
          } else {
            event.setDescription(cleanedDescription);
            Logger.log(`✨ Cleaned watermark from event: "${event.getTitle()}" on ${event.getStartTime().toDateString()}`);
          }
        }
      }
    } catch (err) {
      stats.errors++;
      Logger.log(`⚠️ Error cleaning event "${event.getTitle()}": ${err.message}`);
    }
  }

  Logger.log(`🎉 Watermark cleanup complete: scanned ${stats.scanned} events, cleaned ${stats.cleaned} events (${stats.errors} errors).`);
  return stats;
}
