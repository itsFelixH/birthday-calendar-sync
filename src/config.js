// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         BIRTHDAY CALENDAR SYNC                              ║
// ║                         Configuration Settings                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


// ═══════════════════════════════════════════════════════════════════════════════
// ESSENTIAL SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════

// The ID of the Google Calendar where birthdays will be added.
const calendarId = '99406ed07130a00e82235b91df15a0fe67a28b8fd7bbaf08f81fff2fd2b77a9a@group.calendar.google.com';

// ─── What to create ───────────────────────────────────────────────────────────

// Create individual birthday events (one per contact per year).
const createIndividualBirthdayEvents = true;

// Create monthly summary events (one per month listing all birthdays).
const createBirthdaySummaryEvents = true;

// ─── Contact filtering ────────────────────────────────────────────────────────

// Only sync contacts with specific label(s). Set to true + fill labelFilter.
const useLabel = false;
const labelFilter = [];

// ─── Reminders ────────────────────────────────────────────────────────────────

// Individual events: reminder type ('popup', 'email', 'none') and minutes before.
const individualReminderMethod = 'popup';
const individualReminderMinutes = 60 * 12; // 12 hours

// Summary events: reminder type and minutes before.
const summaryReminderMethod = 'popup';
const summaryReminderMinutes = 5760; // 4 days

// ─── Lookahead ────────────────────────────────────────────────────────────────

// How many months ahead to create/update events.
const individualMonthsAhead = 12;
const summaryMonthsAhead = 12;

// ─── Notifications ────────────────────────────────────────────────────────────

// Send an email after syncing with a list of created/updated events.
const sendCalendarUpdateEmail = true;


// ═══════════════════════════════════════════════════════════════════════════════
// EVENT APPEARANCE
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Title templates ──────────────────────────────────────────────────────────
// Placeholders: {name}, {age}, {birthdate}, {lifespan}
const eventTitles = {
  birthday: '🎂 {name} hat Geburtstag',
  milestone: '🎂🎉 {name} wird {age}! 🎉',
  recurring: '🎂 {name} hat Geburtstag',
  memorial: '🕯️ {name} ({lifespan})',
  summary: '🎉🎂 GEBURTSTAGE 🎂🎉'
};

// ─── Description texts ────────────────────────────────────────────────────────
// Labels and section headers used in event descriptions.
// Set a header to '' to hide it (content still appears).
const eventTexts = {
  birthdayWithAge: '🎂 {name} wird {age}',
  birthdayNoAge: '🎂 {name} hat heute Geburtstag',
  birthDateLabel: 'Geburtstag',
  contactSectionHeader: '── Kontakt ──',
  infoSectionHeader: '── Info ──',
  memorialPrefix: '🕯️ In Gedenken an',
  summaryHeader: 'Geburtstage im {month}',
  whatsappLabel: 'WhatsApp',
  instagramLabel: 'Instagram',
  contactLabel: 'Kontakt'
};

// ─── Event colors ─────────────────────────────────────────────────────────────
// Google Calendar color IDs ('' = calendar default):
// '1'=Lavender, '2'=Sage, '3'=Grape, '4'=Flamingo, '5'=Banana,
// '6'=Tangerine, '7'=Peacock, '8'=Graphite, '9'=Blueberry, '10'=Basil, '11'=Tomato
const eventColors = {
  birthday: '',    // also used for recurring events
  milestone: '',
  memorial: '',
  summary: ''
};

// ─── Description content ──────────────────────────────────────────────────────

// Show WhatsApp and Instagram links in event descriptions.
const showSocialLinks = true;

// Show the [BirthdaySync] tag visibly. If false, it's hidden with zero-width characters.
const showEventTag = true;


// ═══════════════════════════════════════════════════════════════════════════════
// BEHAVIOR
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Event mode ───────────────────────────────────────────────────────────────

// 'single' = one event per birthday per year (default).
// 'recurring' = one recurring annual event per contact (static description, no age).
// Leap year birthdays (Feb 29) always use single events.
const eventRecurrence = 'single';

// ─── Milestones ───────────────────────────────────────────────────────────────

// Highlight milestone birthdays with a special title.
const highlightMilestones = true;
const milestoneAges = [18, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100];

// ─── Leap year ────────────────────────────────────────────────────────────────

// How to handle Feb 29 birthdays in non-leap years: 'feb28' or 'mar1'.
const leapYearHandling = 'feb28';

// ─── Summary event placement ──────────────────────────────────────────────────

// Day of the month for the summary event (1-28).
const summaryEventDay = 1;

// ─── Deceased contacts ────────────────────────────────────────────────────────

// 'skip' = no events, 'memorial' = memorial-style event, 'normal' = treat normally.
const deceasedHandling = 'skip';

// Google Contacts label that marks a contact as deceased.
const deceasedLabel = '🪦 Verstorben';

// Custom date field label in Google Contacts for the death date.
const deceasedDateLabel = 'Todestag';


// ═══════════════════════════════════════════════════════════════════════════════
// ADVANCED
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Rate limiting ────────────────────────────────────────────────────────────

// Pause every N events to avoid Google API rate limits.
const rateLimitBatchSize = 20;
const rateLimitDelayMs = 500;

// ─── Dry run ──────────────────────────────────────────────────────────────────

// Preview mode: logs all actions without making changes.
const dryRun = false;

// ─── Internal ─────────────────────────────────────────────────────────────────

// Tag stored in event descriptions to identify script-created events.
const eventTag = '[BirthdaySync]';

// ─── Locale ───────────────────────────────────────────────────────────────────

var monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
var monthNamesLong = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
