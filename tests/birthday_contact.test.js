// Tests for BirthdayContact class

describe('BirthdayContact', () => {
  let contact;
  const testName = 'John Doe';
  const testBirthday = new Date(1990, 0, 15); // January 15, 1990
  const testLabels = ['Friend', 'Work'];
  const testEmail = 'john@example.com';
  const testCity = 'Berlin';
  const testPhone = '+1234567890';
  const testInstagram = ['@johndoe', '@john.doe'];

  beforeEach(() => {
    contact = new BirthdayContact(
      testName,
      testBirthday,
      testLabels,
      testEmail,
      testCity,
      testPhone,
      testInstagram
    );
  });

  describe('constructor', () => {
    it('should create a contact with all properties', () => {
      expect(contact.name).toBe(testName);
      expect(contact.birthday).toEqual(testBirthday);
      expect(contact.labels).toEqual(testLabels);
      expect(contact.email).toBe(testEmail);
      expect(contact.city).toBe(testCity);
      expect(contact.phoneNumber).toBe(testPhone);
      expect(contact.instagramNames).toEqual(testInstagram);
    });

    it('should throw error if name is missing', () => {
      expect(() => new BirthdayContact(null, testBirthday)).toThrow('Name and birthday are required.');
    });

    it('should throw error if birthday is missing', () => {
      expect(() => new BirthdayContact(testName, null)).toThrow('Name and birthday are required.');
    });

    it('should handle empty optional parameters', () => {
      const basicContact = new BirthdayContact(testName, testBirthday);
      expect(basicContact.labels).toEqual([]);
      expect(basicContact.email).toBe('');
      expect(basicContact.city).toBe('');
      expect(basicContact.phoneNumber).toBe('');
      expect(basicContact.instagramNames).toEqual([]);
    });
  });

  describe('getters', () => {
    it('getName should return contact name', () => {
      expect(contact.getName()).toBe(testName);
    });

    it('getBirthday should return birthday date', () => {
      expect(contact.getBirthday()).toEqual(testBirthday);
    });

    it('getLabels should return labels array', () => {
      expect(contact.getLabels()).toEqual(testLabels);
    });
  });

  describe('birthday formatting', () => {
    it('getBirthdayShortFormat should return dd.MM.', () => {
      // Mock Utilities.formatDate
      global.Utilities = {
        formatDate: jest.fn().mockReturnValue('15.01.')
      };
      global.Session = {
        getScriptTimeZone: jest.fn().mockReturnValue('UTC')
      };

      expect(contact.getBirthdayShortFormat()).toBe('15.01.');
    });

    it('getBirthdayLongFormat should include year if not current year', () => {
      // Mock Utilities.formatDate
      global.Utilities = {
        formatDate: jest.fn().mockReturnValue('15.01.1990')
      };
      global.Session = {
        getScriptTimeZone: jest.fn().mockReturnValue('UTC')
      };

      expect(contact.getBirthdayLongFormat()).toBe('15.01.1990');
    });
  });

  describe('age calculations', () => {
    beforeEach(() => {
      // Mock current date to 2024-01-15
      jest.useFakeTimers().setSystemTime(new Date(2024, 0, 15));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('calculateAge should return correct age', () => {
      expect(contact.calculateAge()).toBe(34);
    });

    it('getAgeThisYear should return age in current year', () => {
      expect(contact.getAgeThisYear()).toBe(34);
    });
  });

  describe('birthday checks', () => {
    beforeEach(() => {
      // Mock current date to 2024-01-15
      jest.useFakeTimers().setSystemTime(new Date(2024, 0, 15));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('isBirthdayToday should return true on birthday', () => {
      expect(contact.isBirthdayToday()).toBe(true);
    });

    it('isBirthdayThisMonth should return true in birth month', () => {
      expect(contact.isBirthdayThisMonth()).toBe(true);
    });

    it('wasBirthdayThisYear should return false before birthday', () => {
      jest.setSystemTime(new Date(2024, 0, 14));
      expect(contact.wasBirthdayThisYear()).toBe(false);
    });
  });

  describe('social media links', () => {
    it('getWhatsAppLink should return correct WhatsApp link', () => {
      expect(contact.getWhatsAppLink()).toBe('https://wa.me/1234567890');
    });

    it('getInstagramLink should return correct Instagram link', () => {
      expect(contact.getInstagramLink('@johndoe')).toBe('https://www.instagram.com/johndoe/');
    });

    it('getAllInstagramLinks should return all Instagram links', () => {
      const expected = [
        'https://www.instagram.com/johndoe/',
        'https://www.instagram.com/john.doe/'
      ];
      expect(contact.getAllInstagramLinks()).toEqual(expected);
    });

    it('getMessengerLink should return correct Messenger link', () => {
      expect(contact.getMessengerLink('fbuser')).toBe('https://m.me/fbuser');
    });

    it('getMessengerLink should return empty string for empty input', () => {
      expect(contact.getMessengerLink('')).toBe('');
      expect(contact.getMessengerLink(null)).toBe('');
      expect(contact.getMessengerLink(undefined)).toBe('');
    });

    it('getAllMessengerLinks should return all Messenger links', () => {
      const contactWithMessenger = new BirthdayContact(
        testName, testBirthday, [], '', '', '', [], null, '', 'FB: user1\nMessenger: user2', []
      );
      const links = contactWithMessenger.getAllMessengerLinks();
      expect(links).toContain('https://m.me/user1');
      expect(links).toContain('https://m.me/user2');
    });
  });

  describe('messenger extraction in constructor', () => {
    it('should extract messengerNames from notes', () => {
      const contactWithNotes = new BirthdayContact(
        testName, testBirthday, [], '', '', '', [], null, '', 'FB: myuser', []
      );
      expect(contactWithNotes.messengerNames).toEqual(['myuser']);
    });

    it('should extract messengerNames from urls', () => {
      const urls = [{ value: 'https://m.me/urluser' }];
      const contactWithUrls = new BirthdayContact(
        testName, testBirthday, [], '', '', '', [], null, '', '', urls
      );
      expect(contactWithUrls.messengerNames).toEqual(['urluser']);
    });

    it('should have empty messengerNames when no messenger data', () => {
      const basicContact = new BirthdayContact(testName, testBirthday);
      expect(basicContact.messengerNames).toEqual([]);
    });
  });

  describe('getContactLink', () => {
    it('should return correct Google Contacts URL when resourceName is set', () => {
      const contactWithResource = new BirthdayContact(
        testName, testBirthday, testLabels, testEmail, testCity, testPhone, testInstagram, null, 'people/c12345678'
      );
      expect(contactWithResource.getContactLink()).toBe('https://contacts.google.com/person/c12345678');
    });

    it('should return empty string when resourceName is not set', () => {
      expect(contact.getContactLink()).toBe('');
    });

    it('should handle resourceName without people/ prefix gracefully', () => {
      const contactWithResource = new BirthdayContact(
        testName, testBirthday, [], '', '', '', [], null, 'c99999'
      );
      expect(contactWithResource.getContactLink()).toBe('https://contacts.google.com/person/c99999');
    });
  });

  describe('resourceName constructor parameter', () => {
    it('should store resourceName when provided', () => {
      const contactWithResource = new BirthdayContact(
        testName, testBirthday, [], '', '', '', [], null, 'people/c12345'
      );
      expect(contactWithResource.resourceName).toBe('people/c12345');
    });

    it('should default to empty string when not provided', () => {
      const basicContact = new BirthdayContact(testName, testBirthday);
      expect(basicContact.resourceName).toBe('');
    });
  });

  describe('getBirthdayEventString', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date(2024, 0, 15));
      global.Utilities = {
        formatDate: jest.fn((date, tz, format) => {
          if (format === 'dd.MM.') return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.`;
          if (format === 'dd.MM.yyyy') return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
          return '';
        })
      };
      global.Session = { getScriptTimeZone: jest.fn().mockReturnValue('UTC') };
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should include age when ageOverride is provided', () => {
      const result = contact.getBirthdayEventString(34);
      expect(result).toContain('wird 34');
      expect(result).toContain('Geburtstag: 15.01.1990');
    });

    it('should use getAgeThisYear when no ageOverride', () => {
      const result = contact.getBirthdayEventString();
      expect(result).toContain('wird 34');
    });

    it('should omit age line when ageOverride is null (recurring mode)', () => {
      const result = contact.getBirthdayEventString(null);
      expect(result).not.toContain('wird');
      expect(result).not.toContain('hat heute Geburtstag');
      expect(result).toContain('Geburtstag: 15.01.1990');
    });

    it('should include contact link when resourceName is set', () => {
      const contactWithResource = new BirthdayContact(
        testName, testBirthday, [], '', '', '', [], null, 'people/c555'
      );
      const result = contactWithResource.getBirthdayEventString(34);
      expect(result).toContain('── Kontakt ──');
      expect(result).toContain('Kontakt: https://contacts.google.com/person/c555');
    });

    it('should not include contact link when resourceName is empty', () => {
      const contactNoLinks = new BirthdayContact(testName, testBirthday, [], '', '', '');
      const result = contactNoLinks.getBirthdayEventString(34);
      expect(result).not.toContain('Kontakt:');
    });

    it('should include city in info section when set', () => {
      const result = contact.getBirthdayEventString(34);
      expect(result).toContain('── Info ──');
      expect(result).toContain('📍 Berlin');
    });

    it('should not include info section when no city and no labels', () => {
      const contactNoInfo = new BirthdayContact(testName, testBirthday, [], '', '', testPhone);
      const result = contactNoInfo.getBirthdayEventString(34);
      expect(result).not.toContain('── Info ──');
    });

    it('should include labels in info section', () => {
      const result = contact.getBirthdayEventString(34);
      expect(result).toContain('Friend,Work');
    });
  });
});

// Tests for utility functions
describe('Contact Utility Functions', () => {
  const contacts = [
    new BirthdayContact('John Doe', new Date(1990, 0, 15)),
    new BirthdayContact('Jane Smith', new Date(1985, 5, 20)),
    new BirthdayContact('Bob Wilson', new Date(1995, 11, 31))
  ];

  describe('getContactByName', () => {
    it('should find contact by exact name', () => {
      const result = getContactByName(contacts, 'John Doe');
      expect(result.getName()).toBe('John Doe');
    });

    it('should find contact case insensitive', () => {
      const result = getContactByName(contacts, 'john doe');
      expect(result.getName()).toBe('John Doe');
    });

    it('should return null for non-existent contact', () => {
      const result = getContactByName(contacts, 'Not Exists');
      expect(result).toBeNull();
    });
  });

  describe('getContactsWithBirthdaysThisMonth', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date(2024, 0, 1));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return contacts with birthdays in current month', () => {
      const result = getContactsWithBirthdaysThisMonth(contacts);
      expect(result.length).toBe(1);
      expect(result[0].getName()).toBe('John Doe');
    });
  });

  describe('sortContactsByBirthdate', () => {
    it('should sort contacts by birth month and day', () => {
      const sorted = sortContactsByBirthdate(contacts);
      expect(sorted[0].getName()).toBe('John Doe'); // January
      expect(sorted[1].getName()).toBe('Jane Smith'); // June
      expect(sorted[2].getName()).toBe('Bob Wilson'); // December
    });
  });
});