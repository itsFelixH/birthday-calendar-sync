// Tests for CalendarManager class

describe('CalendarManager', () => {
  let calendarManager;
  const mockCalendarId = 'test-calendar-id';
  const mockCalendar = {
    createEvent: jest.fn(),
    createAllDayEvent: jest.fn(),
    getEvents: jest.fn(),
    getEventById: jest.fn()
  };

  beforeEach(() => {
    // Mock CalendarApp
    global.CalendarApp = {
      getCalendarById: jest.fn().mockReturnValue(mockCalendar)
    };

    // Mock Session
    global.Session = {
      getScriptTimeZone: jest.fn().mockReturnValue('UTC')
    };

    // Mock Utilities
    global.Utilities = {
      formatDate: jest.fn()
    };

    calendarManager = new CalendarManager({
      calendarId: mockCalendarId,
      dateFormat: 'dd.MM.yyyy',
      timeZone: 'UTC'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with provided config', () => {
      expect(calendarManager.calendar).toBe(mockCalendar);
      expect(calendarManager.dateFormat).toBe('dd.MM.yyyy');
      expect(calendarManager.timeZone).toBe('UTC');
    });

    it('should use default values when not provided', () => {
      const defaultManager = new CalendarManager({ calendarId: mockCalendarId });
      expect(defaultManager.dateFormat).toBe('dd.MM.yyyy');
      expect(defaultManager.timeZone).toBe('UTC');
    });

    it('should throw error if calendar not found', () => {
      global.CalendarApp.getCalendarById.mockReturnValue(null);
      expect(() => new CalendarManager({ calendarId: 'invalid-id' }))
        .toThrow('Calendar not found: invalid-id');
    });
  });

  describe('createTimedEvent', () => {
    const eventParams = {
      title: 'Test Event',
      start: new Date(2024, 0, 1, 10, 0),
      end: new Date(2024, 0, 1, 11, 0),
      description: 'Test Description',
      reminders: [{ type: 'popup', minutes: 10 }]
    };

    it('should create event with correct parameters', () => {
      calendarManager.createTimedEvent(eventParams);
      expect(mockCalendar.createEvent).toHaveBeenCalledWith(
        eventParams.title,
        eventParams.start,
        eventParams.end,
        expect.objectContaining({
          description: eventParams.description,
          reminders: expect.any(Object)
        })
      );
    });

    it('should handle event creation error', () => {
      mockCalendar.createEvent.mockImplementation(() => {
        throw new Error('Creation failed');
      });
      expect(() => calendarManager.createTimedEvent(eventParams))
        .toThrow('Event creation failed: Creation failed');
    });
  });

  describe('deleteEventsByTitleInRange', () => {
    const startDate = new Date(2024, 0, 1);
    const endDate = new Date(2024, 0, 31);
    const mockEvents = [
      { getTitle: () => 'Test Event 1', deleteEvent: jest.fn() },
      { getTitle: () => 'Test Event 2', deleteEvent: jest.fn() }
    ];

    beforeEach(() => {
      mockCalendar.getEvents.mockReturnValue(mockEvents);
    });

    it('should delete matching events', () => {
      const deleted = calendarManager.deleteEventsByTitleInRange('Test', startDate, endDate);
      expect(deleted).toBe(2);
      expect(mockEvents[0].deleteEvent).toHaveBeenCalled();
      expect(mockEvents[1].deleteEvent).toHaveBeenCalled();
    });

    it('should not delete non-matching events', () => {
      const deleted = calendarManager.deleteEventsByTitleInRange('Other', startDate, endDate);
      expect(deleted).toBe(0);
      expect(mockEvents[0].deleteEvent).not.toHaveBeenCalled();
      expect(mockEvents[1].deleteEvent).not.toHaveBeenCalled();
    });
  });

  describe('getEventsInRange', () => {
    const startDate = new Date(2024, 0, 1);
    const endDate = new Date(2024, 0, 31);
    const mockEvents = [
      { 
        getTitle: () => 'Event 1',
        getDescription: () => 'Description 1'
      },
      {
        getTitle: () => 'Event 2',
        getDescription: () => 'Description 2'
      }
    ];

    beforeEach(() => {
      mockCalendar.getEvents.mockReturnValue(mockEvents);
    });

    it('should return all events in range without search', () => {
      const events = calendarManager.getEventsInRange(startDate, endDate);
      expect(events).toEqual(mockEvents);
    });

    it('should filter events by search term', () => {
      const events = calendarManager.getEventsInRange(startDate, endDate, {
        search: 'Event 1'
      });
      expect(events).toHaveLength(1);
      expect(events[0].getTitle()).toBe('Event 1');
    });

    it('should reverse order when ascending is false', () => {
      const events = calendarManager.getEventsInRange(startDate, endDate, {
        ascending: false
      });
      expect(events[0].getTitle()).toBe('Event 2');
      expect(events[1].getTitle()).toBe('Event 1');
    });
  });

  describe('updateEvent', () => {
    const mockEvent = {
      getTitle: jest.fn().mockReturnValue('Old Title'),
      getDescription: jest.fn().mockReturnValue('Old Description'),
      getColor: jest.fn().mockReturnValue('#000000'),
      setTitle: jest.fn(),
      setDescription: jest.fn(),
      setColor: jest.fn()
    };

    beforeEach(() => {
      mockCalendar.getEventById.mockReturnValue(mockEvent);
    });

    it('should update event properties', () => {
      const updates = {
        title: 'New Title',
        description: 'New Description',
        color: '#FF0000'
      };

      const changed = calendarManager.updateEvent('event-id', updates);
      expect(changed).toBe(true);
      expect(mockEvent.setTitle).toHaveBeenCalledWith('New Title');
      expect(mockEvent.setDescription).toHaveBeenCalledWith('New Description');
      expect(mockEvent.setColor).toHaveBeenCalledWith('#FF0000');
    });

    it('should return false if event not found', () => {
      mockCalendar.getEventById.mockReturnValue(null);
      const changed = calendarManager.updateEvent('invalid-id', { title: 'New Title' });
      expect(changed).toBe(false);
    });

    it('should only update changed properties', () => {
      const updates = { title: 'New Title' };
      calendarManager.updateEvent('event-id', updates);
      expect(mockEvent.setTitle).toHaveBeenCalled();
      expect(mockEvent.setDescription).not.toHaveBeenCalled();
      expect(mockEvent.setColor).not.toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    describe('isLeapYear', () => {
      it('should identify leap years correctly', () => {
        expect(calendarManager.isLeapYear(2020)).toBe(true);
        expect(calendarManager.isLeapYear(2021)).toBe(false);
        expect(calendarManager.isLeapYear(2000)).toBe(true);
        expect(calendarManager.isLeapYear(1900)).toBe(false);
      });
    });

    describe('getDaysInMonth', () => {
      it('should return correct days for each month', () => {
        expect(CalendarManager.getDaysInMonth(0, 2024)).toBe(31); // January
        expect(CalendarManager.getDaysInMonth(1, 2024)).toBe(29); // February (leap year)
        expect(CalendarManager.getDaysInMonth(1, 2023)).toBe(28); // February (non-leap year)
        expect(CalendarManager.getDaysInMonth(3, 2024)).toBe(30); // April
      });
    });

    describe('getDateRange', () => {
      beforeEach(() => {
        jest.useFakeTimers().setSystemTime(new Date(2024, 0, 1));
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should return correct date range', () => {
        const { start, end } = calendarManager.getDateRange(3);
        expect(start).toEqual(new Date(2024, 0, 1));
        expect(end).toEqual(new Date(2024, 3, 1));
      });
    });
  });
});