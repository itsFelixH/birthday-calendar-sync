/**
 * Fetches all contacts with birthdays from Google Contacts.
 * @param {string[]|number} [labelFilter=[]] Optional array of label names to filter, or maxRetries if number
 * @param {number} [maxRetries=3] Max API retry attempts
 * @returns {BirthdayContact[]} Array of BirthdayContact objects
 */
function fetchContactsWithBirthdays(labelFilter = [], maxRetries = 3) {
  if (typeof labelFilter === 'number') {
    maxRetries = labelFilter;
    labelFilter = [];
  }
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
          personFields: 'names,birthdays,memberships,emailAddresses,phoneNumbers,addresses,biographies,events,urls',
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

    // Extract death date from contact events (custom date labeled "gestorben")
    const deathDate = extractDeathDate(person.events);

    // Extract notes and urls for Instagram/Messenger extraction
    const notes = (person.biographies || []).map(bio => bio.value).join('. ');
    const urls = person.urls || [];

    // Merge Instagram names from both notes and website URLs
    const instagramFromNotes = extractInstagramNamesFromNotes(notes);
    const instagramFromUrls = extractInstagramNamesFromUrls(urls);
    const instagramNames = [...instagramFromNotes];
    instagramFromUrls.forEach(name => {
      if (!instagramNames.includes(name)) instagramNames.push(name);
    });

    return new BirthdayContact(
      person.names?.[0]?.displayName || 'Unnamed Contact',
      birthday,
      labelNames,
      person.emailAddresses?.[0]?.value,
      (person.addresses || []).map(address => address.city).filter(Boolean).join(', '),
      person.phoneNumbers?.[0]?.value || '',
      instagramNames,
      deathDate,
      person.resourceName || '',
      notes,
      urls
    );
  } catch (error) {
    Logger.log(`⚠️ Error creating contact: ${error.message}`);
    return null;
  }
}


/**
 * Extracts the death date from a contact's events array.
 * Looks for an event with type/formattedType matching the configured deceasedDateLabel (case-insensitive).
 * @param {Object[]} events - Array of event objects from People API
 * @returns {Date|null} The death date, or null if not found
 */
function extractDeathDate(events) {
  if (!events || events.length === 0) return null;

  const dateLabel = (typeof deceasedDateLabel !== 'undefined' ? deceasedDateLabel : 'gestorben').toLowerCase();

  const deathEvent = events.find(event => {
    const type = (event.formattedType || event.type || '').toLowerCase();
    return type === dateLabel;
  });

  if (deathEvent && deathEvent.date) {
    const d = deathEvent.date;
    return new Date(d.year || new Date().getFullYear(), (d.month || 1) - 1, d.day || 1);
  }

  return null;
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
    if (!labelFilter || labelFilter.length === 0) {
      return true;
    }

    if (!Array.isArray(contactLabels)) {
      return false;
    }

    const normalizedFilter = labelFilter.map(l => (typeof l === 'string' ? l.trim().toLowerCase() : ''));
    return contactLabels.some(label => {
      const normalizedLabel = typeof label === 'string' ? label.trim().toLowerCase() : '';
      return normalizedFilter.includes(normalizedLabel);
    });
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


/**
 * Evaluates whether a contact is allowed based on whitelist and blacklist filter criteria.
 * Supports includeLabels, excludeLabels, includeNames, and excludeNames.
 *
 * @param {BirthdayContact} contact - The contact to evaluate
 * @param {Object|string[]} [filterConfig] - Filter configuration object or shorthand array of label names
 * @returns {boolean} true if contact is allowed/matches criteria, false otherwise
 */
function isContactAllowed(contact, filterConfig) {
  if (!contact) return false;
  if (!filterConfig) return true;

  let includeLabels = [];
  let excludeLabels = [];
  let includeNames = [];
  let excludeNames = [];

  if (Array.isArray(filterConfig)) {
    includeLabels = filterConfig;
  } else if (typeof filterConfig === 'object') {
    includeLabels = Array.isArray(filterConfig.includeLabels) ? filterConfig.includeLabels : [];
    excludeLabels = Array.isArray(filterConfig.excludeLabels) ? filterConfig.excludeLabels : [];
    includeNames = Array.isArray(filterConfig.includeNames) ? filterConfig.includeNames : [];
    excludeNames = Array.isArray(filterConfig.excludeNames) ? filterConfig.excludeNames : [];
  } else {
    return true;
  }

  const contactLabels = (contact.labels || []).map(l => (typeof l === 'string' ? l.trim().toLowerCase() : ''));
  const contactName = (contact.name || '').trim().toLowerCase();

  // 1. Blacklist check: exclude if any excludeLabels match
  if (excludeLabels.length > 0) {
    const normExcludeLabels = excludeLabels.map(l => (typeof l === 'string' ? l.trim().toLowerCase() : ''));
    const matchesExcludeLabel = contactLabels.some(label => normExcludeLabels.includes(label));
    if (matchesExcludeLabel) return false;
  }

  // 2. Blacklist check: exclude if any excludeNames match
  if (excludeNames.length > 0) {
    const normExcludeNames = excludeNames.map(n => (typeof n === 'string' ? n.trim().toLowerCase() : ''));
    const matchesExcludeName = normExcludeNames.some(n => n && (contactName === n || contactName.includes(n)));
    if (matchesExcludeName) return false;
  }

  // 3. Whitelist check: if neither includeLabels nor includeNames are specified, allowed
  const hasIncludeLabels = includeLabels.length > 0;
  const hasIncludeNames = includeNames.length > 0;

  if (!hasIncludeLabels && !hasIncludeNames) {
    return true;
  }

  // 4. Whitelist matching: allowed if matches includeLabels OR matches includeNames
  let matchesInclude = false;

  if (hasIncludeLabels) {
    const normIncludeLabels = includeLabels.map(l => (typeof l === 'string' ? l.trim().toLowerCase() : ''));
    if (contactLabels.some(label => normIncludeLabels.includes(label))) {
      matchesInclude = true;
    }
  }

  if (hasIncludeNames && !matchesInclude) {
    const normIncludeNames = includeNames.map(n => (typeof n === 'string' ? n.trim().toLowerCase() : ''));
    if (normIncludeNames.some(n => n && (contactName === n || contactName.includes(n)))) {
      matchesInclude = true;
    }
  }

  return matchesInclude;
}


/**
 * Filters a list of contacts for a specific feature using contactFilters configuration.
 *
 * @param {BirthdayContact[]} contacts - Array of contacts to filter
 * @param {string} featureKey - Key in contactFilters (e.g. 'individualEvents', 'summaryEvents', 'monthlyEmail', 'weeklyEmail')
 * @returns {BirthdayContact[]} Filtered array of contacts
 */
function filterContactsForFeature(contacts, featureKey) {
  if (!Array.isArray(contacts) || contacts.length === 0) return [];
  if (typeof contactFilters === 'undefined' || !contactFilters || !contactFilters[featureKey]) {
    return contacts;
  }

  const featureFilter = contactFilters[featureKey];
  return contacts.filter(contact => isContactAllowed(contact, featureFilter));
}
