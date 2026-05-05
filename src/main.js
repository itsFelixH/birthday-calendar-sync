
// VARIABLES

var monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
var monthNamesLong = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];


/**
 * Updates birthdays and summaries in the calendar.
 */
function updateBirthdaysAndSummariesInCalendar() {
  try {
    const contacts = fetchContactsWithBirthdays(useLabel ? labelFilter : []);

    if (!contacts || contacts.length === 0) {
      Logger.log('⚠️ No contacts with birthdays found. Aborting calendar update.');
      return;
    }

    const changes = {
      individual: { created: [], updated: [] },
      summary: { created: [], updated: [] }
    };

    if (createIndividualBirthdayEvents) {
      const individualStats = createOrUpdateIndividualBirthdays(calendarId, contacts, monthsAhead, reminderInMinutes, reminderMethod);
      changes.individual = individualStats;
    }

    if (createBirthdaySummaryEvents) {
      const summaryStats = createOrUpdateMonthlyBirthdaySummaries(calendarId, contacts, monthsAhead, reminderInMinutes, reminderMethod);
      changes.summary = summaryStats;
    }

    if (hasChanges(changes)) {
      const emailManager = new EmailManager();
      emailManager.sendCalendarUpdateEmail(changes);
    }
  } catch (error) {
    Logger.log(`💥 Error in updateBirthdaysAndSummariesInCalendar: ${error.message}`);
  }
}

function sendSummaryMail() {
  try {
    const contacts = fetchContactsWithBirthdays(useLabel ? labelFilter : []);

    if (!contacts || contacts.length === 0) {
      Logger.log('⚠️ No contacts with birthdays found. Aborting summary mail.');
      return;
    }

    const nextMonthDate = getNextMonth();
    const emailManager = new EmailManager();
    emailManager.sendMonthlyBirthdaySummaryMail(contacts, nextMonthDate.getMonth(), nextMonthDate.getFullYear());
  } catch (error) {
    Logger.log(`💥 Error in sendSummaryMail: ${error.message}`);
  }
}

function sendDailyMail() {
  try {
    const contacts = fetchContactsWithBirthdays(useLabel ? labelFilter : []);

    if (!contacts || contacts.length === 0) {
      Logger.log('⚠️ No contacts with birthdays found. Aborting daily mail.');
      return;
    }

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const emailManager = new EmailManager();
    emailManager.sendDailyBirthdayMail(contacts, tomorrow, 15);
  } catch (error) {
    Logger.log(`💥 Error in sendDailyMail: ${error.message}`);
  }
}
