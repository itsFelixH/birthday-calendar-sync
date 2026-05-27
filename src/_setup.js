// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  👋 Welcome! Run setupSchedules() to get started.                           ║
// ║                                                                              ║
// ║  1. Make sure config.js has your calendarId set                              ║
// ║  2. Select "setupSchedules" from the function dropdown above                 ║
// ║  3. Click ▶ Run                                                              ║
// ║                                                                              ║
// ║  That's it! The script will sync your birthdays automatically.               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * Functions managed by setupSchedules/removeSchedules.
 * Only triggers for these functions are touched — user-created triggers are left alone.
 */
const MANAGED_FUNCTIONS = [
  'syncBirthdays',
  'sendMonthlySummary',
  'sendWeeklyReminder'
];

/**
 * Creates time-based triggers based on your config.
 * Only creates email triggers if the corresponding email setting is enabled.
 * Run this once after deploying. Safe to re-run — removes existing managed triggers first.
 */
function setupSchedules() {
  if (!isCalendarConfigured()) return;

  // Remove only triggers managed by this script
  const existing = ScriptApp.getProjectTriggers().filter(
    trigger => MANAGED_FUNCTIONS.includes(trigger.getHandlerFunction())
  );

  if (existing.length > 0) {
    Logger.log(`🔄 Removing ${existing.length} existing managed trigger(s):`);
    existing.forEach(trigger => {
      Logger.log(`   • ${trigger.getHandlerFunction()}`);
      ScriptApp.deleteTrigger(trigger);
    });
  }

  const syncDay = typeof scheduleSyncDay !== 'undefined' ? scheduleSyncDay : ScriptApp.WeekDay.MONDAY;
  const syncHour = typeof scheduleSyncHour !== 'undefined' ? scheduleSyncHour : 3;

  // Calendar sync — always created
  ScriptApp.newTrigger('syncBirthdays')
    .timeBased()
    .onWeekDay(syncDay)
    .atHour(syncHour)
    .create();
  Logger.log(`✅ syncBirthdays — weekly at ~${syncHour}:00`);

  // Monthly summary email — only if enabled
  const monthlySummaryEnabled = typeof sendMonthlySummaryEmail !== 'undefined' && sendMonthlySummaryEmail;
  if (monthlySummaryEnabled) {
    const summaryDay = typeof scheduleMonthlySummaryDay !== 'undefined' ? scheduleMonthlySummaryDay : 28;
    const summaryHour = typeof scheduleMonthlySummaryHour !== 'undefined' ? scheduleMonthlySummaryHour : 9;
    ScriptApp.newTrigger('sendMonthlySummary')
      .timeBased()
      .onMonthDay(summaryDay)
      .atHour(summaryHour)
      .create();
    Logger.log(`✅ sendMonthlySummary — day ${summaryDay} of each month at ~${summaryHour}:00`);
  } else {
    Logger.log('⏭️ sendMonthlySummary — skipped (sendMonthlySummaryEmail is disabled)');
  }

  // Weekly reminder email — only if enabled
  const weeklyReminderEnabled = typeof sendWeeklyReminderEmail !== 'undefined' && sendWeeklyReminderEmail;
  if (weeklyReminderEnabled) {
    const reminderDay = typeof scheduleWeeklyReminderDay !== 'undefined' ? scheduleWeeklyReminderDay : ScriptApp.WeekDay.MONDAY;
    const reminderHour = typeof scheduleWeeklyReminderHour !== 'undefined' ? scheduleWeeklyReminderHour : 10;
    ScriptApp.newTrigger('sendWeeklyReminder')
      .timeBased()
      .onWeekDay(reminderDay)
      .atHour(reminderHour)
      .create();
    Logger.log(`✅ sendWeeklyReminder — weekly at ~${reminderHour}:00`);
  } else {
    Logger.log('⏭️ sendWeeklyReminder — skipped (sendWeeklyReminderEmail is disabled)');
  }
}

/**
 * Removes all triggers managed by this script.
 * User-created triggers for other functions are left untouched.
 */
function removeSchedules() {
  const existing = ScriptApp.getProjectTriggers().filter(
    trigger => MANAGED_FUNCTIONS.includes(trigger.getHandlerFunction())
  );

  if (existing.length === 0) {
    Logger.log('ℹ️ No managed triggers found. Nothing to remove.');
    return;
  }

  Logger.log(`🗑️ Removing ${existing.length} managed trigger(s):`);
  existing.forEach(trigger => {
    Logger.log(`   • ${trigger.getHandlerFunction()}`);
    ScriptApp.deleteTrigger(trigger);
  });
  Logger.log('✅ All managed schedules removed.');
}
