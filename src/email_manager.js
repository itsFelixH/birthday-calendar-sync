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

    const subject = this.subjects.monthlySummary || '🎂 Birthday Reminder 🎂';
    const greetingTemplate = this.texts.greeting || 'Hi{name},';
    const greeting = greetingTemplate.replace('{name}', recipientName ? ` ${recipientName}` : '');
    const titleText = (this.texts.monthlySummaryTitle || '🎉 {month} Birthdays').replace('{month}', monthNamesLong[month]);
    const introText = (this.texts.monthlySummaryIntro || '{count} of your contacts have birthdays in {month} {year}:')
      .replace('{month}', monthNamesLong[month]).replace('{year}', year).replace('{count}', numBirthdays);
    const viewCalendarLabel = this.texts.viewCalendar || 'View Calendar';

    // Build the email content using templates
    const content = `
      ${this.templates.header(titleText, `${monthNamesLong[month]} ${year}`)}

      <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 6px;">
        <p>${greeting}</p>
        <p>${introText}</p>
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
      '',
      ...monthContacts.map(contact => {
        const ageTemplate = this.texts.monthlySummaryAge || 'turns {age}';
        let line = `${('0' + contact.birthday.getDate()).slice(-2)}. ${monthNamesLong[contact.birthday.getMonth()]}: ${contact.name}`;
        if (contact.hasKnownBirthYear()) line += ` (${ageTemplate.replace('{age}', contact.getAgeThisYear())})`;
        return `  • ${line}`;
      }),
      '',
      `${viewCalendarLabel}: https://calendar.google.com/calendar/r`,
    ].join('\n');

    this.sendMail(toEmail, fromEmail, senderName, subject, textBody, mailBody);
    Logger.log(`Birthday summary email sent successfully!`);
  }


  /**
   * Sends a weekly birthday digest email for upcoming birthdays within a configurable window.
   * @param {BirthdayContact[]} contacts - Array of contacts
   * @param {Date} date - Reference date (today)
   * @param {number} days - How many days ahead to look for birthdays
   */
  sendWeeklyDigest(contacts, date = new Date(), days = 7) {
    if (contacts.length === 0) {
      Logger.log("No contacts found. Aborting.");
      return;
    }

    const day = date.getDate();
    const month = date.getMonth();
    const endDate = new Date(date);
    endDate.setDate(date.getDate() + days);

    Logger.log(`Creating weekly digest (next ${days} days)...`);

    // Get all contacts with birthdays in the window (today through today + days)
    const digestContacts = contacts.filter(contact => {
      return this._daysUntil(date, contact.birthday) <= days;
    }).sort((a, b) => {
      const aDays = this._daysUntil(date, a.birthday);
      const bDays = this._daysUntil(date, b.birthday);
      return aDays - bDays || a.name.localeCompare(b.name);
    });

    if (digestContacts.length === 0) {
      Logger.log('No birthdays in the digest window.');
      return;
    }

    const { toEmail, fromEmail, senderName, recipientName } = this.getEmailContext();
    const subject = (this.subjects.weeklyDigest || '🎂 Weekly Birthday Digest')
      .replace('{count}', digestContacts.length);
    const greetingTemplate = this.texts.greeting || 'Hi{name},';
    const greeting = greetingTemplate.replace('{name}', recipientName ? ` ${recipientName}` : '');
    const titleText = this.texts.weeklyDigestTitle || '🎂 Weekly Birthday Digest';
    const introTemplate = days === 1
      ? (this.texts.weeklyDigestIntroSingular || '{count} of your contacts have a birthday tomorrow:')
      : (this.texts.weeklyDigestIntro || '{count} of your contacts have birthdays in the next {days} days:');
    const introText = introTemplate.replace('{count}', digestContacts.length).replace('{days}', days);
    const todayLabel = this.texts.weeklyDigestTodayLabel || 'TODAY';
    const ageTemplate = this.texts.weeklyDigestAge || 'turns {age}';
    const daysUntilLabel = this.texts.weeklyDigestDaysUntil || 'in {days} days';
    const tomorrowLabel = this.texts.weeklyDigestTomorrow || 'tomorrow';
    const socialLinks = typeof showSocialLinksInEmails !== 'undefined' ? showSocialLinksInEmails : true;
    const showMilestones = typeof highlightMilestones !== 'undefined' ? highlightMilestones : false;
    const milestones = typeof milestoneAges !== 'undefined' ? milestoneAges : [];

    // Week range for subtitle
    const endDay = endDate.getDate();
    const endMonth = endDate.getMonth();
    const subtitle = `${('0' + day).slice(-2)}. ${monthNamesLong[month]} – ${('0' + endDay).slice(-2)}. ${monthNamesLong[endMonth]} ${date.getFullYear()}`;

    // Count milestones for summary
    const milestoneCount = showMilestones ? digestContacts.filter(c =>
      c.hasKnownBirthYear() && milestones.includes(c.getAgeThisYear())
    ).length : 0;

    // Build HTML content
    const contactListHtml = digestContacts.map(contact => {
      const daysUntil = this._daysUntil(date, contact.birthday);
      const isToday = daysUntil === 0;
      const isTomorrow = daysUntil === 1;
      const dateLabel = isToday
        ? `🎂 ${todayLabel}`
        : `📅 ${('0' + contact.birthday.getDate()).slice(-2)}. ${monthNamesLong[contact.birthday.getMonth()]}`;

      const daysHint = isToday ? '' : isTomorrow
        ? ` <span style="color: #888; font-size: 12px;">(${tomorrowLabel})</span>`
        : ` <span style="color: #888; font-size: 12px;">(${daysUntilLabel.replace('{days}', daysUntil)})</span>`;

      const age = contact.hasKnownBirthYear() ? contact.getAgeThisYear() : null;
      const isMilestone = showMilestones && age !== null && milestones.includes(age);

      const ageText = age !== null
        ? ` (${ageTemplate.replace('{age}', age)}${isToday ? '!' : ''})`
        : '';

      const milestoneTag = isMilestone ? ' 🎉' : '';
      const borderColor = isToday ? '#ff6b6b' : isMilestone ? '#f59e0b' : '#007bff';

      let contactInfo = '';
      if (contact.email) contactInfo += `<span style="display: inline; margin-right: 12px;">📧 <a href="mailto:${contact.email}" style="color: #007bff; text-decoration: none;">${contact.email}</a></span>`;
      if (contact.phoneNumber) {
        contactInfo += `<span style="display: inline; margin-right: 12px;">📱 <a href="tel:${contact.phoneNumber}" style="color: #007bff; text-decoration: none;">${contact.phoneNumber}</a></span>`;
        if (socialLinks) {
          const waLink = contact.getWhatsAppLink();
          if (waLink) contactInfo += `<span style="display: inline; margin-right: 12px;">💬 <a href="${waLink}" style="color: #007bff; text-decoration: none;">WhatsApp</a></span>`;
        }
      }
      if (socialLinks && contact.instagramNames && contact.instagramNames.length > 0) {
        contact.instagramNames.forEach(name => {
          contactInfo += `<span style="display: inline; margin-right: 12px;">📸 <a href="https://instagram.com/${name.replace('@', '')}" style="color: #007bff; text-decoration: none;">${name}</a></span>`;
        });
      }

      return `
        <li style="padding: 10px; margin: 5px 0; border-left: 4px solid ${borderColor}; background: #ffffff;">
          <strong>${dateLabel} — ${contact.name}</strong>${ageText}${milestoneTag}${daysHint}
          ${contactInfo ? `<div style="margin-top: 6px; font-size: 13px; color: #666666;">${contactInfo}</div>` : ''}
        </li>
      `;
    }).join('');

    // Summary line
    let summaryHtml = `<p style="font-size: 15px; margin: 0;"><strong>🎂 ${digestContacts.length}</strong> birthday${digestContacts.length !== 1 ? 's' : ''} this week`;
    if (milestoneCount > 0) summaryHtml += ` · <strong>🎉 ${milestoneCount}</strong> milestone${milestoneCount !== 1 ? 's' : ''}`;
    summaryHtml += `</p>`;

    const content = `
      ${this.templates.header(titleText, subtitle)}

      <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 6px;">
        <p>${greeting}</p>
        ${summaryHtml}
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
      subtitle,
      '',
      greeting,
      `🎂 ${digestContacts.length} birthday${digestContacts.length !== 1 ? 's' : ''} this week${milestoneCount > 0 ? ` · 🎉 ${milestoneCount} milestone${milestoneCount !== 1 ? 's' : ''}` : ''}`,
      introText,
      '',
      '─'.repeat(30),
      ...digestContacts.map(contact => {
        const daysUntil = this._daysUntil(date, contact.birthday);
        const isToday = daysUntil === 0;
        const isTomorrow = daysUntil === 1;
        const dateLabel = isToday
          ? `🎂 ${todayLabel}`
          : `📅 ${('0' + contact.birthday.getDate()).slice(-2)}. ${monthNamesLong[contact.birthday.getMonth()]}`;

        const daysHint = isToday ? '' : isTomorrow
          ? ` (${tomorrowLabel})`
          : ` (${daysUntilLabel.replace('{days}', daysUntil)})`;

        const age = contact.hasKnownBirthYear() ? contact.getAgeThisYear() : null;
        const isMilestone = showMilestones && age !== null && milestones.includes(age);

        let line = `  ${dateLabel} — ${contact.name}`;
        if (age !== null) line += ` (${ageTemplate.replace('{age}', age)})`;
        if (isMilestone) line += ' 🎉';
        line += daysHint;
        if (contact.email) line += `\n    📧 ${contact.email}`;
        if (contact.phoneNumber) {
          line += `\n    📱 ${contact.phoneNumber}`;
          if (socialLinks) {
            const waLink = contact.getWhatsAppLink();
            if (waLink) line += `\n    💬 ${waLink}`;
          }
        }
        if (socialLinks && contact.instagramNames && contact.instagramNames.length > 0) {
          line += `\n    📸 ${contact.instagramNames.join(', ')}`;
        }
        return line;
      }),
    ];

    const textBody = textLines.join('\n');
    const mailBody = this.templates.wrapEmail(content);
    this.sendMail(toEmail, fromEmail, senderName, subject, textBody, mailBody);
    Logger.log(`Weekly digest email sent successfully!`);
  }


  /**
   * Calculates days from a reference date until a contact's next birthday occurrence.
   * @param {Date} fromDate - Reference date
   * @param {Date} birthday - Contact's birthday
   * @returns {number} Days until the birthday (0 = today)
   * @private
   */
  _daysUntil(fromDate, birthday) {
    // Normalize both to midnight to avoid timezone/hour drift
    const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
    const thisYear = new Date(fromDate.getFullYear(), birthday.getMonth(), birthday.getDate());
    const diffMs = thisYear.getTime() - from.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    return diffDays >= 0 ? diffDays : diffDays + 365;
  }


  /**
   * Sends a contact data quality report email.
   * Analyzes contacts for missing data (birth year, email, phone) and reports findings.
   * @param {BirthdayContact[]} contacts - Array of contacts to analyze
   */
  sendContactQualityReport(contacts) {
    if (contacts.length === 0) {
      Logger.log("No contacts found. Aborting.");
      return;
    }

    Logger.log('Creating contact quality report...');

    const { toEmail, fromEmail, senderName, recipientName } = this.getEmailContext();
    const subject = this.subjects.contactQualityReport || '📋 Contact Data Quality Report';
    const greetingTemplate = this.texts.greeting || 'Hi{name},';
    const greeting = greetingTemplate.replace('{name}', recipientName ? ` ${recipientName}` : '');
    const titleText = this.texts.contactQualityReportTitle || '📋 Contact Data Quality';
    const introText = (this.texts.contactQualityReportIntro || 'Here\'s a summary of your {total} contacts\' data completeness:')
      .replace('{total}', contacts.length);

    // Analyze contacts
    const missingBirthYear = contacts.filter(c => !c.hasKnownBirthYear());
    const missingEmail = contacts.filter(c => !c.email);
    const missingPhone = contacts.filter(c => !c.phoneNumber);
    const missingLabels = contacts.filter(c => c.labels.length === 0);
    const completeContacts = contacts.filter(c => c.hasKnownBirthYear() && c.email && c.phoneNumber);

    const totalIssues = missingBirthYear.length + missingEmail.length + missingPhone.length;

    const noBirthYearLabel = this.texts.contactQualityNoBirthYear || 'Missing birth year';
    const noEmailLabel = this.texts.contactQualityNoEmail || 'Missing email';
    const noPhoneLabel = this.texts.contactQualityNoPhone || 'Missing phone number';
    const noLabelsLabel = this.texts.contactQualityNoLabels || 'No labels';
    const completeLabel = this.texts.contactQualityComplete || 'Complete contacts';
    const maxItems = typeof syncReportMaxItems !== 'undefined' ? syncReportMaxItems : 0;

    // Helper to cap lists
    const capList = (items) => {
      if (maxItems <= 0 || items.length <= maxItems) return { shown: items, overflow: 0 };
      return { shown: items.slice(0, maxItems), overflow: items.length - maxItems };
    };

    // Build a section for a category
    const buildSection = (label, contactList, isHtml) => {
      if (contactList.length === 0) return isHtml ? '' : [];
      const { shown, overflow } = capList(contactList);
      const names = shown.map(c => c.name);

      if (isHtml) {
        let html = `<p><strong>${label}</strong> (${contactList.length})</p>`;
        html += `<ul style="padding-left: 20px; margin: 5px 0 15px;">`;
        html += names.map(name => `<li>${name}</li>`).join('');
        if (overflow > 0) html += `<li style="color: #666; font-style: italic;">...and ${overflow} more</li>`;
        html += `</ul>`;
        return html;
      } else {
        const lines = [`  ${label} (${contactList.length})`];
        names.forEach(name => lines.push(`    • ${name}`));
        if (overflow > 0) lines.push(`    ...and ${overflow} more`);
        return lines;
      }
    };

    // Build HTML
    const statsHtml = `
      <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 6px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0;">📊 Total contacts</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">${contacts.length}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">✅ ${completeLabel}</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #28a745;">${completeContacts.length}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">⚠️ Total issues</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${totalIssues > 0 ? '#dc3545' : '#28a745'};">${totalIssues}</td>
          </tr>
        </table>
      </div>
    `;

    let detailsHtml = '';
    const sections = [
      { label: `📅 ${noBirthYearLabel}`, list: missingBirthYear },
      { label: `📧 ${noEmailLabel}`, list: missingEmail },
      { label: `📱 ${noPhoneLabel}`, list: missingPhone },
      { label: `🏷️ ${noLabelsLabel}`, list: missingLabels },
    ];

    const nonEmptySections = sections.filter(s => s.list.length > 0);
    if (nonEmptySections.length > 0) {
      detailsHtml = `<div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 6px;">`;
      nonEmptySections.forEach(s => { detailsHtml += buildSection(s.label, s.list, true); });
      detailsHtml += `</div>`;
    }

    const content = `
      ${this.templates.header(titleText)}

      <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 6px;">
        <p>${greeting}</p>
        <p>${introText}</p>
      </div>

      ${statsHtml}
      ${detailsHtml}

      ${this.templates.footer()}
    `;

    // Build plain text
    const textLines = [
      titleText,
      '',
      greeting,
      introText,
      '',
      `📊 Total contacts: ${contacts.length}`,
      `✅ ${completeLabel}: ${completeContacts.length}`,
      `⚠️ Total issues: ${totalIssues}`,
      '',
    ];

    nonEmptySections.forEach(s => {
      textLines.push(...buildSection(s.label, s.list, false));
      textLines.push('');
    });

    const textBody = textLines.join('\n');
    const mailBody = this.templates.wrapEmail(content);
    this.sendMail(toEmail, fromEmail, senderName, subject, textBody, mailBody);
    Logger.log('Contact quality report email sent successfully!');
  }


  /**
   * Sends an email with details about calendar changes
   * @param {Object} changes - Object containing calendar changes
   */
  sendSyncReport(changes) {
    const { toEmail, fromEmail, senderName, recipientName } = this.getEmailContext();

    const subject = this.subjects.syncReport || '📅 Birthday Updates 📅';
    const greetingTemplate = this.texts.greeting || 'Hi{name},';
    const greeting = greetingTemplate.replace('{name}', recipientName ? ` ${recipientName}` : '');
    const titleText = this.texts.syncReportTitle || '🔄 Birthday Event Updates';
    const introText = this.texts.syncReportIntro || 'The following birthday events were added to your calendar:';
    const individualHeader = this.texts.syncReportIndividualHeader || 'Individual Birthdays:';
    const summaryHeader = this.texts.syncReportSummaryHeader || 'Monthly Summaries:';
    const createdLabel = this.texts.syncReportCreated || '✨ Created:';
    const updatedLabel = this.texts.syncReportUpdated || '🔄 Updated:';
    const viewCalendarLabel = this.texts.viewCalendar || 'View Calendar';
    const maxItems = typeof syncReportMaxItems !== 'undefined' ? syncReportMaxItems : 0;

    // Helper to cap a list and add "...and X more" if needed
    const capList = (items) => {
      if (maxItems <= 0 || items.length <= maxItems) return { shown: items, overflow: 0 };
      return { shown: items.slice(0, maxItems), overflow: items.length - maxItems };
    };

    const renderList = (items, isHtml) => {
      const { shown, overflow } = capList(items);
      if (isHtml) {
        let html = shown.map(event => `<li>${event}</li>`).join('');
        if (overflow > 0) html += `<li style="color: #666; font-style: italic;">...and ${overflow} more</li>`;
        return html;
      } else {
        const lines = shown.map(event => `    • ${event}`);
        if (overflow > 0) lines.push(`    ...and ${overflow} more`);
        return lines;
      }
    };

    // Build change sections
    let changeSections = '';

    if (changes.individual.created.length > 0 || changes.individual.updated.length > 0) {
      changeSections += `
        <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 6px;">
          <h3 style="color: #2c3e50; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e9ecef; padding-bottom: 5px;">${individualHeader}</h3>
          ${changes.individual.created.length > 0 ? `
            <p><strong>${createdLabel}</strong></p>
            <ul style="padding-left: 20px; margin: 5px 0 15px;">
              ${renderList(changes.individual.created, true)}
            </ul>
          ` : ''}
          ${changes.individual.updated.length > 0 ? `
            <p><strong>${updatedLabel}</strong></p>
            <ul style="padding-left: 20px; margin: 5px 0 15px;">
              ${renderList(changes.individual.updated, true)}
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
              ${renderList(changes.summary.created, true)}
            </ul>
          ` : ''}
          ${changes.summary.updated.length > 0 ? `
            <p><strong>${updatedLabel}</strong></p>
            <ul style="padding-left: 20px; margin: 5px 0 15px;">
              ${renderList(changes.summary.updated, true)}
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
        textLines.push(...renderList(changes.individual.created, false));
      }
      if (changes.individual.updated.length > 0) {
        textLines.push(`  ${updatedLabel}`);
        textLines.push(...renderList(changes.individual.updated, false));
      }
    }

    if (changes.summary.created.length > 0 || changes.summary.updated.length > 0) {
      textLines.push('', summaryHeader);
      if (changes.summary.created.length > 0) {
        textLines.push(`  ${createdLabel}`);
        textLines.push(...renderList(changes.summary.created, false));
      }
      if (changes.summary.updated.length > 0) {
        textLines.push(`  ${updatedLabel}`);
        textLines.push(...renderList(changes.summary.updated, false));
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
    const viewCalendarLabel = texts.viewCalendar || 'View Calendar';
    const manageContactsLabel = texts.manageContacts || 'Manage Contacts';

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