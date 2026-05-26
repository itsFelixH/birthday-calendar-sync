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

    // Build the email body with formatted birthdates
    let mailBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h3>${titleText}</h3>
        <p>${greeting}</p>
        <p>${introText}</p>
        <p>${countText}</p>
        <ul style="list-style-type: none; padding: 0;">
          ${monthContacts.map(contact => `<li>${contact.getBirthdaySummaryMailString()}</li>`).join('')}
        </ul><br>
        <hr style="border:0; height:1px; background:#ccc;">
        <p style="text-align: center; margin-top: 2em;">
          <a href="https://calendar.google.com/calendar/r" style="color: #007BFF;">${viewCalendarLabel}</a><br>
          <a href="https://github.com/itsFelixH/birthday-calendar-sync" style="color: #007BFF;">Git-Repo</a>
        </p>
      </div>
    `;

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
      
      <div class="section">
        <p>${greeting}</p>
        <p>${introText}</p>
      </div>

      <div class="section">
        <h3 class="section-title">🎂 Heute</h3>
        <ul class="birthday-list">
          ${todaysContacts.map(contact => `
            <li class="birthday-item">
              <strong>${contact.name}</strong>
              ${contact.hasKnownBirthYear() ? ` - wird heute ${contact.getAgeThisYear()} Jahre alt!` : ''}
              <div class="contact-info">
                ${contact.email ? `
                  <span>📧</span>
                  <span>
                    <a href="mailto:${contact.email}"
                      class="button">Glückwunsch-Mail senden</a>
                  </span>
                ` : ''}
                ${contact.phoneNumber ? `
                  <span>📱</span>
                  <span><a href="tel:${contact.phoneNumber}" class="button">Anrufen</a></span>
                ` : ''}
                ${contact.instagramNames && contact.instagramNames.length > 0 ? `
                  <span>📸</span>
                  <span>${contact.instagramNames.map(name =>
      `<a href="https://instagram.com/${name.replace('@', '')}" class="button">${name}</a>`
    ).join(' ')}</span>
                ` : ''}
              </div>
            </li>
          `).join('')}
        </ul>
      </div>

      ${nextDaysContacts.length > 0 ? `
        <div class="section">
          <h3 class="section-title">${upcomingHeader}</h3>
          <p>${upcomingIntro}</p>
          <ul class="birthday-list">
            ${nextDaysContacts.map(contact => `
              <li class="birthday-item">
                <strong>${contact.name}</strong> - 
                ${contact.getBirthdayLongMonthFormat()}
                <div class="contact-info">
                  ${contact.email ? `<span>📧 ${contact.email}</span>` : ''}
                  ${contact.phoneNumber ? `<span>📱 ${contact.phoneNumber}</span>` : ''}
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      <div class="action-buttons">
        <a href="https://calendar.google.com/calendar/r" class="button">${viewCalendarLabel}</a>
        <a href="https://contacts.google.com" class="button">${manageContactsLabel}</a>
        <a href="https://github.com/itsFelixH/birthday-calendar-sync" class="button">Git-Repo</a>
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

    let mailBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h3>${titleText}</h3>
        <p>${greeting}</p>
        <p>${introText}</p>`;

    if (changes.individual.created.length > 0 || changes.individual.updated.length > 0) {
      mailBody += `<h4>${individualHeader}</h4>`;

      if (changes.individual.created.length > 0) {
        mailBody += `<p>${createdLabel}</p><ul>`;
        changes.individual.created.forEach(event => {
          mailBody += `<li>${event}</li>`;
        });
        mailBody += `</ul>`;
      }

      if (changes.individual.updated.length > 0) {
        mailBody += `<p>${updatedLabel}</p><ul>`;
        changes.individual.updated.forEach(event => {
          mailBody += `<li>${event}</li>`;
        });
        mailBody += `</ul>`;
      }
    }

    if (changes.summary.created.length > 0 || changes.summary.updated.length > 0) {
      mailBody += `<h4>${summaryHeader}</h4>`;

      if (changes.summary.created.length > 0) {
        mailBody += `<p>${createdLabel}</p><ul>`;
        changes.summary.created.forEach(event => {
          mailBody += `<li>${event}</li>`;
        });
        mailBody += `</ul>`;
      }

      if (changes.summary.updated.length > 0) {
        mailBody += `<p>${updatedLabel}</p><ul>`;
        changes.summary.updated.forEach(event => {
          mailBody += `<li>${event}</li>`;
        });
        mailBody += `</ul>`;
      }
    }

    mailBody += `
        <hr style="border:0; height:1px; background:#ccc;">
        <p style="text-align: center; margin-top: 2em;">
          <a href="https://calendar.google.com/calendar/r" style="color: #007BFF;">${viewCalendarLabel}</a><br>
          <a href="https://github.com/itsFelixH/birthday-calendar-sync" style="color: #007BFF;">Git-Repo</a>
        </p>
      </div>
    `;

    this.sendMail(toEmail, fromEmail, senderName, subject, '', mailBody);
    Logger.log('Calendar update email sent successfully!');
  }
}


