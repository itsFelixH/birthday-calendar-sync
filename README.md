# Birthday Calendar Sync

This project synchronizes birthdays from Google Contacts to a designated Google Calendar. It utilizes Google Apps Script and the `clasp` command-line interface for local development and deployment.

## Project Structure

project_root/  
├── src/  
│   ├── birthday_contact.gs  
│   ├── config.gs  
│   ├── main.gs  
│   ├── utils.gs  
├── .clasp.json  
├── appsscript.json  
└── README.md

- **`config.gs`**: Contains configurations and constants.
- **`birthday_contact.gs`**: Definition of the `BirthdayContact` class.
- **`main.gs`**: Main functions for synchronizing and updating birthdays.
- **`utils.gs`**: Utility functions used for various tasks such as fetching contacts and deleting events.

## Prerequisites

- [Node.js](https://nodejs.org/): Download and install Node.js from [Node.js Website](https://nodejs.org/)
- [clasp](https://github.com/google/clasp): Install the clasp command-line interface globally using npm:

```bash
npm install -g @google/clasp
```

## Setup

### 1. Authentication with clasp

Ensure you have Node.js installed. Login to clasp using your Google account:

```bash
clasp login
```

### 2. Create a Google Apps Script Project

```bash
clasp create --type standalone --title "Birthday Calendar Sync"
```

### 3. Clone the Project Repository

Clone your Git repository containing the project files to your local machine:

```bash
git clone https://github.com/itsFelixH/birthday-calendar-sync.git
cd birthday-calendar-sync
```

### 4. Link Your Project with Google Apps Script

Make sure the `scriptId` in the `.clasp.json` file matches your Google Apps Script project. You can find the `scriptId` in the URL of your newly created Google Apps Script project.

### 5. Configure the Project

Open `src/config.gs` and customize the configuration settings:

```js
// Calendar ID for Birthday Events
var calendarId = "your-calendar-id@group.calendar.google.com";

// Optional Label Filter for Birthdays
var useLabel = false;
var labels = ["Label 1", "Label 2"];

// Reminder Settings
var addReminder = "popup"; // Reminder type (popup, email, sms)
var reminderInMinutes = 60 * 12; // Reminder notification time (12 hours)

// Birthday Summaries Creation
var createSummaries = true;

// Year for Events (defaults to current year)
var yearToUse = new Date().getFullYear();

// String to identify delete events (optional)
var deleteString = "xxxxxxxxxxxxxxxxxxx";

// Date range for deleting events (optional)
var deleteStartDate = new Date("2023-01-01");
var deleteEndDate = new Date("2025-12-31");
```

### 7. Push the Code to Google Apps Script

Deploy your local code to your Google Apps Script project:

```bash
clasp push
```

This will upload all files to your Google Apps Script project.

## Usage

You can call these functions from the Script Editor in Google Apps Script:

- `updateBirthdaysAndSummariesInCalendar()`: Updates birthdays and summaries in the calendar based on the configurations.
- `deleteEvents()`: Deletes events from the calendar based on the specified criteria.
