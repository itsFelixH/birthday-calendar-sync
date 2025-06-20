// Functions for testing

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

  // Test multiple Instagram names
  var testContact = new BirthdayContact(
    "Test User",
    new Date(),
    ["📱 Social Media"],
    "test@example.com",
    "Berlin",
    "+1234567890",
    ["@test1", "@test2", "@test3"]
  );
  testContact.logContactDetails();
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

function testEmail() {
  const toEmail = Session.getActiveUser().getEmail();
  const fromEmail = Session.getActiveUser().getEmail();

  var subject = '🎉 Test Email';
  let htmlBody = `This is a test email sent from a Google Apps Script 😁<br>`;
  sendMail(toEmail, fromEmail, 'Test', subject, '', htmlBody);
}

function testInstagramExtraction() {
  // Test single Instagram name
  var singleNote = "Instagram: johndoe";
  var result1 = extractInstagramNamesFromNotes(singleNote);
  Logger.log("Single Instagram name test:");
  Logger.log(result1); // Should be ["@johndoe"]

  // Test multiple Instagram names in one note
  var multiNote = "Instagram: johndoe, janedoe, testuser";
  var result2 = extractInstagramNamesFromNotes(multiNote);
  Logger.log("\nMultiple Instagram names (comma-separated) test:");
  Logger.log(result2); // Should be ["@johndoe", "@janedoe", "@testuser"]

  // Test multiple Instagram names in different notes
  var multiNotesSeparate = "Instagram: johndoe. Instagram: janedoe. @testuser";
  var result3 = extractInstagramNamesFromNotes(multiNotesSeparate);
  Logger.log("\nMultiple Instagram names (separate notes) test:");
  Logger.log(result3); // Should be ["@johndoe", "@janedoe", "@testuser"]

  // Test mixed format
  var mixedNotes = "Instagram: user1, user2. @user3. Instagram: user4, user5";
  var result4 = extractInstagramNamesFromNotes(mixedNotes);
  Logger.log("\nMixed format test:");
  Logger.log(result4); // Should be ["@user1", "@user2", "@user3", "@user4", "@user5"]
}

function testScriptName() {
  var id = ScriptApp.getScriptId();
  var name = DriveApp.getFileById(id).getName();
  Logger.log(name);
}

function testFirstName() {
  Logger.log(getCurrentUserFirstName())
}