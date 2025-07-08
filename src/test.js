// Test Suite for Birthday Contact Manager

// Test helper functions
function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}: expected ${expected}, but got ${actual}`);
  }
}

function assertArrayEquals(actual, expected, message) {
  if (actual.length !== expected.length) {
    throw new Error(`${message || 'Assertion failed'}: arrays have different lengths`);
  }
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
      throw new Error(`${message || 'Assertion failed'}: arrays differ at index ${i}`);
    }
  }
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

function assertFalse(condition, message) {
  if (condition) {
    throw new Error(message || "Assertion failed");
  }
}


// Test BirthdayContact class
function testBirthdayContact() {
  console.log("Testing BirthdayContact class...");

  // Test constructor with valid data
  const contact = new BirthdayContact(
    "Test User",
    new Date(1990, 0, 15),
    ["Friend"],
    "test@example.com",
    "Berlin",
    "+1234567890",
    ["@test1"]
  );

  assertEquals(contact.getName(), "Test User", "getName() failed");
  assertEquals(contact.getBirthday().getFullYear(), 1990, "getBirthday() year failed");
  assertEquals(contact.getBirthday().getMonth(), 0, "getBirthday() month failed");
  assertEquals(contact.getBirthday().getDate(), 15, "getBirthday() date failed");
  assertArrayEquals(contact.getLabels(), ["Friend"], "getLabels() failed");

  // Test constructor with minimal data
  const minimalContact = new BirthdayContact(
    "Minimal User",
    new Date(1990, 0, 15)
  );
  assertEquals(minimalContact.getName(), "Minimal User", "Minimal contact name failed");
  assertArrayEquals(minimalContact.getLabels(), [], "Minimal contact labels should be empty");
  assertEquals(minimalContact.email, "", "Minimal contact email should be empty");

  // Test constructor error cases
  try {
    new BirthdayContact(null, new Date());
    throw new Error("Should have thrown error for null name");
  } catch (e) {
    assertTrue(e.message.includes("Name and birthday are required"), "Wrong error message for null name");
  }

  try {
    new BirthdayContact("Test", null);
    throw new Error("Should have thrown error for null birthday");
  } catch (e) {
    assertTrue(e.message.includes("Name and birthday are required"), "Wrong error message for null birthday");
  }

  // Test birthday formatting
  assertEquals(contact.getBirthdayShortFormat(), "15.01.", "getBirthdayShortFormat() failed");
  assertEquals(contact.getBirthdayLongFormat(), "15.01.1990", "getBirthdayLongFormat() failed");

  // Test current year birthday
  const currentYearContact = new BirthdayContact(
    "Current User",
    new Date(new Date().getFullYear(), 0, 15)
  );
  assertEquals(
    currentYearContact.getBirthdayLongFormat(),
    "15.01.",
    "Current year birthday format failed"
  );

  // Test age calculation
  const age = contact.calculateAge();
  const expectedAge = new Date().getFullYear() - 1990;
  assertEquals(contact.getAgeThisYear(), expectedAge, "getAgeThisYear() failed");

  // Test age calculation for future birthday this year
  const today = new Date();
  const futureBirthday = new Date(1990, 11, 31); // December 31st
  const futureBirthdayContact = new BirthdayContact("Future", futureBirthday);
  if (today.getMonth() < 11 || (today.getMonth() === 11 && today.getDate() < 31)) {
    assertEquals(
      futureBirthdayContact.calculateAge(),
      today.getFullYear() - 1991,
      "Future birthday age calculation failed"
    );
  }

  // Test social media links
  assertEquals(
    contact.getWhatsAppLink(),
    "https://wa.me/1234567890",
    "getWhatsAppLink() failed"
  );
  assertEquals(
    contact.getInstagramLink("@test1"),
    "https://www.instagram.com/test1/",
    "getInstagramLink() failed"
  );

  // Test invalid phone number
  const invalidPhoneContact = new BirthdayContact(
    "Invalid Phone",
    new Date(),
    [],
    "",
    "",
    "not-a-phone"
  );
  assertEquals(
    invalidPhoneContact.getWhatsAppLink(),
    "",
    "Invalid phone number handling failed"
  );

  // Test multiple Instagram handles
  const multiInstagramContact = new BirthdayContact(
    "Multi IG",
    new Date(),
    [],
    "",
    "",
    "",
    ["@test1", "@test2"]
  );
  assertArrayEquals(
    multiInstagramContact.getAllInstagramLinks(),
    [
      "https://www.instagram.com/test1/",
      "https://www.instagram.com/test2/"
    ],
    "Multiple Instagram handles failed"
  );

  console.log("BirthdayContact tests passed!");
}

// Test contact filtering functions
function testContactFiltering() {
  console.log("Testing contact filtering functions...");

  const contacts = [
    new BirthdayContact("User1", new Date(1990, 0, 15), ["Friend"], "user1@example.com"),
    new BirthdayContact("User2", new Date(1985, 1, 20), ["Family"], "user2@example.com"),
    new BirthdayContact("User3", new Date(1995, 0, 25), ["Friend", "Work"], "user3@example.com"),
    new BirthdayContact("User4", new Date(1992, 0, 15), [], "user4@example.com")
  ];

  // Test getContactByName
  const foundContact = getContactByName(contacts, "User1");
  assertEquals(foundContact.getName(), "User1", "getContactByName() failed");

  // Test case-insensitive name search
  const foundCaseInsensitive = getContactByName(contacts, "user1");
  assertEquals(foundCaseInsensitive.getName(), "User1", "Case-insensitive name search failed");

  // Test non-existent contact
  const notFound = getContactByName(contacts, "NonExistent");
  assertEquals(notFound, null, "Non-existent contact should return null");

  // Test getContactsByLabels
  const friendContacts = getContactsByLabels(contacts, ["Friend"]);
  assertEquals(friendContacts.length, 2, "getContactsByLabels() count failed");
  assertEquals(friendContacts[0].getName(), "User1", "getContactsByLabels() first contact failed");

  // Test multiple labels
  const multiLabelContacts = getContactsByLabels(contacts, ["Friend", "Work"]);
  assertEquals(multiLabelContacts.length, 2, "Multiple labels filter failed");

  // Test getContactsWithMultipleLabels
  const multiLabelContacts2 = getContactsWithMultipleLabels(contacts, 2);
  assertEquals(multiLabelContacts2.length, 1, "getContactsWithMultipleLabels() failed");
  assertEquals(multiLabelContacts2[0].getName(), "User3", "getContactsWithMultipleLabels() contact failed");

  // Test getContactsWithoutLabels
  const noLabelContacts = getContactsWithoutLabels(contacts);
  assertEquals(noLabelContacts.length, 1, "getContactsWithoutLabels() failed");
  assertEquals(noLabelContacts[0].getName(), "User4", "getContactsWithoutLabels() contact failed");

  // Test getContactsByAgeRange
  const currentYear = new Date().getFullYear();
  const ageRangeContacts = getContactsByAgeRange(contacts, 25, 40);
  assertTrue(ageRangeContacts.length > 0, "getContactsByAgeRange() failed");

  // Test empty age range
  const emptyAgeRange = getContactsByAgeRange(contacts, 0, 1);
  assertEquals(emptyAgeRange.length, 0, "Empty age range should return no contacts");

  console.log("Contact filtering tests passed!");
}

// Test date-related functions
function testDateFunctions() {
  console.log("Testing date-related functions...");

  const contacts = [
    new BirthdayContact("User1", new Date(1990, 0, 15), ["Friend"]),
    new BirthdayContact("User2", new Date(1985, 1, 20), ["Family"]),
    new BirthdayContact("User3", new Date(1995, 0, 25), ["Friend"])
  ];

  // Test getContactsByBirthday
  const januaryContacts = getContactsByBirthday(contacts, 15, 0);
  assertEquals(januaryContacts.length, 1, "getContactsByBirthday() count failed");
  assertEquals(januaryContacts[0].getName(), "User1", "getContactsByBirthday() contact failed");

  // Test getUpcomingBirthdays
  const upcomingContacts = getUpcomingBirthdays(contacts, 30);
  assertTrue(upcomingContacts.length > 0, "getUpcomingBirthdays() failed");

  // Test getContactsByBirthdayBetweenDates
  const startDate = new Date(2024, 0, 1);
  const endDate = new Date(2024, 0, 31);
  const januaryBirthdays = getContactsByBirthdayBetweenDates(contacts, startDate, endDate);
  assertEquals(januaryBirthdays.length, 2, "January birthdays count incorrect");

  // Test sorting
  const sorted = sortContactsByBirthdate(contacts);
  assertTrue(sorted.length === contacts.length, "Sorting changed array length");
  assertTrue(
    sorted[0].getBirthday() <= sorted[1].getBirthday(),
    "Contacts not properly sorted by date"
  );

  console.log("Date function tests passed!");
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

  // Test email templates
  const title = "Test Title";
  const subtitle = "Test Subtitle";
  const header = EmailTemplates.header(title, subtitle);
  assertTrue(header.includes(title), "Email header title missing");
  assertTrue(header.includes(subtitle), "Email header subtitle missing");

  const footer = EmailTemplates.footer();
  assertTrue(footer.includes("Birthday Calendar Sync"), "Email footer text missing");

  const content = "<p>Test content</p>";
  const wrappedEmail = EmailTemplates.wrapEmail(content);
  assertTrue(wrappedEmail.includes(content), "Wrapped email content missing");
  assertTrue(wrappedEmail.includes("<style>"), "Email styles missing");

  console.log("EmailManager tests passed!");
}



function testFetch() {
  var contacts = fetchContactsWithBirthdays();
  logContactsNames(contacts);
}

function testSocials() {
  var contacts = fetchContactsWithBirthdays(["👮 Hannover", "📱 Social Media"]);
  logContactsNames(contacts);
  contacts[0].logContactDetails();
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
  logContactsNames(contacts);

  var contacts = fetchContactsWithBirthdays(["🐻 Berlin"]);
  logContactsNames(contacts);
}

function testBirthdayInformation() {
  var contacts = fetchContactsWithBirthdays(["❤️ Gemeinsam", "👮 Hannover"]);
  logContactsNames(contacts);
  contacts[14].logBirthdayInformation();
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
