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
      // Reset mocks
      jest.clearAllMocks();

      // Mock global objects
      global.People = {
        People: mockPeopleService,
        ContactGroups: {
          list: jest.fn().mockReturnValue({ contactGroups: [] }),
          batchGet: jest.fn().mockReturnValue({ responses: [] })
        }
      };
      global.Logger = { log: jest.fn() };
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

      // Mock ContactGroups to return label data that LabelManager will use
      global.People.ContactGroups.list.mockReturnValue({
        contactGroups: [
          { resourceName: 'contactGroups/123' },
          { resourceName: 'contactGroups/456' }
        ]
      });
      global.People.ContactGroups.batchGet.mockReturnValue({
        responses: [
          { contactGroup: { resourceName: 'contactGroups/123', name: 'Friends' } },
          { contactGroup: { resourceName: 'contactGroups/456', name: 'Family' } }
        ]
      });

      mockPeopleService.Connections.list.mockReturnValue(mockResponse);

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

    beforeEach(() => {
      mockLabelManager.getLabelNamesByIds.mockReset();
    });

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
      mockLabelManager.getLabelNamesByIds.mockReturnValue([]);
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

    it('should not extract @username preceded by FB:', () => {
      const notes = 'FB: @fbuser';
      expect(extractInstagramNamesFromNotes(notes)).toEqual([]);
    });

    it('should not extract @username preceded by Messenger:', () => {
      const notes = 'Messenger: @msguser';
      expect(extractInstagramNamesFromNotes(notes)).toEqual([]);
    });

    it('should not extract @username preceded by Facebook:', () => {
      const notes = 'Facebook: @someone';
      expect(extractInstagramNamesFromNotes(notes)).toEqual([]);
    });

    it('should extract Instagram but skip FB usernames in mixed notes', () => {
      const notes = 'FB: @fbuser\n@realinsta';
      const result = extractInstagramNamesFromNotes(notes);
      expect(result).toContain('@realinsta');
      expect(result).not.toContain('@fbuser');
    });
  });

  describe('extractInstagramNamesFromUrls', () => {
    it('should extract username from Instagram URL', () => {
      const urls = [{ value: 'https://www.instagram.com/johndoe' }];
      expect(extractInstagramNamesFromUrls(urls)).toEqual(['@johndoe']);
    });

    it('should extract username without www', () => {
      const urls = [{ value: 'https://instagram.com/janedoe' }];
      expect(extractInstagramNamesFromUrls(urls)).toEqual(['@janedoe']);
    });

    it('should extract multiple usernames', () => {
      const urls = [
        { value: 'https://instagram.com/user1' },
        { value: 'https://www.instagram.com/user2' }
      ];
      const result = extractInstagramNamesFromUrls(urls);
      expect(result).toContain('@user1');
      expect(result).toContain('@user2');
    });

    it('should deduplicate usernames', () => {
      const urls = [
        { value: 'https://instagram.com/same' },
        { value: 'https://www.instagram.com/same' }
      ];
      expect(extractInstagramNamesFromUrls(urls)).toEqual(['@same']);
    });

    it('should ignore non-Instagram URLs', () => {
      const urls = [
        { value: 'https://facebook.com/someone' },
        { value: 'https://twitter.com/someone' }
      ];
      expect(extractInstagramNamesFromUrls(urls)).toEqual([]);
    });

    it('should return empty array for null or invalid input', () => {
      expect(extractInstagramNamesFromUrls(null)).toEqual([]);
      expect(extractInstagramNamesFromUrls(undefined)).toEqual([]);
      expect(extractInstagramNamesFromUrls([])).toEqual([]);
    });

    it('should handle URL objects with missing value', () => {
      const urls = [{ type: 'profile' }];
      expect(extractInstagramNamesFromUrls(urls)).toEqual([]);
    });
  });

  describe('extractMessengerNames', () => {
    describe('from notes', () => {
      it('should extract FB: username', () => {
        expect(extractMessengerNames('FB: johndoe', [])).toEqual(['johndoe']);
      });

      it('should extract Messenger: username', () => {
        expect(extractMessengerNames('Messenger: janedoe', [])).toEqual(['janedoe']);
      });

      it('should extract Facebook: username', () => {
        expect(extractMessengerNames('Facebook: someone', [])).toEqual(['someone']);
      });

      it('should extract FB: @username (with @ prefix)', () => {
        expect(extractMessengerNames('FB: @fbuser', [])).toEqual(['fbuser']);
      });

      it('should extract multiple messenger names', () => {
        const notes = 'FB: user1\nMessenger: user2';
        const result = extractMessengerNames(notes, []);
        expect(result).toContain('user1');
        expect(result).toContain('user2');
      });

      it('should deduplicate names', () => {
        const notes = 'FB: same\nMessenger: same';
        expect(extractMessengerNames(notes, [])).toEqual(['same']);
      });

      it('should be case insensitive for prefix', () => {
        expect(extractMessengerNames('fb: lower', [])).toEqual(['lower']);
        expect(extractMessengerNames('MESSENGER: upper', [])).toEqual(['upper']);
      });

      it('should return empty array for no matches', () => {
        expect(extractMessengerNames('just some notes', [])).toEqual([]);
        expect(extractMessengerNames('', [])).toEqual([]);
        expect(extractMessengerNames(null, [])).toEqual([]);
      });
    });

    describe('from URLs', () => {
      it('should extract from m.me URLs', () => {
        const urls = [{ value: 'https://m.me/johndoe' }];
        expect(extractMessengerNames('', urls)).toEqual(['johndoe']);
      });

      it('should extract from messenger.com/t/ URLs', () => {
        const urls = [{ value: 'https://www.messenger.com/t/janedoe' }];
        expect(extractMessengerNames('', urls)).toEqual(['janedoe']);
      });

      it('should extract from facebook.com URLs', () => {
        const urls = [{ value: 'https://www.facebook.com/someone' }];
        expect(extractMessengerNames('', urls)).toEqual(['someone']);
      });

      it('should exclude reserved Facebook paths', () => {
        const reservedPaths = ['profile.php', 'groups', 'pages', 'events', 'marketplace',
          'watch', 'stories', 'settings', 'help', 'login'];
        reservedPaths.forEach(path => {
          const urls = [{ value: `https://www.facebook.com/${path}` }];
          expect(extractMessengerNames('', urls)).toEqual([]);
        });
      });

      it('should deduplicate across notes and URLs', () => {
        const notes = 'FB: johndoe';
        const urls = [{ value: 'https://m.me/johndoe' }];
        expect(extractMessengerNames(notes, urls)).toEqual(['johndoe']);
      });

      it('should handle null or empty URLs', () => {
        expect(extractMessengerNames('', null)).toEqual([]);
        expect(extractMessengerNames('', undefined)).toEqual([]);
        expect(extractMessengerNames('', [])).toEqual([]);
      });
    });

    describe('combined notes and URLs', () => {
      it('should merge names from both sources', () => {
        const notes = 'FB: noteuser';
        const urls = [{ value: 'https://m.me/urluser' }];
        const result = extractMessengerNames(notes, urls);
        expect(result).toContain('noteuser');
        expect(result).toContain('urluser');
      });
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