/**
 * Email Manager class to handle all email-related functionality
 */
class EmailManager {
  constructor() {
    this.templates = EmailTemplates;
    this.subjects = typeof emailSubjects !== 'undefined' ? emailSubjects : {};
    this.texts = typeof emailTexts !== 'undefined' ? emailTexts : {};
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
    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
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
  sendMonthlySummary(contacts, month, year = new Date().getFullYear()) {
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

    const subject = this.subjects.monthlySummary || '🎂 Geburtstags Reminder 🎂';
    const greetingTemplate = this.texts.greeting || 'Hallo{name},';
    const greeting = greetingTemplate.replace('{name}', recipientName ? ` ${recipientName}` : '');
    const titleText = (this.texts.monthlySummaryTitle || '🎉 Geburtstage im {month}').replace('{month}', monthNamesLong[month]);
    const introText = (this.texts.monthlySummaryIntro || 'Mach dich bereit zum Feiern! Hier sind die Geburtstage deiner Kontakte im {month} {year}. Vergiss nicht, ihnen zu gratulieren!')
      .replace('{month}', monthNamesLong[month]).replace('{year}', year);
    const countText = (this.texts.monthlySummaryCount || 'Insgesamt gibt es {count} Geburtstag(e) in diesem Monat:')
      .replace('{count}', numBirthdays);
    const viewCalendarLabel = this.texts.viewCalendar || 'Google Kalender anzeigen';

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

      ${this.templates.footer()}
    `;

    const mailBody = this.templates.wrapEmail(content);
    const textBody = [
      titleText,
      `${monthNamesLong[month]} ${year}`,
      '',
      greeting,
      introText,
      countText,
      '',
      ...monthContacts.map(contact => {
        let line = `${('0' + contact.birthday.getDate()).slice(-2)}. ${monthNamesLong[contact.birthday.getMonth()]}: ${contact.name}`;
        if (contact.hasKnownBirthYear()) line += ` (wird ${contact.getAgeThisYear()} Jahre)`;
        return `  • ${line}`;
      }),
      '',
      `${viewCalendarLabel}: https://calendar.google.com/calendar/r`,
    ].join('\n');

    this.sendMail(toEmail, fromEmail, senderName, subject, textBody, mailBody);
    Logger.log(`Birthday summary email sent successfully!`);
  }


