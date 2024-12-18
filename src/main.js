
// VARIABLES

var monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
var monthNamesLong = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];


/**
 * Updates birthdays and summaries in the calendar.
 */
function updateBirthdaysAndSummariesInCalendar() {
  var contacts = fetchContactsWithBirthdays();
  logContactsNames(contacts);

  if (createIndividualBirthdayEvents) {
    createOrUpdateIndividualBirthdays(calendarId, contacts, yearToUse);
  }

  if (createBirthdaySummaryEvents) {
    createOrUpdateMonthlyBirthdaySummaries(calendarId, contacts, yearToUse);
  }
}

function testFetch() {
  var contacts = fetchContactsWithBirthdays();
  logContactsNames(contacts);
}

function testSocials() {
  var contacts = fetchContactsWithBirthdays(["👮 Hannover", "📱 Social Media"]);
  var kim = getContactByName(contacts, "Kim Richert")
  var lara = getContactByName(contacts, "Lara Wr")
  kim.logContactDetails()
  lara.logContactDetails()
}

function testLabelFilter() {
  var contacts = fetchContactsWithBirthdays(["❤️ Gemeinsam", "👮 Hannover"]);
  logContactsNames(contacts)

  var contacts = fetchContactsWithBirthdays(["🐻 Berlin"]);
  logContactsNames(contacts)
}

function testBirthdayInformation() {
  var contacts = fetchContactsWithBirthdays(["❤️ Gemeinsam", "👮 Hannover"]);
  var kim = getContactByName(contacts, "Kim Richert")
  kim.logBirthdayInformation()
}

function testLabels() {
  var labelManager = new LabelManager();

  var labelId = "contactGroups/2b335be8d2ec275";
  var labelName = labelManager.getLabelNameById(labelId);
  Logger.log("Label Name: " + (labelName ? labelName : "Label ID not found"));
}



