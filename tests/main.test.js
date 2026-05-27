// Tests for main.js entry point functions

describe('Config Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.Logger = { log: jest.fn() };
  });

  describe('isCalendarConfigured', () => {
    it('should return false for placeholder calendarId', () => {
      global.calendarId = 'your-calendar-id@group.calendar.google.com';
      expect(isCalendarConfigured()).toBe(false);
      expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('not configured'));
    });

    it('should return false for empty calendarId', () => {
      global.calendarId = '';
      expect(isCalendarConfigured()).toBe(false);
    });

    it('should return false for undefined calendarId', () => {
      delete global.calendarId;
      expect(isCalendarConfigured()).toBe(false);
    });

    it('should return true for a valid calendarId', () => {
      global.calendarId = 'abc123@group.calendar.google.com';
      expect(isCalendarConfigured()).toBe(true);
      expect(Logger.log).not.toHaveBeenCalled();
    });
  });

  describe('isLabelFilterConfigured', () => {
    it('should return false when useLabel is true but labelFilter is empty', () => {
      global.useLabel = true;
      global.labelFilter = [];
      expect(isLabelFilterConfigured()).toBe(false);
      expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('labelFilter is empty'));
    });

    it('should return false when useLabel is true and labelFilter is null', () => {
      global.useLabel = true;
      global.labelFilter = null;
      expect(isLabelFilterConfigured()).toBe(false);
    });

    it('should return true when useLabel is false', () => {
      global.useLabel = false;
      global.labelFilter = [];
      expect(isLabelFilterConfigured()).toBe(true);
    });

    it('should return true when useLabel is true and labelFilter has entries', () => {
      global.useLabel = true;
      global.labelFilter = ['Friends'];
      expect(isLabelFilterConfigured()).toBe(true);
    });
  });
});

describe('setupSchedules', () => {
  let mockTriggerBuilder;

  beforeEach(() => {
    jest.clearAllMocks();
    global.Logger = { log: jest.fn() };
    global.calendarId = 'test@group.calendar.google.com';
    global.sendMonthlySummaryEmail = false;
    global.sendWeeklyReminderEmail = false;
    global.scheduleSyncDay = ScriptApp.WeekDay.MONDAY;
    global.scheduleSyncHour = 3;
    global.scheduleMonthlySummaryDay = 28;
    global.scheduleMonthlySummaryHour = 9;
    global.scheduleWeeklyReminderDay = ScriptApp.WeekDay.MONDAY;
    global.scheduleWeeklyReminderHour = 10;

    mockTriggerBuilder = {
      timeBased: jest.fn().mockReturnThis(),
      onWeekDay: jest.fn().mockReturnThis(),
      onMonthDay: jest.fn().mockReturnThis(),
      atHour: jest.fn().mockReturnThis(),
      everyDays: jest.fn().mockReturnThis(),
      create: jest.fn()
    };

    global.ScriptApp = {
      ...global.ScriptApp,
      getProjectTriggers: jest.fn().mockReturnValue([]),
      newTrigger: jest.fn().mockReturnValue(mockTriggerBuilder),
      deleteTrigger: jest.fn()
    };
  });

  it('should abort if calendarId is not configured', () => {
    global.calendarId = 'your-calendar-id@group.calendar.google.com';
    setupSchedules();
    expect(ScriptApp.newTrigger).not.toHaveBeenCalled();
  });

  it('should always create syncBirthdays trigger', () => {
    setupSchedules();
    expect(ScriptApp.newTrigger).toHaveBeenCalledWith('syncBirthdays');
    expect(mockTriggerBuilder.onWeekDay).toHaveBeenCalledWith(ScriptApp.WeekDay.MONDAY);
    expect(mockTriggerBuilder.atHour).toHaveBeenCalledWith(3);
    expect(mockTriggerBuilder.create).toHaveBeenCalled();
  });

  it('should skip sendMonthlySummary trigger when email is disabled', () => {
    global.sendMonthlySummaryEmail = false;
    setupSchedules();
    expect(ScriptApp.newTrigger).not.toHaveBeenCalledWith('sendMonthlySummary');
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('sendMonthlySummary — skipped'));
  });

  it('should create sendMonthlySummary trigger when email is enabled', () => {
    global.sendMonthlySummaryEmail = true;
    setupSchedules();
    expect(ScriptApp.newTrigger).toHaveBeenCalledWith('sendMonthlySummary');
    expect(mockTriggerBuilder.onMonthDay).toHaveBeenCalledWith(28);
    expect(mockTriggerBuilder.atHour).toHaveBeenCalledWith(9);
  });

  it('should skip sendWeeklyReminder trigger when email is disabled', () => {
    global.sendWeeklyReminderEmail = false;
    setupSchedules();
    expect(ScriptApp.newTrigger).not.toHaveBeenCalledWith('sendWeeklyReminder');
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('sendWeeklyReminder — skipped'));
  });

  it('should create sendWeeklyReminder trigger when email is enabled', () => {
    global.sendWeeklyReminderEmail = true;
    setupSchedules();
    expect(ScriptApp.newTrigger).toHaveBeenCalledWith('sendWeeklyReminder');
    expect(mockTriggerBuilder.onWeekDay).toHaveBeenCalledWith(ScriptApp.WeekDay.MONDAY);
    expect(mockTriggerBuilder.atHour).toHaveBeenCalledWith(10);
  });

  it('should remove only managed triggers before creating new ones', () => {
    const managedTrigger = { getHandlerFunction: () => 'syncBirthdays' };
    const userTrigger = { getHandlerFunction: () => 'myCustomFunction' };
    global.ScriptApp.getProjectTriggers.mockReturnValue([managedTrigger, userTrigger]);

    setupSchedules();
    expect(ScriptApp.deleteTrigger).toHaveBeenCalledWith(managedTrigger);
    expect(ScriptApp.deleteTrigger).not.toHaveBeenCalledWith(userTrigger);
  });
});

