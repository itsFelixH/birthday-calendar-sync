/**
 * Utility functions - pure helpers with no domain-specific logic.
 */


/**
 * Checks if there were any changes made to the calendar.
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
 * Extracts Instagram usernames from the given notes.
 * Supports @username patterns and "Instagram: username" format.
 *
 * @param {string} notes The notes containing Instagram usernames.
 * @returns {string[]} Array of Instagram usernames (with @ prefix), or empty array if none found.
 */
function extractInstagramNamesFromNotes(notes) {
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
 * @returns {Date} The first day of the next month.
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
 * Gets the current user's first name from Google People API.
 *
 * @returns {string} The user's first name, or empty string if unavailable.
 */
function getCurrentUserFirstName() {
  try {
    const peopleResponse = People.People.getBatchGet({
      resourceNames: ['people/me'],
      personFields: 'names'
    });

    if (peopleResponse && peopleResponse.responses && peopleResponse.responses.length > 0) {
      const person = peopleResponse.responses[0].person;
      if (person && person.names && person.names.length > 0) {
        return person.names[0].givenName || '';
      }
    }
    return '';
  } catch (err) {
    Logger.log('Failed to get own profile with an error: ' + err.message);
    return '';
  }
}


/**
 * Adjusts a birthday date for leap year handling.
 * If the birthday is Feb 29 and the target year is not a leap year,
 * moves the date according to the configured leapYearHandling setting.
 *
 * @param {number} month 0-based month (0-11)
 * @param {number} day Day of month (1-31)
 * @param {number} year Target year
 * @param {string} [handling] 'feb28' or 'mar1' (defaults to global leapYearHandling)
 * @returns {{month: number, day: number}} Adjusted month and day
 */
function adjustForLeapYear(month, day, year, handling) {
  const strategy = handling || (typeof leapYearHandling !== 'undefined' ? leapYearHandling : 'feb28');
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

  // Only adjust Feb 29 birthdays in non-leap years
  if (month === 1 && day === 29 && !isLeap) {
    if (strategy === 'mar1') {
      return { month: 2, day: 1 };
    }
    // Default: feb28
    return { month: 1, day: 28 };
  }

  return { month, day };
}


/**
 * Generates a unique event identifier for a contact's birthday event.
 * Used to match existing events to contacts regardless of name changes.
 *
 * @param {string} resourceId The contact's unique resource identifier
 * @param {string} type Event type ('individual' or 'summary')
 * @returns {string} A unique event tag string
 */
function buildEventTag(resourceId, type) {
  return `[bcs:${type}:${resourceId}]`;
}


/**
 * Extracts the event tag from an event description.
 *
 * @param {string} description The event description
 * @returns {string|null} The event tag if found, or null
 */
function extractEventTag(description) {
  if (!description) return null;
  const match = description.match(/\[bcs:(individual|summary):([^\]]+)\]/);
  return match ? match[0] : null;
}


/**
 * Extracts the resource ID from an event tag in a description.
 *
 * @param {string} description The event description
 * @returns {string|null} The resource ID if found, or null
 */
function extractResourceIdFromTag(description) {
  if (!description) return null;
  const match = description.match(/\[bcs:(?:individual|summary):([^\]]+)\]/);
  return match ? match[1] : null;
}


/**
 * Logs the current configuration from config.js.
 */
function logConfiguration() {
  Logger.log("Configuration from config.js:");

  let calendar = CalendarApp.getCalendarById(calendarId);
  if (calendar) {
    Logger.log("Calendar Name: " + calendar.getName());
  } else {
    Logger.log("Calendar with ID " + calendarId + " not found.");
  }
  Logger.log("useLabel: " + useLabel);
  Logger.log("labelFilter: " + labelFilter.join(", "));
  Logger.log("reminderMethod: " + reminderMethod);
  Logger.log("reminderInMinutes: " + reminderInMinutes);
  Logger.log("createIndividualBirthdayEvents: " + createIndividualBirthdayEvents);
  Logger.log("createBirthdaySummaryEvents: " + createBirthdaySummaryEvents);
  Logger.log("monthsAhead: " + monthsAhead);
}