  /**
   * Sends a birthday reminder email for upcoming birthdays within a configurable window.
   * @param {BirthdayContact[]} contacts - Array of contacts
   * @param {Date} date - Reference date (today)
   * @param {number} daysBefore - How many days ahead to look for birthdays
   */
  sendBirthdayReminder(contacts, date = new Date(), daysBefore = 3) {
    if (contacts.length === 0) {
      Logger.log("No contacts found. Aborting.");
      return;
    }

    const day = date.getDate();
    const month = date.getMonth();
    const endDate = new Date(date);
    endDate.setDate(date.getDate() + daysBefore);

    Logger.log(`Creating birthday reminder (next ${daysBefore} days)...`);

    // Get all contacts with birthdays in the window (today through today + daysBefore)
    const reminderContacts = contacts.filter(contact => {
      const bMonth = contact.birthday.getMonth();
      const bDay = contact.birthday.getDate();
      // Check each day in the window
      for (let i = 0; i <= daysBefore; i++) {
        const checkDate = new Date(date);
        checkDate.setDate(date.getDate() + i);
        if (bMonth === checkDate.getMonth() && bDay === checkDate.getDate()) {
          return true;
        }
      }
      return false;
    }).sort((a, b) => {
      // Sort by days until birthday
      const aDays = this._daysUntil(date, a.birthday);
      const bDays = this._daysUntil(date, b.birthday);
      return aDays - bDays || a.name.localeCompare(b.name);
    });

    if (reminderContacts.length === 0) {
      Logger.log('No birthdays in the reminder window.');
      return;
    }

    const { toEmail, fromEmail, senderName, recipientName } = this.getEmailContext();
    const subject = this.subjects.birthdayReminder || '🎂 Geburtstags-Reminder';
    const greetingTemplate = this.texts.greeting || 'Hallo{name},';
    const greeting = greetingTemplate.replace('{name}', recipientName ? ` ${recipientName}` : '');
    const titleText = this.texts.birthdayReminderTitle || '🎉 Geburtstags-Reminder';
    const introText = (this.texts.birthdayReminderIntro || '{count} deiner Kontakte haben in den nächsten {days} Tagen Geburtstag:')
      .replace('{count}', reminderContacts.length).replace('{days}', daysBefore);
    const todayLabel = this.texts.birthdayReminderTodayLabel || 'HEUTE';

    // Build HTML content
    const contactListHtml = reminderContacts.map(contact => {
      const daysUntil = this._daysUntil(date, contact.birthday);
      const isToday = daysUntil === 0;
      const dateLabel = isToday
        ? `🎂 ${todayLabel}`
        : `📅 ${('0' + contact.birthday.getDate()).slice(-2)}. ${monthNamesLong[contact.birthday.getMonth()]}`;

      const ageText = contact.hasKnownBirthYear()
        ? ` (wird ${contact.getAgeThisYear()}${isToday ? '!' : ''})`
        : '';

      const borderColor = isToday ? '#ff6b6b' : '#007bff';

      let contactInfo = '';
      if (contact.email) contactInfo += `<span style="display: inline; margin-right: 12px;">📧 <a href="mailto:${contact.email}" style="color: #007bff; text-decoration: none;">${contact.email}</a></span>`;
      if (contact.phoneNumber) contactInfo += `<span style="display: inline; margin-right: 12px;">📱 <a href="tel:${contact.phoneNumber}" style="color: #007bff; text-decoration: none;">${contact.phoneNumber}</a></span>`;
      if (contact.instagramNames && contact.instagramNames.length > 0) {
        contact.instagramNames.forEach(name => {
          contactInfo += `<span style="display: inline; margin-right: 12px;">📸 <a href="https://instagram.com/${name.replace('@', '')}" style="color: #007bff; text-decoration: none;">${name}</a></span>`;
        });
      }

      return `
        <li style="padding: 10px; margin: 5px 0; border-left: 4px solid ${borderColor}; background: #ffffff;">
          <strong>${dateLabel} — ${contact.name}</strong>${ageText}
          ${contactInfo ? `<div style="margin-top: 6px; font-size: 13px; color: #666666;">${contactInfo}</div>` : ''}
        </li>
      `;
    }).join('');

    const content = `
      ${this.templates.header(titleText, `${day}. ${monthNamesLong[month]} ${date.getFullYear()}`)}

      <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 6px;">
        <p>${greeting}</p>
        <p>${introText}</p>
      </div>

      <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 6px;">
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${contactListHtml}
        </ul>
      </div>

      ${this.templates.footer()}
    `;

    // Build plain text
    const textLines = [
      titleText,
      `${day}. ${monthNamesLong[month]} ${date.getFullYear()}`,
      '',
      greeting,
      introText,
      '',
      '─'.repeat(30),
      ...reminderContacts.map(contact => {
        const daysUntil = this._daysUntil(date, contact.birthday);
        const isToday = daysUntil === 0;
        const dateLabel = isToday
          ? `🎂 ${todayLabel}`
          : `📅 ${('0' + contact.birthday.getDate()).slice(-2)}. ${monthNamesLong[contact.birthday.getMonth()]}`;

        let line = `  ${dateLabel} — ${contact.name}`;
        if (contact.hasKnownBirthYear()) line += ` (wird ${contact.getAgeThisYear()})`;
        if (contact.email) line += `\n    📧 ${contact.email}`;
        if (contact.phoneNumber) line += `\n    📱 ${contact.phoneNumber}`;
        if (contact.instagramNames && contact.instagramNames.length > 0) {
          line += `\n    📸 ${contact.instagramNames.join(', ')}`;
        }
        return line;
      }),
    ];

    const textBody = textLines.join('\n');
    const mailBody = this.templates.wrapEmail(content);
    this.sendMail(toEmail, fromEmail, senderName, subject, textBody, mailBody);
    Logger.log(`Birthday reminder email sent successfully!`);
  }