describe('removeSchedules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.Logger = { log: jest.fn() };
    global.ScriptApp = {
      ...global.ScriptApp,
      getProjectTriggers: jest.fn().mockReturnValue([]),
      deleteTrigger: jest.fn()
    };
  });

  it('should log message when no managed triggers exist', () => {
    global.ScriptApp.getProjectTriggers.mockReturnValue([]);
    removeSchedules();
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('No managed triggers found'));
    expect(ScriptApp.deleteTrigger).not.toHaveBeenCalled();
  });

  it('should remove only managed triggers', () => {
    const syncTrigger = { getHandlerFunction: () => 'syncBirthdays' };
    const reminderTrigger = { getHandlerFunction: () => 'sendWeeklyReminder' };
    const userTrigger = { getHandlerFunction: () => 'otherFunction' };
    global.ScriptApp.getProjectTriggers.mockReturnValue([syncTrigger, reminderTrigger, userTrigger]);

    removeSchedules();
    expect(ScriptApp.deleteTrigger).toHaveBeenCalledWith(syncTrigger);
    expect(ScriptApp.deleteTrigger).toHaveBeenCalledWith(reminderTrigger);
    expect(ScriptApp.deleteTrigger).not.toHaveBeenCalledWith(userTrigger);
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('All managed schedules removed'));
  });
});

