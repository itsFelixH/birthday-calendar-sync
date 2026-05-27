
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
      const indMonths = typeof individualMonthsAhead !== 'undefined' ? individualMonthsAhead : 12;
      const indReminderMin = typeof individualReminderMinutes !== 'undefined' ? individualReminderMinutes : 60 * 12;
      const indReminderMethod = typeof individualReminderMethod !== 'undefined' ? individualReminderMethod : 'popup';
      const individualStats = createOrUpdateIndividualBirthdays(calendarId, contacts, indMonths, indReminderMin, indReminderMethod);
      changes.individual = individualStats;
    }

    if (createBirthdaySummaryEvents) {
      const sumMonths = typeof summaryMonthsAhead !== 'undefined' ? summaryMonthsAhead : 12;
      const sumReminderMin = typeof summaryReminderMinutes !== 'undefined' ? summaryReminderMinutes : 5760;
      const sumReminderMethod = typeof summaryReminderMethod !== 'undefined' ? summaryReminderMethod : 'popup';
      const summaryStats = createOrUpdateMonthlyBirthdaySummaries(calendarId, contacts, sumMonths, sumReminderMin, sumReminderMethod);
      changes.summary = summaryStats;
    }

    if (hasChanges(changes)) {
      const shouldEmail = typeof sendSyncReport !== 'undefined' ? sendSyncReport : false;
      if (isDryRun) {
        Logger.log('🧪 [DRY RUN] Would send calendar update email with changes:');
        Logger.log(`   Individual created: ${changes.individual.created.length}, updated: ${changes.individual.updated.length}`);
        Logger.log(`   Summary created: ${changes.summary.created.length}, updated: ${changes.summary.updated.length}`);
      } else if (shouldEmail) {
        const emailManager = new EmailManager();
        emailManager.sendSyncReport(changes);
      } else {
        Logger.log('📧 Calendar update email disabled by config.');
      }
    }
  } catch (error) {
    Logger.log(`💥 Error in updateBirthdaysAndSummariesInCalendar: ${error.message}`);
  }
}

function sendMonthlySummary() {
  try {
    const isDryRun = typeof dryRun !== 'undefined' && dryRun;
    const enabled = typeof sendMonthlySummaryEmail !== 'undefined' ? sendMonthlySummaryEmail : false;

    if (!enabled) {
      Logger.log('📧 Monthly summary email disabled by config.');
      return;
    }

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
    emailManager.sendMonthlySummary(contacts, nextMonthDate.getMonth(), nextMonthDate.getFullYear());
  } catch (error) {
    Logger.log(`💥 Error in sendMonthlySummary: ${error.message}`);
  }
}

function sendWeeklyReminder() {
  try {
    const isDryRun = typeof dryRun !== 'undefined' && dryRun;
    const enabled = typeof sendWeeklyReminderEmail !== 'undefined' ? sendWeeklyReminderEmail : false;

    if (!enabled) {
      Logger.log('📧 Weekly reminder email disabled by config.');
      return;
    }

    const today = new Date();
    const sendDay = typeof weeklyReminderDay !== 'undefined' ? weeklyReminderDay : 1;

    // Check if today is the configured send day (-1 = send every day)
    if (sendDay >= 0 && today.getDay() !== sendDay) {
      Logger.log(`📧 Weekly reminder skipped (today is not the configured send day).`);
      return;
    }

    const contacts = fetchContactsWithBirthdays(useLabel ? labelFilter : []);

    if (!contacts || contacts.length === 0) {
      Logger.log('⚠️ No contacts with birthdays found. Aborting weekly reminder.');
      return;
    }

    const days = typeof reminderDaysBefore !== 'undefined' ? reminderDaysBefore : 7;

    if (isDryRun) {
      Logger.log(`🧪 [DRY RUN] Would send weekly reminder for the next ${days} days`);
      return;
    }

    const emailManager = new EmailManager();
    emailManager.sendWeeklyReminder(contacts, today, days);
  } catch (error) {
    Logger.log(`💥 Error in sendWeeklyReminder: ${error.message}`);
  }
}

function sendContactQualityReport() {
  try {
    const isDryRun = typeof dryRun !== 'undefined' && dryRun;
    const contacts = fetchContactsWithBirthdays(useLabel ? labelFilter : []);

    if (!contacts || contacts.length === 0) {
      Logger.log('⚠️ No contacts with birthdays found. Aborting quality report.');
      return;
    }

    if (isDryRun) {
      Logger.log(`🧪 [DRY RUN] Would send contact quality report for ${contacts.length} contacts`);
      return;
    }

    const emailManager = new EmailManager();
    emailManager.sendContactQualityReport(contacts);
  } catch (error) {
    Logger.log(`💥 Error in sendContactQualityReport: ${error.message}`);
  }
}
