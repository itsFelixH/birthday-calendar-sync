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
  });

  describe('sendMonthlyBirthdaySummaryMail', () => {
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
      emailManager.sendMonthlyBirthdaySummaryMail(mockContacts, 0, 2024);

      expect(mockGmail.Users.Messages.send).toHaveBeenCalled();
      const sendCall = mockGmail.Users.Messages.send.mock.calls[0][0];
      expect(sendCall).toHaveProperty('raw');
    });

    it('should not send email if no contacts provided', () => {
      emailManager.sendMonthlyBirthdaySummaryMail([], 0, 2024);
      expect(mockGmail.Users.Messages.send).not.toHaveBeenCalled();
    });

    it('should not send email if no birthdays in specified month', () => {
      emailManager.sendMonthlyBirthdaySummaryMail(mockContacts, 1, 2024); // February
      expect(mockGmail.Users.Messages.send).not.toHaveBeenCalled();
    });
  });

  describe('sendDailyBirthdayMail', () => {
    const mockContacts = [
      new BirthdayContact('John Doe', new Date(1990, 0, 15)),
      new BirthdayContact('Jane Smith', new Date(1985, 0, 20))
    ];

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date(2024, 0, 15));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should send daily birthday email with correct content', () => {
      emailManager.sendDailyBirthdayMail(mockContacts);

      expect(mockGmail.Users.Messages.send).toHaveBeenCalled();
      const sendCall = mockGmail.Users.Messages.send.mock.calls[0][0];
      expect(sendCall).toHaveProperty('raw');
    });

    it('should not send email if no contacts provided', () => {
      emailManager.sendDailyBirthdayMail([]);
      expect(mockGmail.Users.Messages.send).not.toHaveBeenCalled();
    });

    it('should not send email if no birthdays today', () => {
      jest.setSystemTime(new Date(2024, 1, 1)); // February 1st
      emailManager.sendDailyBirthdayMail(mockContacts);
      expect(mockGmail.Users.Messages.send).not.toHaveBeenCalled();
    });
  });

  describe('sendCalendarUpdateEmail', () => {
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
      emailManager.sendCalendarUpdateEmail(mockChanges);

      expect(mockGmail.Users.Messages.send).toHaveBeenCalled();
      const sendCall = mockGmail.Users.Messages.send.mock.calls[0][0];
      expect(sendCall).toHaveProperty('raw');
    });
  });
});

describe('EmailTemplates', () => {
  describe('styles', () => {
    it('should return CSS styles as string', () => {
      const styles = EmailTemplates.styles;
      expect(typeof styles).toBe('string');
      expect(styles).toContain('.email-container');
      expect(styles).toContain('.header');
      expect(styles).toContain('.button');
    });
  });

  describe('header', () => {
    it('should generate header HTML with title', () => {
      const html = EmailTemplates.header('Test Title');
      expect(html).toContain('Test Title');
      expect(html).toContain('class="header"');
      expect(html).toContain('class="title"');
    });

    it('should include subtitle when provided', () => {
      const html = EmailTemplates.header('Test Title', 'Test Subtitle');
      expect(html).toContain('Test Subtitle');
      expect(html).toContain('class="subtitle"');
    });
  });

  describe('footer', () => {
    it('should generate footer HTML with links', () => {
      const html = EmailTemplates.footer();
      expect(html).toContain('class="footer"');
      expect(html).toContain('View Calendar');
      expect(html).toContain('Manage Contacts');
      expect(html).toContain('GitHub Repo');
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