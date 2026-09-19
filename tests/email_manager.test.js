// Tests for EmailManager class

describe('EmailManager', () => {
  let emailManager;
  const mockGmail = {
    Users: {
      Messages: {
        send: jest.fn()
      }
    }
  };

  beforeEach(() => {
    // Mock global Gmail object
    global.Gmail = mockGmail;

    // Mock global Utilities object
    global.Utilities = {
      formatDate: jest.fn((date, tz, format) => {
        if (format === 'MMMM') return global.monthNamesLong[date.getMonth()];
        return '';
      }),
      base64Encode: jest.fn().mockReturnValue('base64encoded'),
      base64EncodeWebSafe: jest.fn().mockReturnValue('base64encoded'),
      Charset: { UTF_8: 'UTF-8' }
    };

    emailManager = new EmailManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMail', () => {
    const emailParams = {
      toEmail: 'recipient@example.com',
      fromEmail: 'sender@example.com',
      senderName: 'Test Sender',
      subject: 'Test Subject',
      textBody: 'Test text body',
      htmlBody: '<p>Test HTML body</p>'
    };

    it('should send email with correct parameters', () => {
      emailManager.sendMail(
        emailParams.toEmail,
        emailParams.fromEmail,
        emailParams.senderName,
        emailParams.subject,
        emailParams.textBody,
        emailParams.htmlBody
      );

      expect(global.Utilities.base64Encode).toHaveBeenCalledWith(
        emailParams.subject,
        'UTF-8'
      );
      expect(global.Utilities.base64Encode).toHaveBeenCalledWith(
        emailParams.htmlBody,
        'UTF-8'
      );
      expect(global.Utilities.base64EncodeWebSafe).toHaveBeenCalled();
      expect(mockGmail.Users.Messages.send).toHaveBeenCalledWith(
        expect.objectContaining({
          raw: expect.any(String)
        }),
        'me'
      );
    });

    it('should generate a unique boundary per call', () => {
      emailManager.sendMail('a@b.com', 'a@b.com', 'S', 'Sub', 'text', '<p>html</p>');
      const firstCall = global.Utilities.base64EncodeWebSafe.mock.calls[0][0];

      jest.clearAllMocks();
      emailManager.sendMail('a@b.com', 'a@b.com', 'S', 'Sub', 'text', '<p>html</p>');
      const secondCall = global.Utilities.base64EncodeWebSafe.mock.calls[0][0];

      // Extract boundary from Content-Type header
      const getBoundary = (raw) => raw.match(/boundary=(\S+)/)[1];
      expect(getBoundary(firstCall)).not.toEqual(getBoundary(secondCall));
    });

    it('should include both text and html parts in MIME structure', () => {
      // Use passthrough mock to inspect raw content
      global.Utilities.base64EncodeWebSafe = jest.fn(str => str);
      global.Utilities.base64Encode = jest.fn(str => `encoded:${str}`);

      emailManager.sendMail('a@b.com', 'a@b.com', 'Sender', 'Subject', 'plain text here', '<p>html</p>');

      const rawData = global.Utilities.base64EncodeWebSafe.mock.calls[0][0];
      expect(rawData).toContain('Content-Type: text/plain; charset=UTF-8');
      expect(rawData).toContain('plain text here');
      expect(rawData).toContain('Content-Type: text/html; charset=UTF-8');
      expect(rawData).toContain('encoded:<p>html</p>');
    });
  });

  describe('sendMonthlySummary', () => {
    const mockContacts = [
      new BirthdayContact('John Doe', new Date(1990, 0, 15)),
      new BirthdayContact('Jane Smith', new Date(1985, 0, 20))
    ];

    beforeEach(() => {
      // Mock Session
      global.Session = {
        getScriptTimeZone: jest.fn().mockReturnValue('UTC'),
        getActiveUser: jest.fn().mockReturnValue({
          getEmail: jest.fn().mockReturnValue('user@example.com')
        })
      };

      // Mock DriveApp
      global.DriveApp = {
        getFileById: jest.fn().mockReturnValue({
          getName: jest.fn().mockReturnValue('Test Script')
        })
      };

      // Mock ScriptApp
      global.ScriptApp = {
        getScriptId: jest.fn().mockReturnValue('script-id')
      };
    });

    it('should send monthly summary email with correct content', () => {
      emailManager.sendMonthlySummary(mockContacts, 0, 2024);

      expect(mockGmail.Users.Messages.send).toHaveBeenCalled();
      const sendCall = mockGmail.Users.Messages.send.mock.calls[0][0];
      expect(sendCall).toHaveProperty('raw');
    });

    it('should include plain text body with contact names and dates', () => {
      global.Utilities.base64EncodeWebSafe = jest.fn(str => str);
      global.Utilities.base64Encode = jest.fn(str => str);

      emailManager.sendMonthlySummary(mockContacts, 0, 2024);

      const rawData = global.Utilities.base64EncodeWebSafe.mock.calls[0][0];
      expect(rawData).toContain('John Doe');
      expect(rawData).toContain('Jane Smith');
      // Should contain age for contacts with known birth year
      expect(rawData).toContain('turns');
    });

    it('should handle contacts without known birth year', () => {
      const contactsWithoutYear = [
        new BirthdayContact('No Year', new Date(new Date().getFullYear(), 0, 10))
      ];

      global.Utilities.base64EncodeWebSafe = jest.fn(str => str);
      global.Utilities.base64Encode = jest.fn(str => str);

      emailManager.sendMonthlySummary(contactsWithoutYear, 0, 2024);

      const rawData = global.Utilities.base64EncodeWebSafe.mock.calls[0][0];
      expect(rawData).toContain('No Year');
      // Should not contain age info
      expect(rawData).not.toContain('wird 0 Jahre');
    });

    it('should not send email if no contacts provided', () => {
      emailManager.sendMonthlySummary([], 0, 2024);
      expect(mockGmail.Users.Messages.send).not.toHaveBeenCalled();
    });

    it('should not send email if no birthdays in specified month', () => {
      emailManager.sendMonthlySummary(mockContacts, 1, 2024); // February
      expect(mockGmail.Users.Messages.send).not.toHaveBeenCalled();
    });
  });

  describe('sendWeeklyReminder', () => {
    const mockContacts = [
      new BirthdayContact('John Doe', new Date(1990, 0, 15)),
      new BirthdayContact('Jane Smith', new Date(1985, 0, 18))
    ];

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date(2024, 0, 15));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should send reminder when birthdays exist in the window', () => {
      emailManager.sendWeeklyReminder(mockContacts, new Date(2024, 0, 15), 5);

      expect(mockGmail.Users.Messages.send).toHaveBeenCalled();
      const sendCall = mockGmail.Users.Messages.send.mock.calls[0][0];
      expect(sendCall).toHaveProperty('raw');
    });

    it('should include plain text body with contact details', () => {
      global.Utilities.base64EncodeWebSafe = jest.fn(str => str);
      global.Utilities.base64Encode = jest.fn(str => str);

      emailManager.sendWeeklyReminder(mockContacts, new Date(2024, 0, 15), 5);

      const rawData = global.Utilities.base64EncodeWebSafe.mock.calls[0][0];
      expect(rawData).toContain('John Doe');
      expect(rawData).toContain('TODAY');
    });

    it('should include contact email, phone, and instagram when available', () => {
      const richContacts = [
        new BirthdayContact('Rich Contact', new Date(1990, 0, 15), [], 'rich@example.com', '', '+491234567890', ['@richgram'])
      ];

      global.Utilities.base64EncodeWebSafe = jest.fn(str => str);
      global.Utilities.base64Encode = jest.fn(str => str);

      emailManager.sendWeeklyReminder(richContacts, new Date(2024, 0, 15), 3);

      const rawData = global.Utilities.base64EncodeWebSafe.mock.calls[0][0];
      expect(rawData).toContain('mailto:rich@example.com');
      expect(rawData).toContain('tel:+491234567890');
      expect(rawData).toContain('instagram.com/richgram');
      // Plain text part
      expect(rawData).toContain('rich@example.com');
      expect(rawData).toContain('+491234567890');
      expect(rawData).toContain('@richgram');
    });

    it('should include upcoming birthdays within the window', () => {
      global.Utilities.base64EncodeWebSafe = jest.fn(str => str);
      global.Utilities.base64Encode = jest.fn(str => str);

      emailManager.sendWeeklyReminder(mockContacts, new Date(2024, 0, 15), 5);

      const rawData = global.Utilities.base64EncodeWebSafe.mock.calls[0][0];
      // Jane Smith has birthday on Jan 18, within 5-day window from Jan 15
      expect(rawData).toContain('Jane Smith');
    });

    it('should mark today birthdays with today label and different border color', () => {
      global.Utilities.base64EncodeWebSafe = jest.fn(str => str);
      global.Utilities.base64Encode = jest.fn(str => str);

      emailManager.sendWeeklyReminder(mockContacts, new Date(2024, 0, 15), 5);

      const rawData = global.Utilities.base64EncodeWebSafe.mock.calls[0][0];
      expect(rawData).toContain('TODAY');
      expect(rawData).toContain('#ff6b6b'); // today's border color
    });

    it('should calculate correct target-year age and milestone for cross-year January birthdays in late December', () => {
      global.highlightMilestones = true;
      global.milestoneAges = [30];
      const decContacts = [
        new BirthdayContact('Milestone Jan', new Date(1995, 0, 2)) // Born Jan 2, 1995 -> turns 30 in 2025
      ];
      global.Utilities.base64EncodeWebSafe = jest.fn(str => str);
      global.Utilities.base64Encode = jest.fn(str => str);

      emailManager.sendWeeklyReminder(decContacts, new Date(2024, 11, 28), 7);

      const rawData = global.Utilities.base64EncodeWebSafe.mock.calls[0][0];
      expect(rawData).toContain('turns 30');
      expect(rawData).toContain('1 milestone');
      delete global.highlightMilestones;
      delete global.milestoneAges;
    });

    it('should not send email if no contacts provided', () => {
      emailManager.sendWeeklyReminder([]);
      expect(mockGmail.Users.Messages.send).not.toHaveBeenCalled();
    });

    it('should not send email if no birthdays in the window', () => {
      // Feb 1st — no birthdays in Jan contacts within 3 days
      emailManager.sendWeeklyReminder(mockContacts, new Date(2024, 1, 1), 3);
      expect(mockGmail.Users.Messages.send).not.toHaveBeenCalled();
    });
  });

  describe('sendSyncReport', () => {
    const mockChanges = {
      individual: {
        created: ['John Doe (15.01.2024)'],
        updated: ['Jane Smith (20.01.2024)']
      },
      summary: {
        created: ['January 2024'],
        updated: []
      }
    };

    it('should send calendar update email with correct content', () => {
      emailManager.sendSyncReport(mockChanges);

      expect(mockGmail.Users.Messages.send).toHaveBeenCalled();
      const sendCall = mockGmail.Users.Messages.send.mock.calls[0][0];
      expect(sendCall).toHaveProperty('raw');
    });

    it('should include plain text body with change details', () => {
      global.Utilities.base64EncodeWebSafe = jest.fn(str => str);
      global.Utilities.base64Encode = jest.fn(str => str);

      emailManager.sendSyncReport(mockChanges);

      const rawData = global.Utilities.base64EncodeWebSafe.mock.calls[0][0];
      expect(rawData).toContain('John Doe (15.01.2024)');
      expect(rawData).toContain('Jane Smith (20.01.2024)');
      expect(rawData).toContain('January 2024');
    });

    it('should handle only created events (no updated)', () => {
      const onlyCreated = {
        individual: { created: ['New Event'], updated: [] },
        summary: { created: [], updated: [] }
      };

      global.Utilities.base64EncodeWebSafe = jest.fn(str => str);
      global.Utilities.base64Encode = jest.fn(str => str);

      emailManager.sendSyncReport(onlyCreated);

      const rawData = global.Utilities.base64EncodeWebSafe.mock.calls[0][0];
      expect(rawData).toContain('New Event');
      expect(rawData).toContain('Created');
    });

    it('should handle only updated events (no created)', () => {
      const onlyUpdated = {
        individual: { created: [], updated: ['Updated Event'] },
        summary: { created: [], updated: [] }
      };

      global.Utilities.base64EncodeWebSafe = jest.fn(str => str);
      global.Utilities.base64Encode = jest.fn(str => str);

      emailManager.sendSyncReport(onlyUpdated);

      const rawData = global.Utilities.base64EncodeWebSafe.mock.calls[0][0];
      expect(rawData).toContain('Updated Event');
      expect(rawData).toContain('Updated');
    });

    it('should handle only summary changes (no individual)', () => {
      const onlySummary = {
        individual: { created: [], updated: [] },
        summary: { created: ['March 2024'], updated: ['April 2024'] }
      };

      global.Utilities.base64EncodeWebSafe = jest.fn(str => str);
      global.Utilities.base64Encode = jest.fn(str => str);

      emailManager.sendSyncReport(onlySummary);

      const rawData = global.Utilities.base64EncodeWebSafe.mock.calls[0][0];
      expect(rawData).toContain('March 2024');
      expect(rawData).toContain('April 2024');
    });
  });

  describe('sendContactQualityReport', () => {
    const mockContacts = [
      new BirthdayContact('Complete Contact', new Date(1990, 0, 15), ['Friends'], 'complete@example.com', '', '+491234567890'),
      new BirthdayContact('No Email', new Date(1985, 5, 20), ['Family'], '', '', '+499876543210'),
      new BirthdayContact('No Phone', new Date(1992, 3, 10), [], 'nophone@example.com', '', ''),
      new BirthdayContact('No Year', new Date(new Date().getFullYear(), 8, 5), [], '', '', ''),
    ];

    it('should send quality report with correct content', () => {
      emailManager.sendContactQualityReport(mockContacts);

      expect(mockGmail.Users.Messages.send).toHaveBeenCalled();
      const sendCall = mockGmail.Users.Messages.send.mock.calls[0][0];
      expect(sendCall).toHaveProperty('raw');
    });

    it('should include stats and missing data details', () => {
      global.Utilities.base64EncodeWebSafe = jest.fn(str => str);
      global.Utilities.base64Encode = jest.fn(str => str);

      emailManager.sendContactQualityReport(mockContacts);

      const rawData = global.Utilities.base64EncodeWebSafe.mock.calls[0][0];
      expect(rawData).toContain('No Email');
      expect(rawData).toContain('No Phone');
      expect(rawData).toContain('No Year');
      expect(rawData).toContain('4'); // total contacts
    });

    it('should not send email if no contacts provided', () => {
      emailManager.sendContactQualityReport([]);
      expect(mockGmail.Users.Messages.send).not.toHaveBeenCalled();
    });

    it('should identify complete contacts', () => {
      global.Utilities.base64EncodeWebSafe = jest.fn(str => str);
      global.Utilities.base64Encode = jest.fn(str => str);

      emailManager.sendContactQualityReport(mockContacts);

      const rawData = global.Utilities.base64EncodeWebSafe.mock.calls[0][0];
      // 1 contact has birth year + email + phone
      expect(rawData).toContain('1');
    });
  });

  describe('getEmailContext fallback', () => {
    it('should fallback to default senderName when DriveApp fails', () => {
      global.Session = {
        getActiveUser: jest.fn().mockReturnValue({
          getEmail: jest.fn().mockReturnValue('user@example.com')
        })
      };
      global.DriveApp = {
        getFileById: jest.fn().mockImplementation(() => {
          throw new Error('Drive API unauthorized');
        })
      };
      global.ScriptApp = {
        getScriptId: jest.fn().mockReturnValue('script-id')
      };

      const ctx = emailManager.getEmailContext();
      expect(ctx.senderName).toBe('Birthday Calendar Sync');
      expect(ctx.toEmail).toBe('user@example.com');
    });
  });

  describe('_daysUntil', () => {
    it('should return 0 when fromDate is the birthday', () => {
      const fromDate = new Date(2024, 0, 15);
      const bday = new Date(1990, 0, 15);
      expect(emailManager._daysUntil(fromDate, bday)).toBe(0);
    });

    it('should return correct difference in the same year', () => {
      const fromDate = new Date(2024, 0, 10);
      const bday = new Date(1990, 0, 15);
      expect(emailManager._daysUntil(fromDate, bday)).toBe(5);
    });

    it('should calculate correct difference across year boundary in a leap year', () => {
      // Dec 28, 2024 (leap year) to Jan 2 (2025) is 5 days
      const fromDate = new Date(2024, 11, 28);
      const bday = new Date(1990, 0, 2);
      expect(emailManager._daysUntil(fromDate, bday)).toBe(5);
    });

    it('should calculate correct difference for Feb 29 birthday in non-leap year (feb28)', () => {
      global.leapYearHandling = 'feb28';
      const fromDate = new Date(2025, 1, 20); // Feb 20, 2025
      const bday = new Date(2000, 1, 29);
      expect(emailManager._daysUntil(fromDate, bday)).toBe(8); // Feb 20 to Feb 28 = 8 days
      delete global.leapYearHandling;
    });

    it('should calculate correct difference for Feb 29 birthday in non-leap year (mar1)', () => {
      global.leapYearHandling = 'mar1';
      const fromDate = new Date(2025, 1, 20); // Feb 20, 2025
      const bday = new Date(2000, 1, 29);
      expect(emailManager._daysUntil(fromDate, bday)).toBe(9); // Feb 20 to Mar 1 = 9 days
      delete global.leapYearHandling;
    });
  });
});

