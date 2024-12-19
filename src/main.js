

/**
 * Updates birthdays and summaries in the calendar.
 */
function updateBirthdaysAndSummariesInCalendar() {
  var contacts = fetchContactsWithBirthdays();
  createOrUpdateIndividualBirthdays(calendarId, contacts, yearToUse);
  if (createSummaries) {
    createOrUpdateMonthlyBirthdaySummaries(calendarId, contacts, yearToUse);
  }
}


/**
 * Deletes all events from the specified calendar.
 */
function deleteEvents() {
  deleteEventsWithTitle(calendarId, deleteString, deleteStartDate, deleteEndDate);
}

