// Logging Configuration
const LOG_LEVELS = {
	TRACE: 0,
	DEBUG: 1,
	INFO: 2,
	WARNING: 3,
	ERROR: 4,
	NONE: 5  // To disable all logging
};

let currentLogLevel = LOG_LEVELS.INFO; // Set the default log level

/**
 * Sets the current log level.
 * @param {number} level The log level to set (e.g., LOG_LEVELS.DEBUG).
 */
function setLogLevel(level) {
	currentLogLevel = level;
	logInfo("Log level set to: " + getLogLevel(currentLogLevel));
}

/**
 * Gets the name of a log level.
 * @param {number} level The log level value.
 * @returns {string} The name of the log level.
 */
function getLogLevel(level) {
	for (const [name, value] of Object.entries(LOG_LEVELS)) {
		if (value === level) {
			return name;
		}
	}
	return "UNKNOWN";
}

/**
 * Logs a message at the specified level.
 * @param {string} message The message to log.
 * @param {number} [level=LOG_LEVELS.INFO] The log level (default: LOG_LEVELS.INFO).
 */
function log(message, level = LOG_LEVELS.INFO) {
	if (level >= currentLogLevel) {
		let prefix = "";
		switch (level) {
			case LOG_LEVELS.TRACE: prefix = "[TRACE] "; break;
			case LOG_LEVELS.DEBUG: prefix = "[DEBUG] "; break;
			case LOG_LEVELS.INFO: prefix = "[INFO] "; break;
			case LOG_LEVELS.WARNING: prefix = "[WARNING] "; break;
			case LOG_LEVELS.ERROR: prefix = "[ERROR] "; break;
		}
		Logger.log(prefix + message);
	}
}

// LOG HELPERS
/**
 * Logs a trace message.
 * @param {string} message The message to log.
 */
function logTrace(message) { log(message, LOG_LEVELS.TRACE); }
/**
 * Logs a debug message.
 * @param {string} message The message to log.
 */
function logDebug(message) { log(message, LOG_LEVELS.DEBUG); }
/**
 * Logs an info message.
 * @param {string} message The message to log.
 */
function logInfo(message) { log(message, LOG_LEVELS.INFO); }
/**
 * Logs a warning message.
 * @param {string} message The message to log.
 */
function logWarning(message) { log(message, LOG_LEVELS.WARNING); }
/**
 * Logs an error message.
 * @param {string} message The message to log.
 */
function logError(message) { log(message, LOG_LEVELS.ERROR); }
