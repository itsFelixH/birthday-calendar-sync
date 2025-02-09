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

// Example usage:
function testLogging() {
	setLogLevel(LOG_LEVELS.DEBUG); // Set to DEBUG level
	logTrace("This is a trace message."); // Will be logged
	logDebug("This is a debug message."); // Will be logged
	logInfo("This is an info message."); // Will be logged
	logWarning("This is a warning message."); // Will be logged
	logError("This is an error message."); // Will be logged

	setLogLevel(LOG_LEVELS.ERROR); // Set to ERROR level
	logTrace("This is a trace message."); // Will NOT be logged
	logDebug("This is a debug message."); // Will NOT be logged
	logInfo("This is an info message."); // Will NOT be logged
	logWarning("This is a warning message."); // Will NOT be logged
	logError("This is an error message."); // Will be logged

	setLogLevel(LOG_LEVELS.NONE); // Disable all logging
	logInfo("This will not be logged");
}
