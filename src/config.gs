// CONFIG

// The ID of the Google Calendar where birthdays will be added.
// You can find this ID in your Google Calendar settings.
var calendarId = "your-calendar-id@group.calendar.google.com";

// Set this to true if you want to sync birthdays only for contacts with a specific label.
var useLabel = false;

// The ID of the label to be used if useLabel is set to true.
// You can find this ID in the URL of the specific label in your Google Contacts.
var labelId = "your-label-id";

// The type of reminder to be added to the birthday events.
// Possible values: "none", "email", "popup".
var addReminder = "popup";

// The number of minutes before the event when the reminder should popup or send an email.
// For example, 60 * 12 means the reminder will be sent 12 hours before the event.
var reminderInMinutes = 60 * 12;

// Set this to true if you want to create monthly birthday summaries in addition to individual birthday events.
var createSummaries = true;

// The year for which birthday events and summaries will be created/updated.
// By default, it uses the current year.
var yearToUse = new Date().getFullYear();
// Example: If you want to create for a specific future year, you can uncomment and set the year manually:
// var yearToUse = 2025;


// SETTINGS FOR DELETING EVENTS

// The string to search for in the event titles that should be deleted.
var deleteString = "hat Geburtstag";

// The start date from which to search for events to delete.
// Only events on or after this date will be considered for deletion.
var deleteStartDate = new Date("2023-01-01");

// The end date until which to search for events to delete.
// Only events on or before this date will be considered for deletion.
var deleteEndDate = new Date("2025-12-31");


// SETTINGS FOR DATE FORMATTING
var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var monthNamesLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
