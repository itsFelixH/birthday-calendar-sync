
// VARIABLES

var monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
var monthNamesLong = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];


/**
 * Updates birthdays and summaries in the calendar.
 */
function updateBirthdaysAndSummariesInCalendar() {
  const contacts = fetchContactsWithBirthdays();

  const changes = {
    individual: { created: [], updated: [] },
    summary: { created: [], updated: [] }
  };

  if (createIndividualBirthdayEvents) {
    const individualStats = createOrUpdateIndividualBirthdays(calendarId, contacts, monthsAhead);
    changes.individual = individualStats;
  }

  if (createBirthdaySummaryEvents) {
    const summaryStats = createOrUpdateMonthlyBirthdaySummaries(calendarId, contacts, monthsAhead);
    changes.summary = summaryStats;
  }

  if (hasChanges(changes)) {
    sendCalendarUpdateEmail(changes);
  }
}

function sendSummaryMail() {
  const contacts = fetchContactsWithBirthdays();

  const nextMonthDate = getNextMonth()
  createMonthlyBirthdaySummaryMail(contacts, nextMonthDate.getMonth(), nextMonthDate.getFullYear())
}

function sendDailyMail() {
  const contacts = fetchContactsWithBirthdays();

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  createDailyBirthdayMail(contacts, tomorrow, 15)
}
