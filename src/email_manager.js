/**
 * Email Manager class to handle all email-related functionality
 */
class EmailManager {
  constructor() {
    this.templates = EmailTemplates;
  }


  /**
   * Gets common email context (sender, recipient, names).
   * @returns {{toEmail: string, fromEmail: string, senderName: string, recipientName: string}}
   */
  getEmailContext() {
    return {
      toEmail: Session.getActiveUser().getEmail(),
      fromEmail: Session.getActiveUser().getEmail(),
      senderName: DriveApp.getFileById(ScriptApp.getScriptId()).getName(),
      recipientName: getCurrentUserFirstName()
    };
  }


  /**
   * Sends an email with the specified parameters
   * @param {string} toEmail - Recipient email address
   * @param {string} fromEmail - Sender email address
   * @param {string} senderName - Name of the sender
   * @param {string} subject - Email subject
   * @param {string} textBody - Plain text email body
   * @param {string} htmlBody - HTML email body
   */
  sendMail(toEmail, fromEmail, senderName, subject, textBody, htmlBody) {
    const boundary = "boundaryboundary";
    const mailData = [
      `MIME-Version: 1.0`,
      `To: ${toEmail}`,
      `From: "${senderName}" <${fromEmail}>`,
      `Subject: =?UTF-8?B?${Utilities.base64Encode(subject, Utilities.Charset.UTF_8)}?=`,
      `Content-Type: multipart/alternative; boundary=${boundary}`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      textBody,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      Utilities.base64Encode(htmlBody, Utilities.Charset.UTF_8),
      ``,
      `--${boundary}--`,
    ].join("\r\n");

    const rawMessage = Utilities.base64EncodeWebSafe(mailData);
    Gmail.Users.Messages.send({ raw: rawMessage }, "me");
  }


  /**
   * Creates and sends a monthly birthday summary email
   * @param {BirthdayContact[]} contacts - Array of contacts
   * @param {number} month - Month number (0-11)
   * @param {number} year - Year
   */
  sendMonthlyBirthdaySummaryMail(contacts, month, year = new Date().getFullYear()) {
    if (contacts.length === 0) {
      Logger.log("No contacts found. Aborting.");
      return;
    }

    const startDate = new Date(year, month, 1);
    const monthName = Utilities.formatDate(startDate, Session.getScriptTimeZone(), "MMMM");
    Logger.log(`Creating summary mail for ${monthName} ${year}...`);

    // Filter contacts with birthdays in the specified month
    const monthContacts = contacts.filter(contact => contact.birthday.getMonth() === month)
      .sort((a, b) => a.birthday.getDate() - b.birthday.getDate() || a.name.localeCompare(b.name));

    if (monthContacts.length === 0) {
      Logger.log('No birthdays found for this month.');
      return;
    }

    const numBirthdays = monthContacts.length;
    const { toEmail, fromEmail, senderName, recipientName } = this.getEmailContext();

    const subjects = typeof emailSubjects !== 'undefined' ? emailSubjects : {};
    const texts = typeof emailTexts !== 'undefined' ? emailTexts : {};
    const subject = subjects.monthlySummary || '🎂 Geburtstags Reminder 🎂';
    const greetingTemplate = texts.greeting || 'Hallo{name},';
    const greeting = greetingTemplate.replace('{name}', recipientName ? ` ${recipientName}` : '');
    const titleText = (texts.monthlySummaryTitle || '🎉 Geburtstage im {month}').replace('{month}', monthNamesLong[month]);
    const introText = (texts.monthlySummaryIntro || 'Mach dich bereit zum Feiern! Hier sind die Geburtstage deiner Kontakte im {month} {year}. Vergiss nicht, ihnen zu gratulieren!')
      .replace('{month}', monthNamesLong[month]).replace('{year}', year);
    const countText = (texts.monthlySummaryCount || 'Insgesamt gibt es {count} Geburtstag(e) in diesem Monat:')
      .replace('{count}', numBirthdays);
    const viewCalendarLabel = texts.viewCalendar || 'Google Kalender anzeigen';

    // Build the email content using templates
    const content = `
      ${this.templates.header(titleText, `${monthNamesLong[month]} ${year}`)}

      <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 6px;">
        <p>${greeting}</p>
        <p>${introText}</p>
        <p>${countText}</p>
      </div>

      <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 6px;">
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${monthContacts.map(contact => `
            <li style="padding: 6px 0; border-bottom: 1px solid #eee;">${contact.getBirthdaySummaryMailString()}</li>
          `).join('')}
        </ul>
      </div>

      <div style="margin-top: 15px; text-align: center;">
        <a href="https://calendar.google.com/calendar/r" style="display: inline-block; padding: 8px 16px; margin: 4px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px;">${viewCalendarLabel}</a>
        <a href="https://github.com/itsFelixH/birthday-calendar-sync" style="display: inline-block; padding: 8px 16px; margin: 4px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px;">Git-Repo</a>
      </div>

      ${this.templates.footer()}
    `;

    const mailBody = this.templates.wrapEmail(content);
    this.sendMail(toEmail, fromEmail, senderName, subject, '', mailBody);
    Logger.log(`Birthday summary email sent successfully!`);
  }


