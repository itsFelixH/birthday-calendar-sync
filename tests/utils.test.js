// Tests for utility functions

describe('Utility Functions', () => {
  describe('fetchContactsWithBirthdays', () => {
    const mockPeopleService = {
      Connections: {
        list: jest.fn()
      }
    };

    const mockLabelManager = {
      getLabelNamesByIds: jest.fn()
    };

    beforeEach(() => {
      // Mock global objects
      global.People = { People: mockPeopleService };
      global.Logger = { log: jest.fn() };

      // Reset mocks
      jest.clearAllMocks();
    });

    it('should fetch and process contacts correctly', () => {
      const mockResponse = {
        connections: [
          {
            names: [{ displayName: 'John Doe' }],
            birthdays: [{ date: { year: 1990, month: 1, day: 15 } }],
            memberships: [{ contactGroupMembership: { contactGroupId: '123' } }]
          }
        ]
      };

      mockPeopleService.Connections.list.mockReturnValue(mockResponse);
      mockLabelManager.getLabelNamesByIds.mockReturnValue(['Friends']);

      const contacts = fetchContactsWithBirthdays();
      expect(contacts).toHaveLength(1);
      expect(contacts[0].name).toBe('John Doe');
    });

    it('should handle API errors with retry', () => {
      let attempts = 0;
      mockPeopleService.Connections.list.mockImplementation(() => {
        attempts++;
        if (attempts < 2) throw new Error('API Error');
        return { connections: [] };
      });

      fetchContactsWithBirthdays();
      expect(mockPeopleService.Connections.list).toHaveBeenCalledTimes(2);
    });

    it('should filter contacts by labels', () => {
      const mockResponse = {
        connections: [
          {
            names: [{ displayName: 'John Doe' }],
            birthdays: [{ date: { year: 1990, month: 1, day: 15 } }],
            memberships: [{ contactGroupMembership: { contactGroupId: '123' } }]
          },
          {
            names: [{ displayName: 'Jane Smith' }],
            birthdays: [{ date: { year: 1985, month: 6, day: 20 } }],
            memberships: [{ contactGroupMembership: { contactGroupId: '456' } }]
          }
        ]
      };

      mockPeopleService.Connections.list.mockReturnValue(mockResponse);
      mockLabelManager.getLabelNamesByIds
        .mockReturnValueOnce(['Friends'])
        .mockReturnValueOnce(['Family']);

      const contacts = fetchContactsWithBirthdays(['Friends']);
      expect(contacts).toHaveLength(1);
      expect(contacts[0].name).toBe('John Doe');
    });
  });

  describe('hasChanges', () => {
    it('should return true when there are changes', () => {
      const changes = {
        individual: { created: ['event1'], updated: [] },
        summary: { created: [], updated: [] }
      };
      expect(hasChanges(changes)).toBe(true);
    });

    it('should return false when there are no changes', () => {
      const changes = {
        individual: { created: [], updated: [] },
        summary: { created: [], updated: [] }
      };
      expect(hasChanges(changes)).toBe(false);
    });
  });

  describe('createBirthdayContact', () => {
    it('should create contact from API response', () => {
      const person = {
        names: [{ displayName: 'John Doe' }],
        emailAddresses: [{ value: 'john@example.com' }],
        addresses: [{ city: 'Berlin' }],
        phoneNumbers: [{ value: '+1234567890' }],
        biographies: [{ value: 'Instagram: @johndoe' }]
      };

      const birthdayData = { year: 1990, month: 1, day: 15 };
      const labelNames = ['Friends'];

      const contact = createBirthdayContact(person, birthdayData, labelNames);
      expect(contact.name).toBe('John Doe');
      expect(contact.email).toBe('john@example.com');
      expect(contact.city).toBe('Berlin');
      expect(contact.phoneNumber).toBe('+1234567890');
      expect(contact.instagramNames).toContain('@johndoe');
    });

    it('should handle missing optional fields', () => {
      const person = {
        names: [{ displayName: 'John Doe' }]
      };

      const birthdayData = { year: 1990, month: 1, day: 15 };
      const labelNames = [];

      const contact = createBirthdayContact(person, birthdayData, labelNames);
      expect(contact.name).toBe('John Doe');
      expect(contact.email).toBe('');
      expect(contact.city).toBe('');
      expect(contact.phoneNumber).toBe('');
      expect(contact.instagramNames).toEqual([]);
    });
  });

  describe('getContactLabels', () => {
    const mockLabelManager = {
      getLabelNamesByIds: jest.fn()
    };

    it('should extract labels from person object', () => {
      const person = {
        memberships: [
          { contactGroupMembership: { contactGroupId: '123' } },
          { contactGroupMembership: { contactGroupId: '456' } }
        ]
      };

      mockLabelManager.getLabelNamesByIds.mockReturnValue(['Friends', 'Family']);
      const labels = getContactLabels(person, mockLabelManager);
      expect(labels).toEqual(['Friends', 'Family']);
    });

    it('should handle missing memberships', () => {
      const person = {};
      const labels = getContactLabels(person, mockLabelManager);
      expect(labels).toEqual([]);
    });
  });

  describe('contactMatchesLabelFilter', () => {
    it('should return true when no filter is provided', () => {
      expect(contactMatchesLabelFilter([], ['Friends'])).toBe(true);
    });

    it('should return true when contact has matching label', () => {
      expect(contactMatchesLabelFilter(['Friends'], ['Friends', 'Family'])).toBe(true);
    });

    it('should return false when contact has no matching labels', () => {
      expect(contactMatchesLabelFilter(['Work'], ['Friends', 'Family'])).toBe(false);
    });
  });

  describe('extractInstagramNamesFromNotes', () => {
    it('should extract single Instagram username', () => {
      const notes = 'Instagram: @johndoe';
      expect(extractInstagramNamesFromNotes(notes)).toEqual(['@johndoe']);
    });

    it('should extract multiple Instagram usernames', () => {
      const notes = 'Instagram: @johndoe, @janedoe';
      expect(extractInstagramNamesFromNotes(notes)).toContain('@johndoe');
      expect(extractInstagramNamesFromNotes(notes)).toContain('@janedoe');
    });

    it('should handle usernames without @ symbol', () => {
      const notes = 'Instagram: johndoe';
      expect(extractInstagramNamesFromNotes(notes)).toEqual(['@johndoe']);
    });

    it('should return empty array for invalid input', () => {
      expect(extractInstagramNamesFromNotes('')).toEqual([]);
      expect(extractInstagramNamesFromNotes(null)).toEqual([]);
      expect(extractInstagramNamesFromNotes(undefined)).toEqual([]);
    });
  });

  describe('getNextMonth', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date(2024, 0, 15)); // January 15, 2024
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return first day of next month', () => {
      const nextMonth = getNextMonth();
      expect(nextMonth.getFullYear()).toBe(2024);
      expect(nextMonth.getMonth()).toBe(1); // February
      expect(nextMonth.getDate()).toBe(1);
    });

    it('should handle year transition', () => {
      jest.setSystemTime(new Date(2024, 11, 15)); // December 15, 2024
      const nextMonth = getNextMonth();
      expect(nextMonth.getFullYear()).toBe(2025);
      expect(nextMonth.getMonth()).toBe(0); // January
      expect(nextMonth.getDate()).toBe(1);
    });
  });
});