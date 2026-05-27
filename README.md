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

The config file is organized in numbered sections by priority. See `src/config.js.template` for the full template with inline documentation.

> **Note:** `src/config.js` is gitignored — it contains your personal settings. Only the template is committed.

<details>
<summary><strong>1. Required</strong></summary>

| Setting | Description |
|---------|-------------|
| `calendarId` | Google Calendar ID where events are created |

</details>

<details>
<summary><strong>2. Features</strong></summary>

| Setting | Default | Description |
|---------|---------|-------------|
| `createIndividualBirthdayEvents` | `true` | One event per contact per birthday |
| `createBirthdaySummaryEvents` | `true` | One event per month listing all birthdays |
| `eventRecurrence` | `'single'` | `'single'` (per-year) or `'recurring'` (yearly) |
| `sendSyncReport` | `false` | Email after sync with created/updated events |
| `sendMonthlySummaryEmail` | `false` | Monthly email with next month's birthdays |
| `sendWeeklyReminderEmail` | `false` | Weekly email with upcoming birthdays |
| `useLabel` / `labelFilter` | `false` / `[]` | Only sync contacts with specific labels |

</details>

<details>
<summary><strong>3. Locale</strong></summary>

| Setting | Default | Description |
|---------|---------|-------------|
| `monthNames` | English abbreviations | Short month names for descriptions |
| `monthNamesLong` | English full names | Full month names for headers and emails |

</details>

<details>
<summary><strong>4. Schedules</strong></summary>

| Setting | Default | Description |
|---------|---------|-------------|
| `scheduleSyncDay` | `MONDAY` | Day of week for calendar sync |
| `scheduleSyncHour` | `3` | Hour (~3:00 AM) |
| `scheduleMonthlySummaryDay` | `28` | Day of month (1-28) |
| `scheduleMonthlySummaryHour` | `9` | Hour (~9:00 AM) |
| `scheduleWeeklyReminderDay` | `MONDAY` | Day of week |
| `scheduleWeeklyReminderHour` | `10` | Hour (~10:00 AM) |

</details>

<details>
<summary><strong>5. Reminders & Timing</strong></summary>

| Setting | Default | Description |
|---------|---------|-------------|
| `individualReminderMethod` | `'popup'` | `'popup'`, `'email'`, or `'none'` |
| `individualReminderMinutes` | `1440` | Minutes before (1 day) |
| `summaryReminderMethod` | `'popup'` | Reminder type for summary events |
| `summaryReminderMinutes` | `5760` | Minutes before (4 days) |
| `individualMonthsAhead` | `12` | Months to look ahead for individual events |
| `summaryMonthsAhead` | `6` | Months to look ahead for summary events |
| `reminderDaysBefore` | `7` | Days ahead in weekly reminder email |
| `weeklyReminderDay` | `1` (Mon) | Day of week to send reminder (−1 = daily) |
| `summaryEventDay` | `1` | Day of month for summary calendar event |

</details>

<details>
<summary><strong>6. Event Appearance</strong></summary>

**Title templates** — placeholders: `{name}`, `{age}`, `{birthdate}`, `{city}`, `{email}`, `{lifespan}`, `{month}`, `{year}`, `{count}`

```js
const eventTitles = {
  birthday: '🎂 {name}\'s Birthday',
  milestone: '🎂🎉 {name} turns {age}! 🎉',
  recurring: '🎂 {name}\'s Birthday',
  memorial: '🕯️ {name}',
  summary: '🎉🎂 BIRTHDAYS 🎂🎉'
};
```

**Description texts** — section headers and labels (set to `''` to hide a header)

```js
const eventTexts = {
  birthdayWithAge: '🎂 {name} turns {age}',
  birthdayNoAge: '🎂 Happy Birthday, {name}!',
  birthDateLabel: 'Birthday',
  contactSectionHeader: '── Contact ──',
  infoSectionHeader: '── Info ──',
  memorialPrefix: '🕯️ In memory of',
  summaryHeader: '{month} Birthdays',
  whatsappLabel: 'WhatsApp',
  instagramLabel: 'Instagram',
  contactLabel: 'Contact'
};
```

**Event colors** — Google Calendar color IDs (`''` = calendar default)

| `'1'` Lavender | `'2'` Sage | `'3'` Grape | `'4'` Flamingo |
|---|---|---|---|
| `'5'` Banana | `'6'` Tangerine | `'7'` Peacock | `'8'` Graphite |
| `'9'` Blueberry | `'10'` Basil | `'11'` Tomato | |

```js
const eventColors = { birthday: '', milestone: '', memorial: '', summary: '' };
```

**Content toggles**

| Setting | Default | Description |
|---------|---------|-------------|
| `showSocialLinksInEvents` | `true` | WhatsApp/Instagram in event descriptions |
| `showSocialLinksInEmails` | `true` | WhatsApp/Instagram in emails |
| `showEventTag` | `false` | Show `[BirthdaySync]` tag visibly |

</details>

<details>
<summary><strong>7. Email Appearance</strong></summary>

**Subjects and body texts** — fully customizable with placeholders: `{name}`, `{month}`, `{year}`, `{count}`, `{days}`, `{age}`

See `src/config.js.template` section 7 for all available keys in `emailSubjects` and `emailTexts`.

</details>

<details>
<summary><strong>8. Special Handling</strong></summary>

| Setting | Default | Description |
|---------|---------|-------------|
| `highlightMilestones` | `true` | Special title for milestone ages |
| `milestoneAges` | `[18, 30, 40, ...]` | Which ages count as milestones |
| `leapYearHandling` | `'feb28'` | Feb 29 fallback: `'feb28'` or `'mar1'` |
| `deceasedHandling` | `'skip'` | `'skip'`, `'memorial'`, or `'normal'` |
| `deceasedLabel` | `'Deceased'` | Google Contacts label for deceased |
| `deceasedDateLabel` | `'Death date'` | Custom date field label for death date |

</details>

<details>
<summary><strong>9. Advanced</strong></summary>

| Setting | Default | Description |
|---------|---------|-------------|
| `rateLimitBatchSize` | `20` | API calls before pausing |
| `rateLimitDelayMs` | `500` | Pause duration in ms |
| `dryRun` | `false` | Preview mode — logs changes without modifying |
| `eventTag` | `'[BirthdaySync]'` | Internal tag for duplicate prevention (don't change) |

</details>

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
