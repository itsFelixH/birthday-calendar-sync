// CONFIGURATION SETTINGS

// Language to use for the calendar events
// Change this to the desired language ('en', 'de', 'es', 'fr')
// const language = 'de';

// The ID of the Google Calendar where birthdays will be added.
// You can find this ID in your Google Calendar settings.
const calendarId = '99406ed07130a00e82235b91df15a0fe67a28b8fd7bbaf08f81fff2fd2b77a9a@group.calendar.google.com';

// Set this to true if you want to sync birthdays only for contacts with a specific label(s).
// const useLabel = false;

// The name(s) of the label(s) to be used if useLabel is set to true.
// Only contacts with one of these labels will be fetched.
// const labelFilter = ["❤️ Gemeinsam", "👮 Hannover"];

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
