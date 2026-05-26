# 🎂 Birthday Calendar Sync

Synchronizes birthdays from Google Contacts to a dedicated Google Calendar. Built with Google Apps Script and managed locally via [clasp](https://github.com/google/clasp).

## Features

- **Individual birthday events** — one all-day event per contact on their birthday
- **Monthly summary events** — a single event listing all birthdays that month
- **Recurring or single events** — choose between yearly recurring or individual per-year events
- **Structured descriptions** — organized sections with contact links, social media, and labels
- **Google Contacts link** — direct link to the contact in every event description
- **Configurable titles & texts** — all event titles, description labels, and email texts are customizable
- **Event colors** — optional per-type color coding (milestone, memorial, summary)
- **Email notifications** — monthly summaries and sync change notifications
- **Label filtering** — sync only contacts with specific Google Contacts labels
- **Milestone highlighting** — special event titles for round birthdays (30, 40, 50, etc.)
- **Deceased contact handling** — skip or create memorial events
- **Leap year handling** — configurable fallback for Feb 29 birthdays
- **Dry-run mode** — preview all changes without modifying anything
- **Duplicate prevention** — tagged events prevent duplicates even when names change
- **Social links** — WhatsApp and Instagram links in event descriptions (toggleable)
- **Rate limiting** — configurable API throttling to avoid quota issues

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

```bash
clasp create --type standalone --title "Birthday Calendar Sync"
```

Or copy `.clasp.json.example` to `.clasp.json` and set your `scriptId`.

### 4. Configure

Copy the example config and fill in your values:

```bash
cp src/config.js.example src/config.js
```

At minimum, set your `calendarId`. Everything else has sensible defaults.

### 5. Deploy

```bash
pnpm run deploy   # runs tests, then pushes to Apps Script
```

### 6. Set up triggers

In the Apps Script editor, create time-based triggers:

| Function | Schedule |
|----------|----------|
| `updateBirthdaysAndSummariesInCalendar()` | Daily (e.g., 2:00 AM) |
| `sendSummaryMail()` | Monthly (e.g., last day of month) |

## Configuration

The config is split into sections. See `src/config.js.example` for the full template with comments.

<details>
<summary><strong>Essential Settings</strong></summary>

| Setting | Default | Description |
|---------|---------|-------------|
| `calendarId` | — | Google Calendar ID (required) |
| `createIndividualBirthdayEvents` | `true` | Create per-contact birthday events |
| `createBirthdaySummaryEvents` | `true` | Create monthly summary events |
| `useLabel` / `labelFilter` | `false` / `[]` | Filter contacts by label |
| `individualReminderMethod` | `'popup'` | Reminder type for individual events |
| `individualReminderMinutes` | `60 * 24` | 1 day before |
| `summaryReminderMethod` | `'popup'` | Reminder type for summary events |
| `summaryReminderMinutes` | `5760` | 4 days before |
| `individualMonthsAhead` | `12` | Lookahead for individual events |
| `summaryMonthsAhead` | `6` | Lookahead for summary events |
| `sendCalendarUpdateEmail` | `false` | Email notification after sync |

</details>

<details>
<summary><strong>Event Appearance</strong></summary>

**Title templates** — placeholders: `{name}`, `{age}`, `{birthdate}`, `{lifespan}`

```js
const eventTitles = {
  birthday: '🎂 {name}\'s Birthday',
  milestone: '🎂🎉 {name} turns {age}! 🎉',
  recurring: '🎂 {name}\'s Birthday',
  memorial: '🕯️ {name} ({lifespan})',
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

| ID | Color |
|----|-------|
| `'1'` | Lavender |
| `'2'` | Sage |
| `'3'` | Grape |
| `'4'` | Flamingo |
| `'5'` | Banana |
| `'6'` | Tangerine |
| `'7'` | Peacock |
| `'8'` | Graphite |
| `'9'` | Blueberry |
| `'10'` | Basil |
| `'11'` | Tomato |

```js
const eventColors = {
  birthday: '',    // also used for recurring events
  milestone: '5',  // e.g., Banana for milestones
  memorial: '8',   // e.g., Graphite for memorials
  summary: ''
};
```

**Content toggles**

| Setting | Default | Description |
|---------|---------|-------------|
| `showSocialLinks` | `true` | Show WhatsApp/Instagram in descriptions |
| `showEventTag` | `false` | Show the `[BirthdaySync]` tag visibly |

</details>

<details>
<summary><strong>Behavior</strong></summary>

| Setting | Default | Description |
|---------|---------|-------------|
| `eventRecurrence` | `'single'` | `'single'` or `'recurring'` (yearly) |
| `highlightMilestones` | `true` | Special title for milestone ages |
| `milestoneAges` | `[18, 30, 40, ...]` | Which ages count as milestones |
| `leapYearHandling` | `'feb28'` | Feb 29 fallback: `'feb28'` or `'mar1'` |
| `summaryEventDay` | `1` | Day of month for summary event (1-28) |
| `deceasedHandling` | `'skip'` | `'skip'`, `'memorial'`, or `'normal'` |
| `deceasedLabel` | `'Deceased'` | Google Contacts label for deceased |
| `deceasedDateLabel` | `'Death date'` | Custom date field label |

</details>

<details>
<summary><strong>Email Subjects & Texts</strong></summary>

```js
const emailSubjects = {
  monthlySummary: '🎂 Birthday Reminder 🎂',
  dailyReminder: '🎁 Today\'s Birthdays 🎁',
  calendarUpdate: '📅 Birthday Updates 📅'
};

const emailTexts = {
  greeting: 'Hi{name},',
  monthlySummaryTitle: '🎉 {month} Birthdays',
  monthlySummaryIntro: 'Here are your contacts\' birthdays in {month} {year}:',
  monthlySummaryCount: '{count} birthday(s) this month:',
  calendarUpdateTitle: '🔄 Birthday Event Updates',
  calendarUpdateIntro: 'The following events were added to your calendar:',
  calendarUpdateIndividualHeader: 'Individual Birthdays:',
  calendarUpdateSummaryHeader: 'Monthly Summaries:',
  calendarUpdateCreated: '✨ Created:',
  calendarUpdateUpdated: '🔄 Updated:',
  dailyReminderTitle: '🎉 Today\'s Birthdays',
  dailyReminderIntro: '{count} of your contacts have a birthday today:',
  dailyReminderUpcomingHeader: '📅 Upcoming Birthdays',
  dailyReminderUpcomingIntro: '{count} birthdays in the next {days} days:',
  viewCalendar: 'View Calendar',
  manageContacts: 'Manage Contacts'
};
```

</details>

<details>
<summary><strong>Advanced</strong></summary>

| Setting | Default | Description |
|---------|---------|-------------|
| `rateLimitBatchSize` | `20` | Events before pausing |
| `rateLimitDelayMs` | `500` | Pause duration (ms) |
| `dryRun` | `false` | Preview mode (no changes) |
| `eventTag` | `'[BirthdaySync]'` | Internal tag for duplicate prevention |
| `monthNames` / `monthNamesLong` | English | Month names for your locale |

</details>

## Event Description Format

Events use a structured description with sections:

```
🎂 Max Mustermann turns 34
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
- `'memorial'` — memorial event: `🕯️ Name (*1990 †2022)`
- `'normal'` — treated like any other contact

## Project Structure

```
src/
├── config.js.example     # Configuration template (copy to config.js)
├── birthday_contact.js   # BirthdayContact class
├── calendar_manager.js   # Calendar API wrapper
├── calendar_sync.js      # Sync logic (individual + summary events)
├── contact_manager.js    # Google Contacts API fetching
├── email_manager.js      # Email notifications
├── label_manager.js      # Contact label/group management
├── main.js               # Entry point functions
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
