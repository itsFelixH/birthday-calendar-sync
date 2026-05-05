/**
 * Fetches all contacts with birthdays from Google Contacts, optionally filtering by labels.
 * @param {string[]} [labelFilter=[]] Array of label names to filter
 * @param {number} [maxRetries=3] Max API retry attempts
 * @returns {BirthdayContact[]} Array of BirthdayContact objects
 */
function fetchContactsWithBirthdays(labelFilter = [], maxRetries = 3) {
  try {
    validateLabelFilter(labelFilter);
    const peopleService = People.People;
    var labelManager = new LabelManager();
    let contacts = [];
    let pageToken = null;
    let attempt = 0;

    if (labelFilter.length < 1) {
      Logger.log(`🔍 Fetching all contacts from Google Contacts...`);
    } else {
      Logger.log(`🔍 Fetching all contacts with any label(s) from '${labelFilter}' from Google Contacts...`);
    }

    do {
      attempt++;
      try {
        const response = peopleService.Connections.list('people/me', {
          pageSize: 100,
          personFields: 'names,birthdays,memberships,emailAddresses,phoneNumbers,addresses,biographies',
          pageToken: pageToken
        });

        const connections = response.connections || [];
        connections.forEach(person => {
          const birthdayData = person.birthdays?.[0]?.date;
          const contactLabels = getContactLabels(person, labelManager);
          const labelMatch = contactMatchesLabelFilter(labelFilter, contactLabels);

          if (labelMatch && birthdayData) {
            const contact = createBirthdayContact(person, birthdayData, contactLabels);
            if (contact) {
              contacts.push(contact);
            }
          }
        });

        pageToken = response.nextPageToken;
        attempt = 0; // Reset retry counter on success
      } catch (error) {
        handleApiError(error, attempt, maxRetries);
      }
    } while (pageToken || (attempt > 0 && attempt <= maxRetries));

    // Sort contacts based on their birthday
    const sortedContacts = sortContactsByBirthdate(contacts);

    Logger.log(`📇 Fetched ${sortedContacts.length} contacts with birthdays!`);
    return sortedContacts;
  } catch (error) {
    Logger.log(`💥 Critical error fetching contacts: ${error.message}`);
    return [];
  }
}


/**
 * Creates BirthdayContact object from API response
 * @param {Object} person - People API person object
 * @param {Object} birthdayData - Birthday date object from API
 * @param {string[]} labelNames - Array of label names
 * @returns {BirthdayContact|null} BirthdayContact instance or null on error
 */
function createBirthdayContact(person, birthdayData, labelNames) {
  try {
    const year = birthdayData.year || new Date().getFullYear();
    const birthday = new Date(year, birthdayData.month - 1, birthdayData.day);

    return new BirthdayContact(
      person.names?.[0]?.displayName || 'Unnamed Contact',
      birthday,
      labelNames,
      person.emailAddresses?.[0]?.value,
      (person.addresses || []).map(address => address.city).filter(Boolean).join(', '),
      person.phoneNumbers?.[0]?.value || '',
      extractInstagramNamesFromNotes((person.biographies || []).map(bio => bio.value).join('. '))
    );
  } catch (error) {
    Logger.log(`⚠️ Error creating contact: ${error.message}`);
    return null;
  }
}


/**
 * Retrieves all contact labels for a person
 * @param {Object} person - People API response object
 * @param {LabelManager} labelManager - Label management instance
 * @returns {string[]} Array of label names
 */
function getContactLabels(person, labelManager) {
  try {
    const memberships = person.memberships || [];
    const labelIds = memberships
      .filter(m => m.contactGroupMembership)
      .map(m => m.contactGroupMembership.contactGroupId);
    const labelNames = labelManager.getLabelNamesByIds(labelIds);

    if (!Array.isArray(labelNames)) {
      return [];
    }

    return labelNames;
  } catch (error) {
    Logger.log(`❌ Error getting labels: ${error.message}`);
    return [];
  }
}


/**
 * Determines if contact matches label filter criteria
 * @param {string[]} labelFilter - Configured label filter
 * @param {string[]} contactLabels - Contact's assigned labels
 * @returns {boolean} Match result
 */
function contactMatchesLabelFilter(labelFilter, contactLabels) {
  try {
    if (labelFilter.length === 0) {
      return true;
    }

    return contactLabels.some(label =>
      labelFilter.includes(label.trim())
    );
  } catch (error) {
    Logger.log(`❌ Label matching failed: ${error.message}`);
    return false;
  }
}


/**
 * Handles API errors with retry logic
 * @param {Error} error - Original error object
 * @param {number} attempt - Current attempt number
 * @param {number} maxRetries - Maximum allowed retries
 * @throws {Error} If retries exhausted
 */
function handleApiError(error, attempt, maxRetries) {
  const retryDelay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;

  Logger.log(`❌ API Error (attempt ${attempt}/${maxRetries}): ${error.message}`);
  Logger.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);

  if (attempt >= maxRetries) {
    Logger.log("💥 Maximum retries exceeded");
    throw error;
  }

  Utilities.sleep(retryDelay);
}


/**
 * Validates label filter configuration
 * @param {Array} labelFilter - Labels to validate
 * @throws {Error} If invalid label format
 */
function validateLabelFilter(labelFilter) {
  if (!Array.isArray(labelFilter)) {
    throw new Error('🔴 Label filter must be an array');
  }

  if (labelFilter.some(label => typeof label !== 'string')) {
    throw new Error('🔴 All labels must be strings');
  }
}
