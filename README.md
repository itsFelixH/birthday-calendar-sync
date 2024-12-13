# Birthday Calendar Sync

This project synchronizes birthdays from Google Contacts to a Google Calendar. It uses Google Apps Script and `clasp` to develop and manage the scripts locally.

## Project Structure

├── src │
├── birthdayContactClass.gs │
├── config.gs │
├── main.gs │
├── utils.gs
├── .clasp.json
├── appsscript.json
└── README.md

- **`config.gs`**: Contains configurations and constants.
- **`birthday_contact.gs`**: Definition of the `BirthdayContact` class.
- **`main.gs`**: Main functions for synchronizing and updating birthdays.
- **`utils.gs`**: Utility functions used for various tasks such as fetching contacts and deleting events.

## Prerequisites

- [Node.js](https://nodejs.org/)
- [clasp](https://github.com/google/clasp): Google Apps Script Command Line Interface

## Setup

### 1. Install `clasp`

Ensure you have Node.js installed. Then install `clasp` globally using npm:

```bash
npm install -g @google/clasp
```

### 2. Login to clasp

Authenticate clasp with your Google account:

```bash
clasp login
```

### 3. Create a New Google Apps Script Project

```bash
clasp create --type standalone --title "Birthday Calendar Sync"
```

### 4. Clone the Project Repository

Clone your Git repository containing the project files to your local machine:

```bash
git clone https://github.com/itsFelixH/birthday-calendar-sync.git
cd birthday-calendar-sync
```

### 5. Link Your Project with Google Apps Script

Make sure the `scriptId` in the `.clasp.json` file matches your Google Apps Script project. You can find the `scriptId` in the URL of your newly created Google Apps Script project.

### 6. Configure the Project

Open src/Config.gs and customize the configuration settings:

```js
var calendarId = "your-calendar-id@group.calendar.google.com";
var useLabel = false;
var labelId = "your-label-id";
var addReminder = "popup";
var reminderInMinutes = 60 * 12; // 12 hours earlier
var createSummaries = true;
var yearToUse = new Date().getFullYear(); // Use current year for creating events

var deleteString = "xxxxxxxxxxxxxxxxxxx";
var deleteStartDate = new Date("2023-01-01");
var deleteEndDate = new Date("2025-12-31");
```

### 7. Push the Code to Google Apps Script

Deploy your local code to Google Apps Script:

```bash
clasp push
```

This will upload all files in the src directory to your Google Apps Script project.

## Usage

Update Birthdays and Summaries:

```js
updateBirthdaysAndSummaries();
```
