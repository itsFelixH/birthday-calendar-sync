
/**
 * Updates birthdays and summaries in the calendar.
 */
function updateBirthdaysAndSummariesInCalendar() {
  try {
    const isDryRun = typeof dryRun !== 'undefined' && dryRun;
    if (isDryRun) Logger.log('🧪 DRY RUN MODE — no calendar or email changes will be made');

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
      if (isDryRun) {
        Logger.log('🧪 [DRY RUN] Would send calendar update email with changes:');
        Logger.log(`   Individual created: ${changes.individual.created.length}, updated: ${changes.individual.updated.length}`);
        Logger.log(`   Summary created: ${changes.summary.created.length}, updated: ${changes.summary.updated.length}`);
      } else {
        const emailManager = new EmailManager();
        emailManager.sendCalendarUpdateEmail(changes);
      }
    }
  } catch (error) {
    Logger.log(`💥 Error in updateBirthdaysAndSummariesInCalendar: ${error.message}`);
  }
}

function sendSummaryMail() {
  try {
    const isDryRun = typeof dryRun !== 'undefined' && dryRun;
    const contacts = fetchContactsWithBirthdays(useLabel ? labelFilter : []);

    if (!contacts || contacts.length === 0) {
      Logger.log('⚠️ No contacts with birthdays found. Aborting summary mail.');
      return;
    }

    const nextMonthDate = getNextMonth();

    if (isDryRun) {
      const monthContacts = contacts.filter(c => c.birthday.getMonth() === nextMonthDate.getMonth());
      Logger.log(`🧪 [DRY RUN] Would send monthly summary email for ${monthNamesLong[nextMonthDate.getMonth()]} with ${monthContacts.length} birthdays`);
      return;
    }

    const emailManager = new EmailManager();
    emailManager.sendMonthlyBirthdaySummaryMail(contacts, nextMonthDate.getMonth(), nextMonthDate.getFullYear());
  } catch (error) {
    Logger.log(`💥 Error in sendSummaryMail: ${error.message}`);
  }
}

function sendDailyMail() {
  try {
    const isDryRun = typeof dryRun !== 'undefined' && dryRun;
    const contacts = fetchContactsWithBirthdays(useLabel ? labelFilter : []);

    if (!contacts || contacts.length === 0) {
      Logger.log('⚠️ No contacts with birthdays found. Aborting daily mail.');
      return;
    }

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (isDryRun) {
      const tomorrowContacts = getContactsByBirthday(contacts, tomorrow.getDate(), tomorrow.getMonth());
      Logger.log(`🧪 [DRY RUN] Would send daily birthday email for ${tomorrow.toLocaleDateString()} with ${tomorrowContacts.length} birthdays`);
      return;
    }

    const emailManager = new EmailManager();
    emailManager.sendDailyBirthdayMail(contacts, tomorrow, 15);
  } catch (error) {
    Logger.log(`💥 Error in sendDailyMail: ${error.message}`);
  }
}
