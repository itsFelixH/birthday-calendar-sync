timeZone = Session.getScriptTimeZone();


class CalendarManager {
	/**
	 * @param {Object} config
	 * @param {string} config.calendarId - Google Calendar ID
	 * @param {string} [config.dateFormat='dd.MM.yyyy'] - Default date format
	 * @param {string} [config.timeZone=Session.getScriptTimeZone()] - Time zone
	 * @param {string} [config.eventColor] - Default event color ID
	 */
	constructor(config) {
		this.calendar = CalendarApp.getCalendarById(config.calendarId);
		this.dateFormat = config.dateFormat || 'dd.MM.yyyy';
		this.timeZone = config.timeZone || Session.getScriptTimeZone();
		this.eventColor = config.eventColor;

		if (!this.calendar) {
			throw new Error(`Calendar not found: ${config.calendarId}`);
		}
	}

	/**
	 * Creates a time-bound event with formatting
	 * @param {Object} params
	 * @param {string} params.title
	 * @param {Date} params.start
	 * @param {Date} params.end
	 * @param {string} [params.description]
	 * @param {Array<{type: string, minutes: number}>} [params.reminders]
	 * @returns {GoogleAppsScript.Calendar.CalendarEvent}
	 */
	createTimedEvent(params) {
		const options = {
			description: params.description,
			location: params.location,
			reminders: this._createReminderConfig(params.reminders || []),
			guests: params.guests,
			sendInvites: params.sendInvites
		};

		if (this.eventColor) {
			options.color = this.eventColor;
		}

		try {
			return this.calendar.createEvent(
				params.title,
				params.start,
				params.end,
				options
			);
		} catch (error) {
			throw new Error(`Event creation failed: ${error.message}`);
		}
	}

	/**
	 * Deletes events by title within date range
	 * @param {string} titlePattern
	 * @param {Date} startDate
	 * @param {Date} endDate
	 * @returns {number} Number of deleted events
	 */
	deleteEventsByTitleInRange(titlePattern, startDate, endDate) {
		const events = this.calendar.getEvents(startDate, endDate)
			.filter(event => event.getTitle().includes(titlePattern));

		events.forEach(event => event.deleteEvent());
		return events.length;
	}

	/**
	 * Updates event color
	 * @param {string} eventId
	 * @param {string} colorId
	 */
	setEventColor(eventId, colorId) {
		const event = this.calendar.getEventById(eventId);
		if (event) {
			event.setColor(colorId);
		}
	}

	/**
	 * Gets calendar events in a date range
	 * @param {Date} start
	 * @param {Date} end
	 * @param {Object} [options]
	 * @param {string} [options.search] - Search query
	 * @param {boolean} [options.ascending=true] - Sort order
	 * @returns {GoogleAppsScript.Calendar.CalendarEvent[]}
	 */
	getEventsInRange(start, end, options = {}) {
		let events = this.calendar.getEvents(start, end);

		if (options.search) {
			events = events.filter(e =>
				e.getTitle().includes(options.search) ||
				e.getDescription().includes(options.search)
			);
		}

		return options.ascending === false ?
			events.reverse() :
			events;
	}

	/**
	 * Formats date using instance configuration
	 * @param {Date} date
	 * @param {string} [format]
	 * @returns {string}
	 */
	formatDate(date, format) {
		return Utilities.formatDate(
			date,
			this.timeZone,
			format || this.dateFormat
		);
	}

	/**
	 * Gets calendar events in a date range
	 * @param {Date} start
	 * @param {Date} end
	 * @param {Object} [options]
	 * @param {string} [options.search] - Search query
	 * @param {boolean} [options.ascending=true] - Sort order
	 * @returns {GoogleAppsScript.Calendar.CalendarEvent[]}
	 */
	getEventsInRange(start, end, options = {}) {
		let events = this.calendar.getEvents(start, end);

		if (options.search) {
			events = events.filter(e =>
				e.getTitle().includes(options.search) ||
				e.getDescription().includes(options.search)
			);
		}

		return options.ascending === false ?
			events.reverse() :
			events;
	}

	/**
	 * Creates all-day event with formatted dates
	 * @param {Object} params
	 * @param {string} params.title
	 * @param {Date} params.date
	 * @param {string} [params.description]
	 * @param {Array<{type: string, minutes: number}>} [params.reminders]
	 * @returns {GoogleAppsScript.Calendar.CalendarEvent}
	 */
	createAllDayEvent(params) {
		const options = {
			description: params.description,
			location: params.location,
			reminders: this._createReminderConfig(params.reminders || []),
			guests: params.guests
		};

		if (this.eventColor) {
			options.color = this.eventColor;
		}

		try {
			return this.calendar.createAllDayEvent(
				params.title,
				params.date,
				options
			);
		} catch (error) {
			throw new Error(`All-day event creation failed: ${error.message}`);
		}
	}

	/**
   * Checks if a year is a leap year
   * @param {number} year
   * @returns {boolean}
   */
	isLeapYear(year) {
		return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
	}

	/**
   * Gets the number of days in a month
   * @param {number} month 0-based month (0-11)
   * @param {number} year
   * @returns {number}
   */
	static getDaysInMonth(month, year) {
		return new Date(year, month + 1, 0).getDate();
	}

	/**
   * Updates multiple event properties
   * @param {string} eventId
   * @param {Object} updates
   * @returns {boolean} True if updates were applied
   */
	updateEvent(eventId, updates) {
		const event = this.calendar.getEventById(eventId);
		if (!event) return false;

		let changed = false;

		if (updates.title && event.getTitle() !== updates.title) {
			event.setTitle(updates.title);
			changed = true;
		}

		if (updates.description && event.getDescription() !== updates.description) {
			event.setDescription(updates.description);
			changed = true;
		}

		if (updates.color && event.getColor() !== updates.color) {
			event.setColor(updates.color);
			changed = true;
		}

		return changed;
	}

	/**
 * Gets date range for processing
 * @param {number} monthsAhead
 * @param {string} timeZone
 * @returns {{start: Date, end: Date}}
 */
	getDateRange(monthsAhead) {
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const end = new Date(start);
		end.setMonth(end.getMonth() + monthsAhead);
		return { start, end };
	}

	/**
	 * Gets human-readable event summary
	 * @param {GoogleAppsScript.Calendar.CalendarEvent} event
	 * @returns {string}
	 */
	formatEventSummary(event) {
		return `[${this.formatDate(event.getStartTime())}] ${event.getTitle()} (${event.isAllDayEvent() ? 'All Day' :
			`${this.formatDate(event.getStartTime(), 'HH:mm')}-${this.formatDate(event.getEndTime(), 'HH:mm')}`
			})`;
	}

	/**
	 * Creates reminder configuration for Calendar API
	 * @private
	 * @param {Array<{type: string, minutes: number}>} reminders
	 * @returns {Object} Calendar reminder configuration
	 */
	_createReminderConfig(reminders) {
		return reminders.reduce((config, reminder) => {
			if (reminder.type === 'popup') config.popup = [reminder.minutes];
			if (reminder.type === 'email') config.email = [reminder.minutes];
			return config;
		}, { useDefault: false });
	}

	/**
	 * Compares current and desired reminder configurations
	 * @private
	 * @param {Object} current
	 * @param {Object} desired
	 * @returns {boolean}
	 */
	_remindersMatch(current, desired) {
		return JSON.stringify(current.popup?.sort()) === JSON.stringify(desired.popup?.sort()) &&
			JSON.stringify(current.email?.sort()) === JSON.stringify(desired.email?.sort());
	}
}