/**
 * Email templates and styling for birthday notifications
 */
class EmailTemplates {
  /**
   * CSS styles for email templates
   */
  static get styles() {
    return `
      .email-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .header {
        text-align: center;
        margin-bottom: 30px;
      }
      .title {
        color: #1a1a1a;
        font-size: 24px;
        font-weight: bold;
        margin: 10px 0;
      }
      .subtitle {
        color: #666;
        font-size: 16px;
        margin: 10px 0;
      }
      .section {
        margin: 20px 0;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 6px;
      }
      .section-title {
        color: #2c3e50;
        font-size: 18px;
        margin-bottom: 15px;
        border-bottom: 2px solid #e9ecef;
        padding-bottom: 5px;
      }
      .birthday-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .birthday-item {
        padding: 10px;
        margin: 5px 0;
        border-left: 4px solid #007bff;
        background: white;
        transition: all 0.2s;
      }
      .birthday-item:hover {
        transform: translateX(5px);
      }
      .contact-info {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 10px;
        align-items: center;
        margin-top: 5px;
        font-size: 14px;
        color: #666;
      }
      .action-buttons {
        margin-top: 15px;
        text-align: center;
      }
      .button {
        display: inline-block;
        padding: 8px 16px;
        margin: 0 5px;
        background-color: #007bff;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        font-size: 14px;
        transition: background-color 0.2s;
      }
      .button:hover {
        background-color: #0056b3;
      }
      .stats {
        display: flex;
        justify-content: space-around;
        margin: 20px 0;
        text-align: center;
      }
      .stat-item {
        flex: 1;
        padding: 10px;
      }
      .stat-number {
        font-size: 24px;
        font-weight: bold;
        color: #007bff;
      }
      .stat-label {
        font-size: 14px;
        color: #666;
      }
      .footer {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #eaeaea;
        text-align: center;
        font-size: 12px;
        color: #666;
      }
      .footer a {
        color: #007bff;
        text-decoration: none;
      }
      .footer a:hover {
        text-decoration: underline;
      }
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
      <div class="header">
        <h1 class="title">${title}</h1>
        ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ''}
      </div>
    `;
  }

  /**
   * Creates a footer section for the email
   * @returns {string} HTML for the footer section
   */
  static footer() {
    return `
      <div class="footer">
        <p>
          Sent by Birthday Calendar Sync •
          <a href="https://calendar.google.com/calendar/r">View Calendar</a> •
          <a href="https://contacts.google.com">Manage Contacts</a> •
          <a href="https://github.com/itsFelixH/birthday-calendar-sync">GitHub Repo</a>
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
      <body>
        <div class="email-container">
          ${content}
        </div>
      </body>
      </html>
    `;
  }
}