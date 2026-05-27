// Tests for contact_manager.js

describe('Contact Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.Logger = { log: jest.fn() };
    global.Utilities = { ...global.Utilities, sleep: jest.fn() };
    global.deceasedDateLabel = 'Death date';

    global.People = {
      People: {
        Connections: {
          list: jest.fn()
        }
      },
      ContactGroups: {
        list: jest.fn().mockReturnValue({ contactGroups: [] }),
        batchGet: jest.fn().mockReturnValue({ responses: [] })
      }
    };
  });

  describe('fetchContactsWithBirthdays', () => {
    it('should return empty array when no connections exist', () => {
      People.People.Connections.list.mockReturnValue({ connections: [] });
      const result = fetchContactsWithBirthdays();
      expect(result).toEqual([]);
    });

    it('should fetch contacts with birthdays', () => {
      People.People.Connections.list.mockReturnValue({
        connections: [{
          names: [{ displayName: 'Test Person' }],
          birthdays: [{ date: { year: 1990, month: 3, day: 15 } }],
          memberships: []
        }]
      });

      const result = fetchContactsWithBirthdays();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Person');
    });

    it('should skip contacts without birthdays', () => {
      People.People.Connections.list.mockReturnValue({
        connections: [
          {
            names: [{ displayName: 'Has Birthday' }],
            birthdays: [{ date: { year: 1990, month: 1, day: 1 } }],
            memberships: []
          },
          {
            names: [{ displayName: 'No Birthday' }],
            memberships: []
          }
        ]
      });

      const result = fetchContactsWithBirthdays();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Has Birthday');
    });

    it('should filter contacts by label', () => {
      People.People.Connections.list.mockReturnValue({
        connections: [
          {
            names: [{ displayName: 'Friend' }],
            birthdays: [{ date: { year: 1990, month: 1, day: 1 } }],
            memberships: [{ contactGroupMembership: { contactGroupId: 'friends-id' } }]
          },
          {
            names: [{ displayName: 'Colleague' }],
            birthdays: [{ date: { year: 1985, month: 6, day: 20 } }],
            memberships: [{ contactGroupMembership: { contactGroupId: 'work-id' } }]
          }
        ]
      });

      // Mock LabelManager to return label names
      global.LabelManager = jest.fn().mockImplementation(() => ({
        getLabelNamesByIds: jest.fn((ids) => {
          if (ids.includes('friends-id')) return ['Friends'];
          if (ids.includes('work-id')) return ['Work'];
          return [];
        })
      }));

      const result = fetchContactsWithBirthdays(['Friends']);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Friend');
    });

    it('should handle pagination', () => {
      People.People.Connections.list
        .mockReturnValueOnce({
          connections: [{
            names: [{ displayName: 'Page 1' }],
            birthdays: [{ date: { year: 1990, month: 1, day: 1 } }],
            memberships: []
          }],
          nextPageToken: 'token123'
        })
        .mockReturnValueOnce({
          connections: [{
            names: [{ displayName: 'Page 2' }],
            birthdays: [{ date: { year: 1985, month: 6, day: 15 } }],
            memberships: []
          }]
        });

      const result = fetchContactsWithBirthdays();
      expect(result).toHaveLength(2);
      expect(People.People.Connections.list).toHaveBeenCalledTimes(2);
    });

    it('should sort contacts by birthday', () => {
      People.People.Connections.list.mockReturnValue({
        connections: [
          {
            names: [{ displayName: 'December' }],
            birthdays: [{ date: { year: 1990, month: 12, day: 25 } }],
            memberships: []
          },
          {
            names: [{ displayName: 'January' }],
            birthdays: [{ date: { year: 1985, month: 1, day: 5 } }],
            memberships: []
          },
          {
            names: [{ displayName: 'June' }],
            birthdays: [{ date: { year: 1992, month: 6, day: 15 } }],
            memberships: []
          }
        ]
      });

      const result = fetchContactsWithBirthdays();
      expect(result[0].name).toBe('January');
      expect(result[1].name).toBe('June');
      expect(result[2].name).toBe('December');
    });

    it('should return empty array on critical error', () => {
      People.People.Connections.list.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      const result = fetchContactsWithBirthdays([], 1);
      expect(result).toEqual([]);
      expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('error'));
    });
  });

  describe('createBirthdayContact', () => {
    it('should create a BirthdayContact from API data', () => {
      const person = {
        names: [{ displayName: 'Test User' }],
        emailAddresses: [{ value: 'test@example.com' }],
        phoneNumbers: [{ value: '+49123456' }],
        addresses: [{ city: 'Berlin' }],
        biographies: [],
        resourceName: 'people/abc123'
      };
      const birthdayData = { year: 1990, month: 3, day: 15 };

      const result = createBirthdayContact(person, birthdayData, ['Friends']);
      expect(result.name).toBe('Test User');
      expect(result.email).toBe('test@example.com');
      expect(result.city).toBe('Berlin');
      expect(result.birthday.getMonth()).toBe(2); // March = 2
      expect(result.birthday.getDate()).toBe(15);
    });

    it('should handle missing optional fields', () => {
      const person = {
        names: [{ displayName: 'Minimal' }],
        resourceName: 'people/min'
      };
      const birthdayData = { year: 1995, month: 7, day: 1 };

      const result = createBirthdayContact(person, birthdayData, []);
      expect(result.name).toBe('Minimal');
      expect(result.email).toBeFalsy();
    });

    it('should use current year when birth year is missing', () => {
      const person = {
        names: [{ displayName: 'No Year' }],
        resourceName: 'people/ny'
      };
      const birthdayData = { month: 5, day: 20 }; // no year

      const result = createBirthdayContact(person, birthdayData, []);
      expect(result.birthday.getFullYear()).toBe(new Date().getFullYear());
    });

    it('should return null on error', () => {
      const result = createBirthdayContact(null, null, []);
      expect(result).toBeNull();
    });
  });

  describe('extractDeathDate', () => {
    it('should return null for empty events', () => {
      expect(extractDeathDate(null)).toBeNull();
      expect(extractDeathDate([])).toBeNull();
    });

    it('should extract death date from matching event', () => {
      const events = [{
        formattedType: 'Death date',
        date: { year: 2020, month: 6, day: 15 }
      }];

      const result = extractDeathDate(events);
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2020);
      expect(result.getMonth()).toBe(5); // June = 5
      expect(result.getDate()).toBe(15);
    });

    it('should match case-insensitively', () => {
      const events = [{
        formattedType: 'DEATH DATE',
        date: { year: 2019, month: 3, day: 1 }
      }];

      const result = extractDeathDate(events);
      expect(result).not.toBeNull();
      expect(result.getFullYear()).toBe(2019);
    });

    it('should return null when no matching event type', () => {
      const events = [{
        formattedType: 'Anniversary',
        date: { year: 2015, month: 8, day: 10 }
      }];

      const result = extractDeathDate(events);
      expect(result).toBeNull();
    });
  });

  describe('contactMatchesLabelFilter', () => {
    it('should return true when filter is empty', () => {
      expect(contactMatchesLabelFilter([], ['Friends', 'Family'])).toBe(true);
    });

    it('should return true when contact has matching label', () => {
      expect(contactMatchesLabelFilter(['Friends'], ['Friends', 'Family'])).toBe(true);
    });

    it('should return false when contact has no matching label', () => {
      expect(contactMatchesLabelFilter(['Work'], ['Friends', 'Family'])).toBe(false);
    });

    it('should handle empty contact labels', () => {
      expect(contactMatchesLabelFilter(['Friends'], [])).toBe(false);
    });
  });

  describe('validateLabelFilter', () => {
    it('should not throw for valid array of strings', () => {
      expect(() => validateLabelFilter(['Friends', 'Family'])).not.toThrow();
    });

    it('should not throw for empty array', () => {
      expect(() => validateLabelFilter([])).not.toThrow();
    });

    it('should throw for non-array', () => {
      expect(() => validateLabelFilter('Friends')).toThrow('must be an array');
    });

    it('should throw for array with non-string elements', () => {
      expect(() => validateLabelFilter(['Friends', 123])).toThrow('must be strings');
    });
  });

  describe('handleApiError', () => {
    it('should throw when max retries exceeded', () => {
      const error = new Error('Rate limit');
      expect(() => handleApiError(error, 3, 3)).toThrow('Rate limit');
    });

    it('should sleep with exponential backoff', () => {
      const error = new Error('Temporary');
      try {
        handleApiError(error, 1, 3);
      } catch (e) {
        // won't throw since attempt < maxRetries
      }
      expect(Utilities.sleep).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should log the error', () => {
      const error = new Error('API Error');
      try {
        handleApiError(error, 1, 3);
      } catch (e) {}
      expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('API Error'));
    });
  });
});
