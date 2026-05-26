// CONFIGURATION SETTINGS

// ─── Locale ───────────────────────────────────────────────────────────────────

// Month name abbreviations (German)
var monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
// Full month names (German)
var monthNamesLong = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

// ─── Calendar ─────────────────────────────────────────────────────────────────

// The ID of the Google Calendar where birthdays will be added.
// You can find this ID in your Google Calendar settings.
const calendarId = '99406ed07130a00e82235b91df15a0fe67a28b8fd7bbaf08f81fff2fd2b77a9a@group.calendar.google.com';

// ─── Contact Filtering ────────────────────────────────────────────────────────

// Set this to true if you want to sync birthdays only for contacts with a specific label(s).
const useLabel = false;

// The name(s) of the label(s) to be used if useLabel is set to true.
// Only contacts with one of these labels will be fetched.
const labelFilter = [];

// ─── Individual Birthday Events ───────────────────────────────────────────────

// Set this to true if you want to create individual birthday events for each contact.
const createIndividualBirthdayEvents = true;

// The amount of months ahead for which individual birthday events will be created/updated.
const individualMonthsAhead = 12;

// The type of reminder for individual birthday events.
// Possible values: 'none', 'email', 'popup'.
const individualReminderMethod = 'popup';

// The number of minutes before the individual event when the reminder fires.
// For example, 60 * 12 means 12 hours before the event.
const individualReminderMinutes = 60 * 12;

// ─── Monthly Summary Events ──────────────────────────────────────────────────

// Set this to true if you want to create monthly birthday summary events.
// = one event on the Nth day of each month containing all birthdays that month.
const createBirthdaySummaryEvents = true;

// The amount of months ahead for which summary events will be created/updated.
const summaryMonthsAhead = 12;

// The type of reminder for monthly summary events.
// Possible values: 'none', 'email', 'popup'.
const summaryReminderMethod = 'popup';

// The number of minutes before the summary event when the reminder fires.
// Default: 5760 = 4 days before.
const summaryReminderMinutes = 5760;

// The day of the month on which the summary event is placed (1-28).
// Use 1 for the first day of the month, or e.g. 28 for end-of-previous-month style.
const summaryEventDay = 1;

// ─── Event Behavior ───────────────────────────────────────────────────────────

// Whether to send a calendar update email after syncing (listing created/updated events).
// Set to false to disable the notification email.
const sendCalendarUpdateEmail = true;

// Whether to create recurring yearly events or single (non-recurring) events.
// Possible values: 'single' (default, one event per birthday per year) or 'recurring' (one recurring annual event per contact).
// Note: Recurring mode uses a static description (no year-specific age) since it repeats unchanged.
// Leap year birthdays (Feb 29) always use single events because Google Calendar skips recurring events in non-leap years.
const eventRecurrence = 'single';

// How to handle leap year birthdays (Feb 29) in non-leap years.
// Possible values: 'feb28' (move to Feb 28) or 'mar1' (move to Mar 1).
const leapYearHandling = 'feb28';

// Highlight milestone birthdays with a special event title.
// Set to true to enable milestone highlighting.
const highlightMilestones = true;

// The ages considered milestones. Events for these ages get a special title.
const milestoneAges = [18, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100];

// Whether to show the sync tag visibly in the event description.
// If false, the tag is wrapped in zero-width characters to hide it from view but still allow matching.
const showEventTag = true;

// Whether to show WhatsApp and Instagram links in event descriptions.
// Set to false to only show the Google Contacts link.
const showSocialLinks = true;

// ─── Event Colors ─────────────────────────────────────────────────────────────
// Optional color for each event type. Set to '' (empty) to use the calendar's default color.
// Google Calendar color IDs: '1'=Lavender, '2'=Sage, '3'=Grape, '4'=Flamingo,
// '5'=Banana, '6'=Tangerine, '7'=Peacock, '8'=Graphite, '9'=Blueberry,
// '10'=Basil, '11'=Tomato
const eventColors = {
  // Standard birthday event color (empty = calendar default)
  birthday: '',
  // Milestone birthday color
  milestone: '',
  // Recurring event color
  recurring: '',
  // Memorial event color
  memorial: '',
  // Monthly summary event color
  summary: ''
};

// ─── Deceased Contacts ────────────────────────────────────────────────────────

// How to handle deceased contacts.
// Possible values: 'skip' (no events created), 'memorial' (memorial-style event), 'normal' (treat like any other contact).
const deceasedHandling = 'skip';

// The Google Contacts group label used to identify deceased contacts.
const deceasedLabel = '🪦 Verstorben';

// The contact event type (custom date field) used to store the death date.
// In Google Contacts this is the label/type of the date entry (e.g., "gestorben").
const deceasedDateLabel = 'Todestag';

// ─── Rate Limiting ────────────────────────────────────────────────────────────

// Number of events to process before pausing (to avoid Google API rate limits).
const rateLimitBatchSize = 20;

// Milliseconds to pause between batches.
const rateLimitDelayMs = 500;

// ─── Dry Run ──────────────────────────────────────────────────────────────────

// Set this to true to run in dry-run mode.
// In dry-run mode, no calendar events are created/updated/deleted and no emails are sent.
// All actions are logged so you can preview what would happen.
const dryRun = false;

// ─── Internal / Tags ──────────────────────────────────────────────────────────

// Unique tag used to identify birthday events created by this script.
// Stored in event descriptions to prevent duplicate creation when contact names change.
const eventTag = '[BirthdaySync]';

// ─── Event Title Templates ────────────────────────────────────────────────────
// Use placeholders: {name}, {age}, {birthdate}, {lifespan}
// Each template controls the title for a specific event type.
const eventTitles = {
  // Standard individual birthday event
  birthday: '🎂 {name} hat Geburtstag',
  // Milestone birthday (e.g., 30, 50, etc.)
  milestone: '🎂🎉 {name} wird {age}! 🎉',
  // Recurring event (static, no year-specific info)
  recurring: '🎂 {name} hat Geburtstag',
  // Memorial event for deceased contacts
  memorial: '🕯️ {name} ({lifespan})',
  // Monthly summary event
  summary: '🎉🎂 GEBURTSTAGE 🎂🎉'
};

// ─── Event Description Texts ──────────────────────────────────────────────────
// Configurable labels and section headers used in event descriptions.
const eventTexts = {
  // Header line for birthday events: "{name} wird {age}" or "{name} hat heute Geburtstag"
  birthdayWithAge: '🎂 {name} wird {age}',
  birthdayNoAge: '🎂 {name} hat heute Geburtstag',
  // Label for the birth date line
  birthDateLabel: 'Geburtstag',
  // Section headers (use empty string to hide the header but keep the content)
  contactSectionHeader: '── Kontakt ──',
  infoSectionHeader: '── Info ──',
  // Memorial prefix
  memorialPrefix: '🕯️ In Gedenken an',
  // Monthly summary description header: "Geburtstage im {month}"
  summaryHeader: 'Geburtstage im {month}',
  // Link labels
  whatsappLabel: 'WhatsApp',
  instagramLabel: 'Instagram',
  contactLabel: 'Kontakt'
};
