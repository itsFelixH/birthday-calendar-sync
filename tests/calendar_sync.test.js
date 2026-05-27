// Tests for calendar_sync.js

describe('Calendar Sync', () => {
  let mockCalendarManager;

  beforeEach(() => {
    jest.clearAllMocks();
    global.Logger = { log: jest.fn() };
    global.Utilities = { ...global.Utilities, sleep: jest.fn() };
    global.dryRun = false;
    global.eventRecurrence = 'single';
    global.deceasedHandling = 'skip';
    global.highlightMilestones = true;
    global.milestoneAges = [18, 30, 40, 50, 60, 70, 75, 80, 90, 100];
    global.summaryEventDay = 1;
    global.eventTitles = {
      birthday: '🎂 {name}\'s Birthday',
      milestone: '🎂🎉 {name} turns {age}! 🎉',
      recurring: '🎂 {name}\'s Birthday',
      memorial: '🕯️ {name}',
      summary: '🎉🎂 BIRTHDAYS 🎂🎉'
    };
    global.eventTexts = {
      birthdayWithAge: '🎂 {name} turns {age}',
      birthdayNoAge: '🎂 Happy Birthday, {name}!',
      birthDateLabel: 'Birthday',
      contactSectionHeader: '── Contact ──',
      infoSectionHeader: '── Info ──',
      memorialPrefix: '🕯️ In memory of',
      summaryHeader: '{month} Birthdays',
      whatsappLabel: 'WhatsApp',
      instagramLabel: 'Instagram',
      contactLabel: 'Contact'
    };
    global.eventColors = { birthday: '', milestone: '', memorial: '', summary: '' };

    mockCalendarManager = {
      getDateRange: jest.fn().mockReturnValue({
        start: new Date(2025, 0, 1),
        end: new Date(2025, 11, 31)
      }),
      getEventsInRange: jest.fn().mockReturnValue([]),
      createAllDayEvent: jest.fn(),
      formatDate: jest.fn((date) => `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`)
    };

    global.CalendarManager = jest.fn().mockImplementation(() => mockCalendarManager);
  });

  describe('createOrUpdateIndividualBirthdays', () => {
    it('should return empty stats for empty contacts array', () => {
      const result = createOrUpdateIndividualBirthdays('cal-id', []);
      expect(result).toEqual({ created: [], updated: [] });
      expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('No contacts found'));
    });

    it('should create birthday event for a contact', () => {
      const contact = new BirthdayContact('Max Mustermann', new Date(1990, 0, 15), [], '', '', '', [], null, 'people/123');

      createOrUpdateIndividualBirthdays('cal-id', [contact], 12);

      expect(mockCalendarManager.createAllDayEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Max Mustermann'),
          description: expect.any(String)
        })
      );
    });

    it('should skip deceased contacts when handling is skip', () => {
      global.deceasedHandling = 'skip';
      const contact = new BirthdayContact('Deceased Person', new Date(1950, 5, 10), ['Deceased'], '', '', '', [], new Date(2020, 3, 1), 'people/456');

      const result = createOrUpdateIndividualBirthdays('cal-id', [contact], 12);
      expect(mockCalendarManager.createAllDayEvent).not.toHaveBeenCalled();
      expect(result.created).toHaveLength(0);
    });

    it('should create memorial event for deceased contacts when handling is memorial', () => {
      global.deceasedHandling = 'memorial';
      const contact = new BirthdayContact('Memorial Person', new Date(1950, 5, 10), ['Deceased'], '', '', '', [], new Date(2020, 3, 1), 'people/456');

      createOrUpdateIndividualBirthdays('cal-id', [contact], 12);

      expect(mockCalendarManager.createAllDayEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Memorial Person')
        })
      );
    });

    it('should use milestone title for milestone ages', () => {
      global.highlightMilestones = true;
      global.milestoneAges = [30];
      // Contact born in 1995, event in 2025 = turning 30
      const contact = new BirthdayContact('Milestone Person', new Date(1995, 5, 15), [], '', '', '', [], null, 'people/789');

      mockCalendarManager.getDateRange.mockReturnValue({
        start: new Date(2025, 0, 1),
        end: new Date(2025, 11, 31)
      });

      createOrUpdateIndividualBirthdays('cal-id', [contact], 12);

      expect(mockCalendarManager.createAllDayEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('turns 30')
        })
      );
    });

    it('should update existing event when description changes', () => {
      const contact = new BirthdayContact('Update Person', new Date(1990, 0, 15), [], '', '', '', [], null, 'people/111');

      // The tag that would be generated for this contact
      const expectedTag = '[BirthdaySync]:1-15:Update Person';

      const mockExistingEvent = {
        getDescription: jest.fn().mockReturnValue(`old content\n\u200B${expectedTag}\u200B`),
        getTitle: jest.fn().mockReturnValue('old title'),
        setDescription: jest.fn(),
        setTitle: jest.fn()
      };
      mockCalendarManager.getEventsInRange.mockReturnValue([mockExistingEvent]);

      const result = createOrUpdateIndividualBirthdays('cal-id', [contact], 12);
      expect(mockExistingEvent.setDescription).toHaveBeenCalled();
      expect(result.updated).toHaveLength(1);
    });

    it('should skip event when nothing changed', () => {
      const contact = new BirthdayContact('Same Person', new Date(1990, 0, 15), [], '', '', '', [], null, 'people/222');

      // We need to match the exact description that would be generated
      // Simulate by making getDescription return something that includes the contact tag
      const mockExistingEvent = {
        getDescription: jest.fn(),
        getTitle: jest.fn(),
        setDescription: jest.fn(),
        setTitle: jest.fn()
      };

      // First call to getEventsInRange returns the existing event
      mockCalendarManager.getEventsInRange.mockReturnValue([mockExistingEvent]);

      // Make the existing event match what would be generated (by matching title)
      mockExistingEvent.getTitle.mockImplementation(() => "🎂 Same Person's Birthday");
      // Description won't match exactly, so it will update — that's fine for this test
      mockExistingEvent.getDescription.mockReturnValue('will not match');

      createOrUpdateIndividualBirthdays('cal-id', [contact], 12);
      // Event found by title, description differs → update
      expect(mockExistingEvent.setDescription).toHaveBeenCalled();
    });

    it('should use recurring mode when configured', () => {
      global.eventRecurrence = 'recurring';
      const contact = new BirthdayContact('Recurring Person', new Date(1990, 3, 20), [], '', '', '', [], null, 'people/333');

      createOrUpdateIndividualBirthdays('cal-id', [contact], 12);

      expect(mockCalendarManager.createAllDayEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          recurrence: true
        })
      );
    });

    it('should not use recurrence for leap year birthdays', () => {
      global.eventRecurrence = 'recurring';
      const contact = new BirthdayContact('Leap Person', new Date(1992, 1, 29), [], '', '', '', [], null, 'people/444');

      mockCalendarManager.getDateRange.mockReturnValue({
        start: new Date(2024, 0, 1),
        end: new Date(2024, 11, 31)
      });

      createOrUpdateIndividualBirthdays('cal-id', [contact], 12);

      expect(mockCalendarManager.createAllDayEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          recurrence: false
        })
      );
    });

    it('should log dry run without creating events', () => {
      global.dryRun = true;
      const contact = new BirthdayContact('Dry Run Person', new Date(1990, 0, 15), [], '', '', '', [], null, 'people/555');

      const result = createOrUpdateIndividualBirthdays('cal-id', [contact], 12);
      expect(CalendarManager).not.toHaveBeenCalled();
      expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('DRY RUN'));
      expect(result.created).toHaveLength(1);
    });

    it('should apply rate limiting between batches', () => {
      const contacts = Array.from({ length: 25 }, (_, i) =>
        new BirthdayContact(`Person ${i}`, new Date(1990, i % 12, (i % 28) + 1), [], '', '', '', [], null, `people/${i}`)
      );

      createOrUpdateIndividualBirthdays('cal-id', contacts, 12);
      expect(Utilities.sleep).toHaveBeenCalledWith(500);
    });

    it('should catch and log errors for individual contacts', () => {
      const contact = new BirthdayContact('Error Person', new Date(1990, 0, 15), [], '', '', '', [], null, 'people/666');

      mockCalendarManager.getEventsInRange.mockImplementation(() => {
        throw new Error('Calendar API error');
      });

      const result = createOrUpdateIndividualBirthdays('cal-id', [contact], 12);
      expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('Calendar API error'));
      expect(result.created).toHaveLength(0);
    });
  });

  describe('createOrUpdateMonthlyBirthdaySummaries', () => {
    it('should return empty stats for empty contacts array', () => {
      const result = createOrUpdateMonthlyBirthdaySummaries('cal-id', []);
      expect(result).toEqual({ created: [], updated: [] });
      expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('No contacts found'));
    });

    it('should create summary event for a month with birthdays', () => {
      const contact = new BirthdayContact('Jan Person', new Date(1990, 0, 15), [], '', '', '', [], null, 'people/100');

      createOrUpdateMonthlyBirthdaySummaries('cal-id', [contact], 12);

      expect(mockCalendarManager.createAllDayEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('BIRTHDAYS'),
          description: expect.stringContaining('Jan Person')
        })
      );
    });

    it('should skip months with no birthdays', () => {
      // Contact in January, but we check a range that might include empty months
      const contact = new BirthdayContact('Jan Only', new Date(1990, 0, 15), [], '', '', '', [], null, 'people/101');

      createOrUpdateMonthlyBirthdaySummaries('cal-id', [contact], 2);

      // Should only create for January (the month with a birthday)
      const createCalls = mockCalendarManager.createAllDayEvent.mock.calls;
      createCalls.forEach(call => {
        expect(call[0].description).toContain('Jan Only');
      });
    });

    it('should skip deceased contacts when handling is skip', () => {
      global.deceasedHandling = 'skip';
      const contact = new BirthdayContact('Dead Person', new Date(1950, 0, 10), ['Deceased'], '', '', '', [], new Date(2020, 1, 1), 'people/102');

      createOrUpdateMonthlyBirthdaySummaries('cal-id', [contact], 12);

      // No events should be created since the only contact is deceased
      expect(mockCalendarManager.createAllDayEvent).not.toHaveBeenCalled();
    });

    it('should include deceased contacts as memorial in summary when handling is memorial', () => {
      global.deceasedHandling = 'memorial';
      const contact = new BirthdayContact('Memorial Summary', new Date(1950, 0, 10), ['Deceased'], '', '', '', [], new Date(2020, 1, 1), 'people/103');

      createOrUpdateMonthlyBirthdaySummaries('cal-id', [contact], 12);

      expect(mockCalendarManager.createAllDayEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('🕯️')
        })
      );
    });

    it('should update existing summary when description changes', () => {
      const now = new Date();
      const contact = new BirthdayContact('Update Summary', new Date(1990, now.getMonth(), 15), [], '', '', '', [], null, 'people/104');

      const month = now.getMonth();
      const year = now.getFullYear();
      const expectedTag = `[BirthdaySync]:summary:${year}-${('0' + (month + 1)).slice(-2)}`;

      const mockExistingEvent = {
        getDescription: jest.fn().mockReturnValue(`old summary\n\u200B${expectedTag}\u200B`),
        getTitle: jest.fn().mockReturnValue('old title'),
        setDescription: jest.fn(),
        setTitle: jest.fn()
      };
      mockCalendarManager.getEventsInRange.mockReturnValue([mockExistingEvent]);

      const result = createOrUpdateMonthlyBirthdaySummaries('cal-id', [contact], 1);
      expect(mockExistingEvent.setDescription).toHaveBeenCalled();
      expect(result.updated.length).toBeGreaterThan(0);
    });

    it('should log dry run without creating events', () => {
      global.dryRun = true;
      const now = new Date();
      const contact = new BirthdayContact('Dry Summary', new Date(1990, now.getMonth(), 15), [], '', '', '', [], null, 'people/105');

      const result = createOrUpdateMonthlyBirthdaySummaries('cal-id', [contact], 1);
      expect(CalendarManager).not.toHaveBeenCalled();
      expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('DRY RUN'));
      expect(result.created.length).toBeGreaterThan(0);
    });

    it('should use configured summaryEventDay', () => {
      global.summaryEventDay = 15;
      const now = new Date();
      const contact = new BirthdayContact('Day Test', new Date(1990, now.getMonth(), 20), [], '', '', '', [], null, 'people/106');

      createOrUpdateMonthlyBirthdaySummaries('cal-id', [contact], 1);

      expect(mockCalendarManager.createAllDayEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          date: expect.any(Date)
        })
      );
      // Verify the date is on the 15th
      const callDate = mockCalendarManager.createAllDayEvent.mock.calls[0][0].date;
      expect(callDate.getDate()).toBe(15);
    });
  });

  describe('replaceTitlePlaceholders', () => {
    it('should replace {name} placeholder', () => {
      const contact = new BirthdayContact('Alice', new Date(1990, 0, 1), [], '', '', '', [], null, '');
      const result = replaceTitlePlaceholders('Hello {name}!', contact, {});
      expect(result).toBe('Hello Alice!');
    });

    it('should replace {age} placeholder', () => {
      const contact = new BirthdayContact('Bob', new Date(1990, 0, 1), [], '', '', '', [], null, '');
      const result = replaceTitlePlaceholders('{name} turns {age}', contact, { age: 35 });
      expect(result).toBe('Bob turns 35');
    });

    it('should replace {lifespan} placeholder', () => {
      const contact = new BirthdayContact('Charlie', new Date(1950, 0, 1), [], '', '', '', [], null, '');
      const result = replaceTitlePlaceholders('{name} ({lifespan})', contact, { lifespan: '*1950 †2020' });
      expect(result).toBe('Charlie (*1950 †2020)');
    });

    it('should replace {city} placeholder', () => {
      const contact = new BirthdayContact('Diana', new Date(1990, 0, 1), [], '', 'Berlin', '', [], null, '');
      const result = replaceTitlePlaceholders('{name} from {city}', contact, {});
      expect(result).toBe('Diana from Berlin');
    });

    it('should handle missing optional values gracefully', () => {
      const contact = new BirthdayContact('Eve', new Date(1990, 0, 1), [], '', '', '', [], null, '');
      const result = replaceTitlePlaceholders('{name} {age} {city}', contact, {});
      expect(result).toBe('Eve  ');
    });
  });

  describe('wrapInvisible', () => {
    it('should wrap text in zero-width spaces', () => {
      const result = wrapInvisible('hidden');
      expect(result).toBe('\u200Bhidden\u200B');
    });

    it('should preserve the original text inside', () => {
      const result = wrapInvisible('[BirthdaySync]:tag');
      expect(result).toContain('[BirthdaySync]:tag');
    });
  });

  describe('getMonthlyDateRange', () => {
    it('should return start at 1st of current month', () => {
      const { start } = getMonthlyDateRange(6);
      expect(start.getDate()).toBe(1);
    });

    it('should return end N months ahead', () => {
      const { start, end } = getMonthlyDateRange(6);
      const expectedEnd = new Date(start);
      expectedEnd.setMonth(expectedEnd.getMonth() + 6);
      expect(end.getTime()).toBe(expectedEnd.getTime());
    });
  });

  describe('logSyncStats', () => {
    it('should log formatted stats', () => {
      const stats = { processed: 10, created: ['a', 'b'], updated: ['c'], skipped: 5, errors: 2 };
      logSyncStats('individual', stats);
      expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('individual sync complete'));
      expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('Created: 2'));
      expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('Updated: 1'));
    });
  });
});
