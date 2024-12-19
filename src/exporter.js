
/**
 * Exports a list of contacts to a specified Google Sheet.
 *
 * @param {BirthdayContact[]} contacts The list of contacts to export.
 * @param {string} spreadsheetId The ID of the Google Sheet.
 * @param {string} sheetName The name of the sheet within the spreadsheet.
 * @returns {void}
 */
function exportContactsToGoogleSheet(contacts, spreadsheetId, sheetName) {
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
  const startRow = sheet.getLastRow() + 1;

  // Prepare data for export
  const data = contacts.map(contact => [
    contact.name,
    contact.getBirthdayLongFormat(),
    contact.labels.join(', '),
    contact.whatsappLink,
    contact.instagramLink,
    contact.getNotes().join('\n')
  ]);

  // Write data to the sheet
  sheet.getRange(startRow, 1, data.length, data[0].length).setValues(data);
};


/**
 * Exports a list of contacts as JSON.
 *
 * @param {BirthdayContact[]} contacts The list of contacts to export.
 * @returns {void}
 */
function exportContactsToJson(contacts) {
  const jsonData = JSON.stringify(contacts.map(contact => ({
    name: contact.name,
    birthday: contact.getBirthdayLongFormat(),
    labels: contact.labels,
    whatsappLink: contact.whatsappLink,
    instagramLink: contact.instagramLink,
    notes: contact.getNotes()
  })));

  const blob = Utilities.newBlob(jsonData, 'application/json');
  const url = blob.getDownloadUrl();

  Logger.log('JSON export URL:', url);
}


/**
 * Exports a list of contacts as CSV.
 *
 * @param {BirthdayContact[]} contacts The list of contacts to export.
 * @returns {void}
 */
function exportContactsToCSV(contacts) {
  const csvContent = [
    ['Name', 'Birthday', 'Labels', 'WhatsApp', 'Instagram', 'Notes'],
    ...contacts.map(contact => [
      contact.name,
      contact.getBirthdayLongFormat(),
      contact.labels.join(', '),
      contact.whatsappLink,
      contact.instagramLink,
      contact.getNotes().join(', ')
    ])
  ];

  const blob = Utilities.newBlob(csvContent.map(row => row.join(',')).join('\n'), 'text/csv');
  const url = blob.getDownloadUrl();

  Logger.log('CSV export URL:', url);
}