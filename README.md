# Birthday Calendar Sync

Synchronizes birthdays from Google Contacts to a designated Google Calendar. Built with Google Apps Script and managed locally via [clasp](https://github.com/google/clasp).

## Features

- **Individual birthday events** — one all-day event per contact on their birthday
- **Monthly summary events** — a single event on the 1st of each month listing all birthdays
- **Email notifications** — daily reminders, monthly summaries, and change notifications
- **Label filtering** — sync only contacts with specific Google Contacts labels
- **Milestone highlighting** — special event titles for round birthdays (30, 40, 50, etc.)
- **Deceased contact handling** — skip or create memorial events for deceased contacts (detected via label or custom date field)
- **Leap year handling** — configurable fallback for Feb 29 birthdays in non-leap years
- **Dry-run mode** — preview all changes without modifying calendar or sending emails
- **Duplicate prevention** — events are tagged to prevent duplicates even when contact names change
- **Social links** — WhatsApp and Instagram links in event descriptions

## Project Structure

```
src/
├── birthday_contact.js   # BirthdayContact class
├── calendar_manager.js   # Calendar API wrapper
├── calendar_sync.js      # Sync logic (individual + summary events)
├── config.js             # All configuration settings
├── contact_manager.js    # Google Contacts API fetching
├── email_manager.js      # Email notifications
├── label_manager.js      # Contact label/group management
├── main.js               # Entry point functions
└── utils.js              # Utility helpers
tests/                    # Jest unit tests
```

## Prerequisites

- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/) (package manager)
- [clasp](https://github.com/google/clasp): `npm install -g @google/clasp`

## Setup

### 1. Clone and install

```bash
git clone https://github.com/itsFelixH/birthday-calendar-sync.git
cd birthday-calendar-sync
pnpm install
```

### 2. Authenticate with clasp

```bash
clasp login
```

### 3. Create or link a Google Apps Script project

Create a new project:

```bash
clasp create --type standalone --title "Birthday Calendar Sync"
```

Or link to an existing one by setting the `scriptId` in `.clasp.json`.

### 4. Configure

Edit `src/config.js` to match your setup:

```js
// Google Calendar ID where birthday events will be created
const calendarId = 'your-calendar-id@group.calendar.google.com';

// Label filtering (optional)
const useLabel = false;
const labelFilter = [];  // e.g. ['Friends', 'Family']

// Reminders
const reminderMethod = 'popup';       // 'popup', 'email', or 'none'
const reminderInMinutes = 60 * 12;    // 12 hours before

// Event types to create
const createIndividualBirthdayEvents = true;
const createBirthdaySummaryEvents = true;

// How far ahead to create events (in months)
const monthsAhead = 12;

// Dry-run mode — logs actions without making changes
const dryRun = false;

// Leap year birthdays (Feb 29) in non-leap years: 'feb28' or 'mar1'
const leapYearHandling = 'feb28';

// Milestone birthdays — highlight round ages with a special title
const highlightMilestones = true;
const milestoneAges = [18, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100];

// Deceased contacts
const deceasedHandling = 'skip';        // 'skip', 'memorial', or 'normal'
const deceasedLabel = '🪦 Verstorben';  // Google Contacts group label
const deceasedDateLabel = 'gestorben';  // Contact event/date field type
```

### 5. Deploy

```bash
pnpm run deploy   # runs tests, then pushes to Apps Script
```

Or push without tests:

```bash
pnpx clasp push
```

## Usage

Run these functions from the Apps Script editor or via time-based triggers:

| Function | Description |
|----------|-------------|
| `updateBirthdaysAndSummariesInCalendar()` | Creates/updates birthday events and summaries |
| `sendDailyMail()` | Sends a daily email with today's and upcoming birthdays |
| `sendSummaryMail()` | Sends a monthly summary email for the next month |

### Recommended triggers

- `updateBirthdaysAndSummariesInCalendar` — daily (e.g., 2:00 AM)
- `sendDailyMail` — daily (e.g., 7:00 AM)
- `sendSummaryMail` — monthly (e.g., last day of month)

## Deceased Contact Handling

Contacts are detected as deceased via two independent mechanisms:

1. **Group label** — assign the label configured in `deceasedLabel` (default: `🪦 Verstorben`) to the contact
2. **Date field** — add a custom date to the contact with the type/label configured in `deceasedDateLabel` (default: `gestorben`)

Either one is sufficient. When `deceasedHandling` is set to:

- `'skip'` — no events are created (default)
- `'memorial'` — a memorial event is created: `🕯️ Name (*1950 †2022)`
- `'normal'` — treated like any other contact

## Development

```bash
pnpm test          # run tests with coverage
pnpm run deploy    # test + push to Apps Script
```

## License

MIT
