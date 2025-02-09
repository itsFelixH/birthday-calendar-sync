
// VARIABLES

var monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
var monthNamesLong = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];


/**
 * Updates birthdays and summaries in the calendar.
 */
function updateBirthdaysAndSummariesInCalendar() {
  var contacts = fetchContactsWithBirthdays();

  if (createIndividualBirthdayEvents) {
    createOrUpdateIndividualBirthdays(calendarId, contacts, yearToUse);
  }

  if (createBirthdaySummaryEvents) {
    createOrUpdateMonthlyBirthdaySummaries(calendarId, contacts, yearToUse);
  }
}

function sendSummaryMail() {
  var contacts = fetchContactsWithBirthdays();

  var nextMonthDate = getNextMonth()
  createMonthlyBirthdaySummaryMail(contacts, nextMonthDate.getMonth(), nextMonthDate.getFullYear())
}

function sendDailyMail() {
  var contacts = fetchContactsWithBirthdays();

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  createDailyBirthdayMail(contacts, tomorrow, 15)
}