  /**
   * Calculates days from a reference date until a contact's next birthday occurrence.
   * @param {Date} fromDate - Reference date
   * @param {Date} birthday - Contact's birthday
   * @returns {number} Days until the birthday (0 = today)
   * @private
   */
  _daysUntil(fromDate, birthday) {
    const thisYear = new Date(fromDate.getFullYear(), birthday.getMonth(), birthday.getDate());
    const diffMs = thisYear.getTime() - fromDate.getTime();
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
    return diffDays >= 0 ? diffDays : diffDays + 365;
  }


  /**
   * Sends an email with details about calendar changes
   * @param {Object} changes - Object containing calendar changes
   */
  sendSyncReport(changes) {
    const { toEmail, fromEmail, senderName, recipientName } = this.getEmailContext();

    const subject = this.subjects.syncReport || '📅 Geburtstags Updates 📅';
    const greetingTemplate = this.texts.greeting || 'Hallo{name},';
    const greeting = greetingTemplate.replace('{name}', recipientName ? ` ${recipientName}` : '');
    const titleText = this.texts.syncReportTitle || '🔄 Updates zu Geburtstags-Events';
    const introText = this.texts.syncReportIntro || 'Die folgenden Geburtstags-Events wurden deinem Kalender hinzugefügt:';
    const individualHeader = this.texts.syncReportIndividualHeader || 'Individuelle Geburtstage:';
    const summaryHeader = this.texts.syncReportSummaryHeader || 'Monatliche Geburtstagsübersichten:';
    const createdLabel = this.texts.syncReportCreated || '✨ Neu erstellt:';
    const updatedLabel = this.texts.syncReportUpdated || '🔄 Aktualisiert:';
    const viewCalendarLabel = this.texts.viewCalendar || 'Google Kalender anzeigen';

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

      ${this.templates.footer()}
    `;

    const mailBody = this.templates.wrapEmail(content);
    const textLines = [
      titleText,
      '',
      greeting,
      introText,
    ];

    if (changes.individual.created.length > 0 || changes.individual.updated.length > 0) {
      textLines.push('', individualHeader);
      if (changes.individual.created.length > 0) {
        textLines.push(`  ${createdLabel}`);
        changes.individual.created.forEach(event => textLines.push(`    • ${event}`));
      }
      if (changes.individual.updated.length > 0) {
        textLines.push(`  ${updatedLabel}`);
        changes.individual.updated.forEach(event => textLines.push(`    • ${event}`));
      }
    }

    if (changes.summary.created.length > 0 || changes.summary.updated.length > 0) {
      textLines.push('', summaryHeader);
      if (changes.summary.created.length > 0) {
        textLines.push(`  ${createdLabel}`);
        changes.summary.created.forEach(event => textLines.push(`    • ${event}`));
      }
      if (changes.summary.updated.length > 0) {
        textLines.push(`  ${updatedLabel}`);
        changes.summary.updated.forEach(event => textLines.push(`    • ${event}`));
      }
    }

    textLines.push(
      '',
      `${viewCalendarLabel}: https://calendar.google.com/calendar/r`
    );

    const textBody = textLines.join('\n');
    this.sendMail(toEmail, fromEmail, senderName, subject, textBody, mailBody);
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
   * Inline style for button links.
   */
  static get buttonStyle() {
    return 'display: inline-block; padding: 8px 16px; margin: 4px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px;';
  }

  /**
   * Inline style for smaller action buttons within contact cards.
   */
  static get buttonSmallStyle() {
    return 'display: inline-block; padding: 6px 12px; margin: 2px 4px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px;';
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
   * Creates a footer section with action buttons and attribution
   * @returns {string} HTML for the footer section
   */
  static footer() {
    const texts = typeof emailTexts !== 'undefined' ? emailTexts : {};
    const viewCalendarLabel = texts.viewCalendar || 'Google Kalender anzeigen';
    const manageContactsLabel = texts.manageContacts || 'Kontakte verwalten';

    return `
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center;">
        <a href="https://calendar.google.com/calendar/r" style="${this.buttonStyle}">${viewCalendarLabel}</a>
        <a href="https://contacts.google.com" style="${this.buttonStyle}">${manageContactsLabel}</a>
        <a href="https://github.com/itsFelixH/birthday-calendar-sync" style="${this.buttonStyle}">GitHub</a>
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