describe('EmailTemplates', () => {
  describe('styles', () => {
    it('should return CSS styles as string', () => {
      const styles = EmailTemplates.styles;
      expect(typeof styles).toBe('string');
      expect(styles).toContain('.email-container');
      expect(styles).toContain('.birthday-list');
      expect(styles).toContain('.birthday-item');
    });
  });

  describe('header', () => {
    it('should generate header HTML with title', () => {
      const html = EmailTemplates.header('Test Title');
      expect(html).toContain('Test Title');
      expect(html).toContain('text-align: center');
      expect(html).toContain('font-size: 24px');
    });

    it('should include subtitle when provided', () => {
      const html = EmailTemplates.header('Test Title', 'Test Subtitle');
      expect(html).toContain('Test Subtitle');
      expect(html).toContain('font-size: 16px');
    });

    it('should not include subtitle element when not provided', () => {
      const html = EmailTemplates.header('Test Title');
      expect(html).not.toContain('font-size: 16px');
      expect(html).not.toContain('<p');
    });
  });

  describe('footer', () => {
    it('should generate footer with action buttons', () => {
      const html = EmailTemplates.footer();
      expect(html).toContain('border-top: 1px solid');
      expect(html).toContain('calendar.google.com');
      expect(html).toContain('contacts.google.com');
      expect(html).toContain('github.com/itsFelixH/birthday-calendar-sync');
    });

    it('should use viewCalendar label from emailTexts config', () => {
      const html = EmailTemplates.footer();
      expect(html).toContain('View Calendar');
    });

    it('should use manageContacts label from emailTexts config', () => {
      const html = EmailTemplates.footer();
      expect(html).toContain('Manage Contacts');
    });

    it('should render action buttons with button style', () => {
      const html = EmailTemplates.footer();
      expect(html).toContain(EmailTemplates.buttonStyle);
    });
  });

  describe('wrapEmail', () => {
    it('should wrap content in email template', () => {
      const content = '<p>Test content</p>';
      const html = EmailTemplates.wrapEmail(content);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<style>');
      expect(html).toContain('class="email-container"');
      expect(html).toContain(content);
    });
  });
});