  /**
   * Sends daily birthday reminder emails
   * @param {BirthdayContact[]} contacts - Array of contacts
   * @param {Date} date - Date to check for birthdays
   * @param {number} previewDays - Number of days to preview upcoming birthdays
   */
  sendDailyBirthdayMail(contacts, date = new Date(), previewDays = 5) {
    if (contacts.length === 0) {
      Logger.log("No contacts found. Aborting.");
      return;
    }

    const startDate = new Date(date);
    startDate.setDate(date.getDate() + 1);
    const endDate = new Date(date);
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    endDate.setTime(date.getTime() + (previewDays * millisecondsPerDay));
    const day = date.getDate();
    const month = date.getMonth();

    Logger.log(`Creating daily mail`);

    // Filter contacts with birthdays in the specified time
    const todaysContacts = getContactsByBirthday(contacts, day, month);
    const nextDaysContacts = getContactsByBirthdayBetweenDates(contacts, startDate, endDate);

    // Check if there are any birthdays in the specified timespan
    if (todaysContacts.length === 0) {
      Logger.log('No birthdays found for today.');
      return;
    }

    const { toEmail, fromEmail, senderName, recipientName } = this.getEmailContext();
    const subjects = typeof emailSubjects !== 'undefined' ? emailSubjects : {};
    const texts = typeof emailTexts !== 'undefined' ? emailTexts : {};
    const subject = subjects.dailyReminder || '🎁 Heutige Geburtstage 🎁';
    const greetingTemplate = texts.greeting || 'Hallo{name},';
    const greeting = greetingTemplate.replace('{name}', recipientName ? ` ${recipientName}` : '');
    const titleText = texts.dailyReminderTitle || '🎉 Heutige Geburtstage';
    const introText = (texts.dailyReminderIntro || 'Heute haben {count} deiner Kontakte Geburtstag. Hier sind alle Details, die du brauchst, um zu gratulieren:')
      .replace('{count}', todaysContacts.length);
    const upcomingHeader = texts.dailyReminderUpcomingHeader || '📅 Kommende Geburtstage';
    const upcomingIntro = (texts.dailyReminderUpcomingIntro || 'In den nächsten {days} Tagen haben {count} deiner Kontakte Geburtstag:')
      .replace('{days}', previewDays).replace('{count}', nextDaysContacts.length);
    const viewCalendarLabel = texts.viewCalendar || 'Google Kalender anzeigen';
    const manageContactsLabel = texts.manageContacts || 'Kontakte verwalten';

    // Build the email content
    const content = `
      ${this.templates.header(titleText, `${day}. ${monthNamesLong[month]} ${date.getFullYear()}`)}
      
      <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 6px;">
        <p>${greeting}</p>
        <p>${introText}</p>
      </div>

      <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 6px;">
        <h3 style="color: #2c3e50; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e9ecef; padding-bottom: 5px;">🎂 Heute</h3>
        <ul class="birthday-list" style="list-style: none; padding: 0; margin: 0;">
          ${todaysContacts.map(contact => `
            <li class="birthday-item" style="padding: 10px; margin: 5px 0; border-left: 4px solid #007bff; background: #ffffff;">
              <strong>${contact.name}</strong>
              ${contact.hasKnownBirthYear() ? ` - wird heute ${contact.getAgeThisYear()} Jahre alt!` : ''}
              <div class="contact-info" style="margin-top: 8px; font-size: 14px; color: #666666;">
                ${contact.email ? `
                  <span style="display: block; margin: 4px 0;">📧
                    <a href="mailto:${contact.email}"
                      style="display: inline-block; padding: 6px 12px; margin: 2px 4px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px;">Glückwunsch-Mail senden</a>
                  </span>
                ` : ''}
                ${contact.phoneNumber ? `
                  <span style="display: block; margin: 4px 0;">📱
                    <a href="tel:${contact.phoneNumber}" style="display: inline-block; padding: 6px 12px; margin: 2px 4px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px;">Anrufen</a>
                  </span>
                ` : ''}
                ${contact.instagramNames && contact.instagramNames.length > 0 ? `
                  <span style="display: block; margin: 4px 0;">📸
                    ${contact.instagramNames.map(name =>
      `<a href="https://instagram.com/${name.replace('@', '')}" style="display: inline-block; padding: 6px 12px; margin: 2px 4px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px;">${name}</a>`
    ).join(' ')}
                  </span>
                ` : ''}
              </div>
            </li>
          `).join('')}
        </ul>
      </div>

      ${nextDaysContacts.length > 0 ? `
        <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 6px;">
          <h3 style="color: #2c3e50; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e9ecef; padding-bottom: 5px;">${upcomingHeader}</h3>
          <p>${upcomingIntro}</p>
          <ul class="birthday-list" style="list-style: none; padding: 0; margin: 0;">
            ${nextDaysContacts.map(contact => `
              <li class="birthday-item" style="padding: 10px; margin: 5px 0; border-left: 4px solid #007bff; background: #ffffff;">
                <strong>${contact.name}</strong> - 
                ${contact.getBirthdayLongMonthFormat()}
                <div class="contact-info" style="margin-top: 8px; font-size: 14px; color: #666666;">
                  ${contact.email ? `<span style="display: block; margin: 4px 0;">📧 ${contact.email}</span>` : ''}
                  ${contact.phoneNumber ? `<span style="display: block; margin: 4px 0;">📱 ${contact.phoneNumber}</span>` : ''}
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      <div style="margin-top: 15px; text-align: center;">
        <a href="https://calendar.google.com/calendar/r" style="display: inline-block; padding: 8px 16px; margin: 4px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px;">${viewCalendarLabel}</a>
        <a href="https://contacts.google.com" style="display: inline-block; padding: 8px 16px; margin: 4px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px;">${manageContactsLabel}</a>
        <a href="https://github.com/itsFelixH/birthday-calendar-sync" style="display: inline-block; padding: 8px 16px; margin: 4px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px;">Git-Repo</a>
      </div>

      ${this.templates.footer()}
    `;

    const mailBody = this.templates.wrapEmail(content);
    this.sendMail(toEmail, fromEmail, senderName, subject, '', mailBody);
    Logger.log(`Daily reminder email sent successfully!`);
  }


  /**
   * Sends an email with details about calendar changes
   * @param {Object} changes - Object containing calendar changes
   */
  sendCalendarUpdateEmail(changes) {
    const { toEmail, fromEmail, senderName, recipientName } = this.getEmailContext();

    const subjects = typeof emailSubjects !== 'undefined' ? emailSubjects : {};
    const texts = typeof emailTexts !== 'undefined' ? emailTexts : {};
    const subject = subjects.calendarUpdate || '📅 Geburtstags Updates 📅';
    const greetingTemplate = texts.greeting || 'Hallo{name},';
    const greeting = greetingTemplate.replace('{name}', recipientName ? ` ${recipientName}` : '');
    const titleText = texts.calendarUpdateTitle || '🔄 Updates zu Geburtstags-Events';
    const introText = texts.calendarUpdateIntro || 'Die folgenden Geburtstags-Events wurden deinem Kalender hinzugefügt:';
    const individualHeader = texts.calendarUpdateIndividualHeader || 'Individuelle Geburtstage:';
    const summaryHeader = texts.calendarUpdateSummaryHeader || 'Monatliche Geburtstagsübersichten:';
    const createdLabel = texts.calendarUpdateCreated || '✨ Neu erstellt:';
    const updatedLabel = texts.calendarUpdateUpdated || '🔄 Aktualisiert:';
    const viewCalendarLabel = texts.viewCalendar || 'Google Kalender anzeigen';

    // Build change sections
    let changeSections = '';

    if (changes.individual.created.length > 0 || changes.individual.updated.length > 0) {
      changeSections += `
        <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 6px;">
          <h3 style="color: #2c3e50; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e9ecef; padding-bottom: 5px;">${individualHeader}</h3>
          ${changes.individual.created.length > 0 ? `
            <p><strong>${createdLabel}</strong></p>
            <ul style="padding-left: 20px; margin: 5px 0 15px;">
              ${changes.individual.created.map(event => `<li>${event}</li>`).join('')}
            </ul>
          ` : ''}
          ${changes.individual.updated.length > 0 ? `
            <p><strong>${updatedLabel}</strong></p>
            <ul style="padding-left: 20px; margin: 5px 0 15px;">
              ${changes.individual.updated.map(event => `<li>${event}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `;
    }

    if (changes.summary.created.length > 0 || changes.summary.updated.length > 0) {
      changeSections += `
        <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 6px;">
          <h3 style="color: #2c3e50; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e9ecef; padding-bottom: 5px;">${summaryHeader}</h3>
          ${changes.summary.created.length > 0 ? `
            <p><strong>${createdLabel}</strong></p>
            <ul style="padding-left: 20px; margin: 5px 0 15px;">
              ${changes.summary.created.map(event => `<li>${event}</li>`).join('')}
            </ul>
          ` : ''}
          ${changes.summary.updated.length > 0 ? `
            <p><strong>${updatedLabel}</strong></p>
            <ul style="padding-left: 20px; margin: 5px 0 15px;">
              ${changes.summary.updated.map(event => `<li>${event}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `;
    }

    // Build the email content using templates
    const content = `
      ${this.templates.header(titleText)}

      <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 6px;">
        <p>${greeting}</p>
        <p>${introText}</p>
      </div>

      ${changeSections}

      <div style="margin-top: 15px; text-align: center;">
        <a href="https://calendar.google.com/calendar/r" style="display: inline-block; padding: 8px 16px; margin: 4px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px;">${viewCalendarLabel}</a>
        <a href="https://github.com/itsFelixH/birthday-calendar-sync" style="display: inline-block; padding: 8px 16px; margin: 4px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px;">Git-Repo</a>
      </div>

      ${this.templates.footer()}
    `;

    const mailBody = this.templates.wrapEmail(content);
    this.sendMail(toEmail, fromEmail, senderName, subject, '', mailBody);
    Logger.log('Calendar update email sent successfully!');
  }
}


/**
 * Email templates and styling for birthday notifications
 */
class EmailTemplates {
  /**
   * CSS styles for email templates.
   * Kept minimal as progressive enhancement — critical styles are inlined on elements.
   */
  static get styles() {
    return `
      body { margin: 0; padding: 0; background-color: #f4f4f4; }
      .email-container { max-width: 600px; margin: 0 auto; }
      .section { margin: 20px 0; }
      .birthday-list { list-style: none; padding: 0; margin: 0; }
      .birthday-item { padding: 10px; margin: 5px 0; border-left: 4px solid #007bff; background: #ffffff; }
      .contact-info { margin-top: 8px; font-size: 14px; color: #666666; }
      .contact-info span { display: block; margin: 4px 0; }
    `;
  }

  /**
   * Creates a header section for the email
   * @param {string} title - Main title
   * @param {string} subtitle - Optional subtitle
   * @returns {string} HTML for the header section
   */
  static header(title, subtitle = '') {
    return `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1a1a1a; font-size: 24px; font-weight: bold; margin: 10px 0;">${title}</h1>
        ${subtitle ? `<p style="color: #666666; font-size: 16px; margin: 10px 0;">${subtitle}</p>` : ''}
      </div>
    `;
  }

  /**
   * Creates a footer section for the email
   * @returns {string} HTML for the footer section
   */
  static footer() {
    return `
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; font-size: 12px; color: #666666;">
        <p>
          Sent by Birthday Calendar Sync &#8226;
          <a href="https://calendar.google.com/calendar/r" style="color: #007bff; text-decoration: none;">View Calendar</a> &#8226;
          <a href="https://contacts.google.com" style="color: #007bff; text-decoration: none;">Manage Contacts</a> &#8226;
          <a href="https://github.com/itsFelixH/birthday-calendar-sync" style="color: #007bff; text-decoration: none;">GitHub Repo</a>
        </p>
      </div>
    `;
  }

  /**
   * Wraps email content in a standard template with styles
   * @param {string} content - Email content to wrap
   * @returns {string} Complete HTML email
   */
  static wrapEmail(content) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>${this.styles}</style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
        <div class="email-container" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          ${content}
        </div>
      </body>
      </html>
    `;
  }
}