describe('syncBirthdays', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.Logger = { log: jest.fn() };
    global.calendarId = 'test@group.calendar.google.com';
    global.useLabel = false;
    global.labelFilter = [];
    global.dryRun = false;
    global.createIndividualBirthdayEvents = true;
    global.createBirthdaySummaryEvents = true;
    global.sendSyncReport = false;
    global.individualMonthsAhead = 12;
    global.individualReminderMinutes = 1440;
    global.individualReminderMethod = 'popup';
    global.summaryMonthsAhead = 6;
    global.summaryReminderMinutes = 5760;
    global.summaryReminderMethod = 'popup';
  });

  it('should abort if calendarId is not configured', () => {
    global.calendarId = '';
    syncBirthdays();
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('not configured'));
  });

  it('should abort if useLabel is true but labelFilter is empty', () => {
    global.useLabel = true;
    global.labelFilter = [];
    syncBirthdays();
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('labelFilter is empty'));
  });

  it('should abort if no contacts found', () => {
    global.fetchContactsWithBirthdays = jest.fn().mockReturnValue([]);
    syncBirthdays();
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('No contacts with birthdays found'));
  });

  it('should call createOrUpdateIndividualBirthdays when enabled', () => {
    const mockContact = { name: 'Test', birthday: new Date(1990, 0, 15) };
    global.fetchContactsWithBirthdays = jest.fn().mockReturnValue([mockContact]);
    global.createOrUpdateIndividualBirthdays = jest.fn().mockReturnValue({ created: [], updated: [] });
    global.createOrUpdateMonthlyBirthdaySummaries = jest.fn().mockReturnValue({ created: [], updated: [] });
    global.hasChanges = jest.fn().mockReturnValue(false);

    syncBirthdays();
    expect(createOrUpdateIndividualBirthdays).toHaveBeenCalledWith(
      'test@group.calendar.google.com',
      [mockContact],
      12, 1440, 'popup'
    );
  });

  it('should call createOrUpdateMonthlyBirthdaySummaries when enabled', () => {
    const mockContact = { name: 'Test', birthday: new Date(1990, 0, 15) };
    global.fetchContactsWithBirthdays = jest.fn().mockReturnValue([mockContact]);
    global.createOrUpdateIndividualBirthdays = jest.fn().mockReturnValue({ created: [], updated: [] });
    global.createOrUpdateMonthlyBirthdaySummaries = jest.fn().mockReturnValue({ created: [], updated: [] });
    global.hasChanges = jest.fn().mockReturnValue(false);

    syncBirthdays();
    expect(createOrUpdateMonthlyBirthdaySummaries).toHaveBeenCalledWith(
      'test@group.calendar.google.com',
      [mockContact],
      6, 5760, 'popup'
    );
  });

  it('should not call sync functions when disabled', () => {
    global.createIndividualBirthdayEvents = false;
    global.createBirthdaySummaryEvents = false;
    const mockContact = { name: 'Test', birthday: new Date(1990, 0, 15) };
    global.fetchContactsWithBirthdays = jest.fn().mockReturnValue([mockContact]);
    global.createOrUpdateIndividualBirthdays = jest.fn();
    global.createOrUpdateMonthlyBirthdaySummaries = jest.fn();
    global.hasChanges = jest.fn().mockReturnValue(false);

    syncBirthdays();
    expect(createOrUpdateIndividualBirthdays).not.toHaveBeenCalled();
    expect(createOrUpdateMonthlyBirthdaySummaries).not.toHaveBeenCalled();
  });

  it('should send sync report email when enabled and changes exist', () => {
    global.sendSyncReport = true;
    const mockContact = { name: 'Test', birthday: new Date(1990, 0, 15) };
    global.fetchContactsWithBirthdays = jest.fn().mockReturnValue([mockContact]);
    global.createOrUpdateIndividualBirthdays = jest.fn().mockReturnValue({ created: ['Test'], updated: [] });
    global.createOrUpdateMonthlyBirthdaySummaries = jest.fn().mockReturnValue({ created: [], updated: [] });
    global.hasChanges = jest.fn().mockReturnValue(true);

    const mockSendSyncReport = jest.fn();
    global.EmailManager = jest.fn().mockImplementation(() => ({
      sendSyncReport: mockSendSyncReport
    }));

    syncBirthdays();
    expect(mockSendSyncReport).toHaveBeenCalled();
  });

  it('should log dry run message instead of sending email', () => {
    global.dryRun = true;
    global.sendSyncReport = true;
    const mockContact = { name: 'Test', birthday: new Date(1990, 0, 15) };
    global.fetchContactsWithBirthdays = jest.fn().mockReturnValue([mockContact]);
    global.createOrUpdateIndividualBirthdays = jest.fn().mockReturnValue({ created: ['Test'], updated: [] });
    global.createOrUpdateMonthlyBirthdaySummaries = jest.fn().mockReturnValue({ created: [], updated: [] });
    global.hasChanges = jest.fn().mockReturnValue(true);

    syncBirthdays();
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('DRY RUN'));
  });

  it('should catch and log errors', () => {
    global.fetchContactsWithBirthdays = jest.fn().mockImplementation(() => {
      throw new Error('API failure');
    });
    syncBirthdays();
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('API failure'));
  });
});

describe('sendMonthlySummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.Logger = { log: jest.fn() };
    global.dryRun = false;
    global.sendMonthlySummaryEmail = true;
    global.useLabel = false;
    global.labelFilter = [];
  });

  it('should abort if email is disabled', () => {
    global.sendMonthlySummaryEmail = false;
    sendMonthlySummary();
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('disabled by config'));
  });

  it('should abort if label filter is misconfigured', () => {
    global.useLabel = true;
    global.labelFilter = [];
    sendMonthlySummary();
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('labelFilter is empty'));
  });

  it('should abort if no contacts found', () => {
    global.fetchContactsWithBirthdays = jest.fn().mockReturnValue([]);
    sendMonthlySummary();
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('No contacts with birthdays found'));
  });

  it('should send monthly summary email', () => {
    const mockContact = { name: 'Test', birthday: new Date(1990, 5, 15) };
    global.fetchContactsWithBirthdays = jest.fn().mockReturnValue([mockContact]);
    global.getNextMonth = jest.fn().mockReturnValue(new Date(2025, 5, 1));

    const mockSendMonthlySummary = jest.fn();
    global.EmailManager = jest.fn().mockImplementation(() => ({
      sendMonthlySummary: mockSendMonthlySummary
    }));

    sendMonthlySummary();
    expect(mockSendMonthlySummary).toHaveBeenCalledWith([mockContact], 5, 2025);
  });

  it('should log dry run message instead of sending', () => {
    global.dryRun = true;
    const mockContact = { name: 'Test', birthday: new Date(1990, 5, 15) };
    global.fetchContactsWithBirthdays = jest.fn().mockReturnValue([mockContact]);
    global.getNextMonth = jest.fn().mockReturnValue(new Date(2025, 5, 1));

    sendMonthlySummary();
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('DRY RUN'));
  });

  it('should catch and log errors', () => {
    global.fetchContactsWithBirthdays = jest.fn().mockImplementation(() => {
      throw new Error('Network error');
    });
    sendMonthlySummary();
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('Network error'));
  });
});

