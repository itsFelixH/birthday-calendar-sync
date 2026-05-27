# 🎂 Birthday Calendar Sync

Synchronizes birthdays from Google Contacts to a dedicated Google Calendar. Built with Google Apps Script and managed locally via [clasp](https://github.com/google/clasp).

## Features

- **Individual birthday events** — one all-day event per contact on their birthday
- **Monthly summary events** — a single event listing all birthdays that month
- **Recurring or single events** — yearly recurring or individual per-year events
- **Structured descriptions** — contact links, social media, labels, and location
- **Configurable everything** — titles, descriptions, colors, email texts, locale
- **Email notifications** — sync reports, monthly summaries, weekly reminders (all optional)
- **Label filtering** — sync only contacts with specific Google Contacts labels
- **Milestone highlighting** — special titles for round birthdays (30, 40, 50, etc.)
- **Deceased contact handling** — skip or create memorial events
- **Leap year handling** — configurable fallback for Feb 29 birthdays
- **Dry-run mode** — preview all changes without modifying anything
- **Duplicate prevention** — tagged events prevent duplicates even when names change
- **Rate limiting** — configurable API throttling to avoid quota issues

## Setup

### 1. Clone and install

```bash
git clone https://github.com/itsFelixH/birthday-calendar-sync.git
cd birthday-calendar-sync
pnpm install
```

### 2. Authenticate and create project

```bash
pnpx @google/clasp login
pnpx @google/clasp create --type standalone --title "Birthday Calendar Sync"
```

### 3. Configure

```bash
cp src/config.js.template src/config.js
```

Set your `calendarId` in `src/config.js`. Optionally enable email notifications and adjust schedule times — everything else has sensible defaults.

### 4. Deploy and schedule

```bash
pnpm run deploy
```

Then run `setupSchedules()` once in the Apps Script editor. This creates triggers based on your config:

| Function | Default Schedule | Condition |
|----------|-----------------|-----------|
| `syncBirthdays` | Monday ~3:00 AM | Always |
| `sendMonthlySummary` | 28th ~9:00 AM | Only if `sendMonthlySummaryEmail = true` |
| `sendWeeklyReminder` | Monday ~10:00 AM | Only if `sendWeeklyReminderEmail = true` |

Re-running `setupSchedules()` replaces existing triggers. Run `removeSchedules()` to pause.

## Configuration

The config file (`src/config.js`) is organized in numbered sections by priority. Only `calendarId` is required — everything else has sensible defaults.

> **Note:** `src/config.js` is gitignored — it contains your personal settings. Only the template is committed.

| Section | What's in it |
|---------|-------------|
| 1. Required | `calendarId` |
| 2. Features | Which events to create, which emails to send, label filtering |
| 3. Locale | Month names for your language |
| 4. Schedules | When triggers run (used by `setupSchedules()`) |
| 5. Reminders & Timing | Reminder methods, lookahead, weekly reminder settings |
| 6. Event Appearance | Titles, descriptions, colors, social links |
| 7. Email Appearance | Subjects and body texts |
| 8. Special Handling | Milestones, leap year, deceased contacts |
| 9. Advanced | Rate limiting, dry run, internal tag |

All settings are documented with inline comments in `src/config.js.template`.

## Event Description Format

Events use a structured description with sections:

```
🎂 Max turns 34
Birthday: 15.01.1990

── Contact ──
WhatsApp: https://wa.me/491234567
Instagram: https://instagram.com/max/
Contact: https://contacts.google.com/person/c123

── Info ──
📍 Berlin
Friends, Family
```

Sections only appear when there's content for them.

## Deceased Contact Handling

Contacts are detected as deceased via:

1. **Group label** — assign the label configured in `deceasedLabel`
2. **Date field** — add a custom date with the type configured in `deceasedDateLabel`

Either one is sufficient. Modes:

- `'skip'` — no events created (default)
- `'memorial'` — memorial event with `🕯️` prefix and lifespan
- `'normal'` — treated like any other contact

## Project Structure

```
src/
├── config.js.template    # Configuration template (copy to config.js)
├── main.js               # Entry points: syncBirthdays, setupSchedules, etc.
├── birthday_contact.js   # BirthdayContact class
├── calendar_manager.js   # Calendar API wrapper
├── calendar_sync.js      # Sync logic (individual + summary events)
├── contact_manager.js    # Google Contacts API fetching
├── email_manager.js      # Email notifications
├── label_manager.js      # Contact label/group management
└── utils.js              # Utility helpers
tests/                    # Jest unit tests
```

## Development

```bash
pnpm test          # run tests with coverage
pnpm run deploy    # test + push to Apps Script
```

## License

MIT
