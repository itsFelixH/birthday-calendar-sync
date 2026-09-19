// Tests for _setup.js (setupSchedules & removeSchedules)

describe('Setup Schedules Trigger Lifecycle', () => {
  let createdTriggers;
  let mockBuilder;

  beforeEach(() => {
    createdTriggers = [];
    global.calendarId = 'valid-calendar-id@group.calendar.google.com';
    global.sendMonthlySummaryEmail = false;
    global.sendWeeklyReminderEmail = false;
    global.sendQualityReportEmail = false;

    mockBuilder = {
      timeBased: jest.fn().mockReturnThis(),
      onWeekDay: jest.fn().mockReturnThis(),
      onMonthDay: jest.fn().mockReturnThis(),
      atHour: jest.fn().mockReturnThis(),
      create: jest.fn().mockImplementation(() => {
        createdTriggers.push(mockBuilder._funcName);
        return {};
      })
    };

    ScriptApp.newTrigger = jest.fn((funcName) => {
      mockBuilder._funcName = funcName;
      return mockBuilder;
    });

    ScriptApp.getProjectTriggers = jest.fn().mockReturnValue([]);
    ScriptApp.deleteTrigger = jest.fn();
    Logger.log = jest.fn();
  });

  afterEach(() => {
    delete global.calendarId;
    delete global.sendMonthlySummaryEmail;
    delete global.sendWeeklyReminderEmail;
    delete global.sendQualityReportEmail;
  });

  describe('setupSchedules', () => {
    it('should abort if calendar is not configured', () => {
      global.calendarId = 'your-calendar-id@group.calendar.google.com';
      setupSchedules();
      expect(ScriptApp.newTrigger).not.toHaveBeenCalled();
    });

    it('should delete existing managed triggers before creating new ones', () => {
      const existingManaged = { getHandlerFunction: () => 'syncBirthdays' };
      const existingCustom = { getHandlerFunction: () => 'myCustomFunction' };
      ScriptApp.getProjectTriggers.mockReturnValue([existingManaged, existingCustom]);

      setupSchedules();

      expect(ScriptApp.deleteTrigger).toHaveBeenCalledTimes(1);
      expect(ScriptApp.deleteTrigger).toHaveBeenCalledWith(existingManaged);
    });

    it('should always create syncBirthdays trigger', () => {
      setupSchedules();
      expect(ScriptApp.newTrigger).toHaveBeenCalledWith('syncBirthdays');
      expect(mockBuilder.onWeekDay).toHaveBeenCalled();
      expect(mockBuilder.atHour).toHaveBeenCalled();
    });

    it('should create email triggers when enabled', () => {
      global.sendMonthlySummaryEmail = true;
      global.sendWeeklyReminderEmail = true;
      global.sendQualityReportEmail = true;

      setupSchedules();

      expect(ScriptApp.newTrigger).toHaveBeenCalledWith('syncBirthdays');
      expect(ScriptApp.newTrigger).toHaveBeenCalledWith('sendMonthlySummary');
      expect(ScriptApp.newTrigger).toHaveBeenCalledWith('sendWeeklyReminder');
      expect(ScriptApp.newTrigger).toHaveBeenCalledWith('sendContactQualityReport');
      expect(createdTriggers).toHaveLength(4);
    });

    it('should skip email triggers when disabled', () => {
      global.sendMonthlySummaryEmail = false;
      global.sendWeeklyReminderEmail = false;
      global.sendQualityReportEmail = false;

      setupSchedules();

      expect(ScriptApp.newTrigger).toHaveBeenCalledWith('syncBirthdays');
      expect(ScriptApp.newTrigger).not.toHaveBeenCalledWith('sendMonthlySummary');
      expect(ScriptApp.newTrigger).not.toHaveBeenCalledWith('sendWeeklyReminder');
      expect(ScriptApp.newTrigger).not.toHaveBeenCalledWith('sendContactQualityReport');
      expect(createdTriggers).toHaveLength(1);
    });
  });

  describe('removeSchedules', () => {
    it('should do nothing if no managed triggers exist', () => {
      ScriptApp.getProjectTriggers.mockReturnValue([]);
      removeSchedules();
      expect(ScriptApp.deleteTrigger).not.toHaveBeenCalled();
      expect(Logger.log).toHaveBeenCalledWith(expect.stringContaining('No managed triggers found'));
    });

    it('should remove only managed triggers and preserve custom triggers', () => {
      const managed1 = { getHandlerFunction: () => 'syncBirthdays' };
      const managed2 = { getHandlerFunction: () => 'sendMonthlySummary' };
      const custom = { getHandlerFunction: () => 'doNotDelete' };

      ScriptApp.getProjectTriggers.mockReturnValue([managed1, managed2, custom]);
      removeSchedules();

      expect(ScriptApp.deleteTrigger).toHaveBeenCalledTimes(2);
      expect(ScriptApp.deleteTrigger).toHaveBeenCalledWith(managed1);
      expect(ScriptApp.deleteTrigger).toHaveBeenCalledWith(managed2);
      expect(ScriptApp.deleteTrigger).not.toHaveBeenCalledWith(custom);
    });
  });
});
