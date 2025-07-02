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