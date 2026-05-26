// CONFIGURATION SETTINGS

// Month name abbreviations (German)
var monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
// Full month names (German)
var monthNamesLong = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

// The ID of the Google Calendar where birthdays will be added.
// You can find this ID in your Google Calendar settings.
const calendarId = '99406ed07130a00e82235b91df15a0fe67a28b8fd7bbaf08f81fff2fd2b77a9a@group.calendar.google.com';

// Set this to true if you want to sync birthdays only for contacts with a specific label(s).
const useLabel = false;

// The name(s) of the label(s) to be used if useLabel is set to true.
// Only contacts with one of these labels will be fetched.
const labelFilter = [];

// The type of reminder to be added to the birthday events.
// Possible values: 'none', 'email', 'popup'.
const reminderMethod = 'popup';

// The number of minutes before the event when the reminder should popup or send an email.
// For example, 60 * 12 means the reminder will be sent 12 hours before the event.
const reminderInMinutes = 60 * 12;

// Set this to true if you want to create individual birthday events for each contact.
const createIndividualBirthdayEvents = true;
// Set this to true if you want to create monthly birthday summary events.
// = one event on the 1st of each month containg all birthdays this month. 
const createBirthdaySummaryEvents = true;

// The amount of months ahead for which birthday events and summaries will be created/updated.
// By default, it creates events for the next year (=12 months).
const monthsAhead = 12;

// Set this to true to run in dry-run mode.
// In dry-run mode, no calendar events are created/updated/deleted and no emails are sent.
// All actions are logged so you can preview what would happen.
const dryRun = false;

// How to handle leap year birthdays (Feb 29) in non-leap years.
// Possible values: 'feb28' (move to Feb 28) or 'mar1' (move to Mar 1).
const leapYearHandling = 'feb28';

// Highlight milestone birthdays with a special event title.
// Set to true to enable milestone highlighting.
const highlightMilestones = true;

// The ages considered milestones. Events for these ages get a special title.
const milestoneAges = [18, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100];

// How to handle deceased contacts.
// Possible values: 'skip' (no events created), 'memorial' (memorial-style event), 'normal' (treat like any other contact).
const deceasedHandling = 'skip';

// Whether to create recurring yearly events or single (non-recurring) events.
// Possible values: 'single' (default, one event per birthday per year) or 'recurring' (one recurring annual event per contact).
const eventRecurrence = 'single';

// The Google Contacts group label used to identify deceased contacts.
const deceasedLabel = '🪦 Verstorben';

// The contact event type (custom date field) used to store the death date.
// In Google Contacts this is the label/type of the date entry (e.g., "gestorben").
const deceasedDateLabel = 'Todestag';

// Unique tag used to identify birthday events created by this script.
// Stored in event descriptions to prevent duplicate creation when contact names change.
const eventTag = '[BirthdaySync]';
