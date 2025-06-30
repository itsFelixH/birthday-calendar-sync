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

function testScriptName() {
  var id = ScriptApp.getScriptId();
  var name = DriveApp.getFileById(id).getName();
  Logger.log(name);
}

function testFirstName() {
  Logger.log(getCurrentUserFirstName())
}

function testEmailManager() {
  const emailManager = new EmailManager();

  const contacts = [
    new BirthdayContact(
      'Test User 1',
      new Date(1990, 0, 15),
      ['Friend'],
      'test1@example.com',
      'Berlin',
      '+1234567890',
      ['@test1']
    ),
    new BirthdayContact(
      'Test User 2',
      new Date(1985, 0, 16),
      ['Family'],
      'test2@example.com',
      'Hamburg',
      '+0987654321',
      ['@test2']
    )
  ];

  Logger.log('Testing monthly summary email...');
  emailManager.sendMonthlyBirthdaySummaryMail(contacts, 0, 2024);

  Logger.log('Testing daily birthday email...');
  emailManager.sendDailyBirthdayMail(contacts, new Date(2024, 0, 15), 5);

  Logger.log('Testing calendar update email...');
  const changes = {
    individual: {
      created: ['Test User 1 (15.01.2024)'],
      updated: []
    },
    summary: {
      created: ['January 2024'],
      updated: []
    }
  };
  emailManager.sendCalendarUpdateEmail(changes);
}