describe('sendWeeklyReminder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.Logger = { log: jest.fn() };
    global.dryRun = false;
    global.sendWeeklyReminderEmail = true;
    global.useLabel = false;
    global.labelFilter = [];
    global.weeklyReminderDay = -1; // send every day
    global.reminderDaysBefore = 7;
  });

  it('should abort if email is disabled', () => {
    global.sendWeeklyReminderEmail = false;
    sendWeeklyReminder();
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('disabled by config'));
  });

  it('should abort if label filter is misconfigured', () => {
    global.useLabel = true;
    global.labelFilter = [];
    sendWeeklyReminder();
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('labelFilter is empty'));
  });

  it('should skip if today is not the configured send day', () => {
    const today = new Date();
    // Set weeklyReminderDay to a day that is NOT today
    global.weeklyReminderDay = (today.getDay() + 1) % 7;
    sendWeeklyReminder();
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('not the configured send day'));
  });

  it('should not skip when weeklyReminderDay is -1 (every day)', () => {
    global.weeklyReminderDay = -1;
    global.fetchContactsWithBirthdays = jest.fn().mockReturnValue([]);
    sendWeeklyReminder();
    // Should get past the day check and hit "no contacts"
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('No contacts with birthdays found'));
  });

  it('should abort if no contacts found', () => {
    global.fetchContactsWithBirthdays = jest.fn().mockReturnValue([]);
    sendWeeklyReminder();
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('No contacts with birthdays found'));
  });

  it('should send weekly reminder email', () => {
    const mockContact = { name: 'Test', birthday: new Date(1990, 0, 15) };
    global.fetchContactsWithBirthdays = jest.fn().mockReturnValue([mockContact]);

    const mockSendWeeklyReminder = jest.fn();
    global.EmailManager = jest.fn().mockImplementation(() => ({
      sendWeeklyReminder: mockSendWeeklyReminder
    }));

    sendWeeklyReminder();
    expect(mockSendWeeklyReminder).toHaveBeenCalledWith([mockContact], expect.any(Date), 7);
  });

  it('should log dry run message instead of sending', () => {
    global.dryRun = true;
    const mockContact = { name: 'Test', birthday: new Date(1990, 0, 15) };
    global.fetchContactsWithBirthdays = jest.fn().mockReturnValue([mockContact]);

    sendWeeklyReminder();
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('DRY RUN'));
  });

  it('should catch and log errors', () => {
    global.fetchContactsWithBirthdays = jest.fn().mockImplementation(() => {
      throw new Error('Timeout');
    });
    sendWeeklyReminder();
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('Timeout'));
  });
});

describe('sendContactQualityReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.Logger = { log: jest.fn() };
    global.dryRun = false;
    global.useLabel = false;
    global.labelFilter = [];
  });

  it('should abort if label filter is misconfigured', () => {
    global.useLabel = true;
    global.labelFilter = [];
    sendContactQualityReport();
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('labelFilter is empty'));
  });

  it('should abort if no contacts found', () => {
    global.fetchContactsWithBirthdays = jest.fn().mockReturnValue([]);
    sendContactQualityReport();
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('No contacts with birthdays found'));
  });

  it('should send quality report', () => {
    const mockContact = { name: 'Test', birthday: new Date(1990, 0, 15) };
    global.fetchContactsWithBirthdays = jest.fn().mockReturnValue([mockContact]);

    const mockSendReport = jest.fn();
    global.EmailManager = jest.fn().mockImplementation(() => ({
      sendContactQualityReport: mockSendReport
    }));

    sendContactQualityReport();
    expect(mockSendReport).toHaveBeenCalledWith([mockContact]);
  });

  it('should log dry run message instead of sending', () => {
    global.dryRun = true;
    const mockContact = { name: 'Test', birthday: new Date(1990, 0, 15) };
    global.fetchContactsWithBirthdays = jest.fn().mockReturnValue([mockContact]);

    sendContactQualityReport();
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('DRY RUN'));
  });

  it('should catch and log errors', () => {
    global.fetchContactsWithBirthdays = jest.fn().mockImplementation(() => {
      throw new Error('Service unavailable');
    });
    sendContactQualityReport();
    expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('Service unavailable'));
  });
});
