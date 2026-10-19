# Data and backups

[← README](../README.md) · [Architecture](ARCHITECTURE.md) · [Drum presets](PRESETS.md)

Web Band keeps data in one browser profile and origin. There is no account or
automatic sync. Export backups regularly, especially before clearing browser data
or moving to another device.

## Choose the right export

| Export          | Use it for                                                                  | Import limit          |
| --------------- | --------------------------------------------------------------------------- | --------------------- |
| Pattern sharing | Send one custom drum groove or your custom drum library                     | 10 MB, 1–100 patterns |
| Full backup     | Copy custom content, favorites, presets, history, settings, and preferences | 25 MB                 |

These formats are separate. Files in [`presets/`](../presets/) are drum-pattern
shares, not saved Practice presets. Saved Practice presets refer to grooves by ID
and move between browsers as part of full backups.

## Pattern sharing

In the Pattern Library, export one custom groove as `web-band-pattern-<name>.json`
or the full custom drum library as `web-band-patterns-YYYY-MM-DD.json`.
**Import patterns** previews the grooves before saving them.

Pattern files use this strict envelope:

```text
app: "web-band"
kind: "drum-patterns"
version: 1
exportedAt: canonical UTC ISO timestamp
data:
  patterns: one to 100 validated custom drum patterns
```

Files cannot contain built-in IDs, malformed hits, duplicate pattern IDs, or more
than 100 grooves. If an imported ID already exists locally, Web Band creates new
pattern and hit IDs instead of overwriting existing work.

The repository includes twelve directly importable song-groove examples. The
[preset guide](PRESETS.md) covers importing, the catalog, the complete schema,
grid notation, manual authoring, and creating additional files with AI.

## Full backups

Settings and History export `web-band-backup-YYYY-MM-DD.json` as `application/json`.
The current strict envelope is version 4:

```text
app: "web-band"
version: 4
exportedAt: canonical UTC ISO timestamp
data:
  customPatterns, favoritePatternIds
  customChordProgressions, favoriteChordProgressionIds
  customStrummingPatterns, practicePresets, practiceSessions
  settings: practice, guidedPractice, history
  preferences: appearance, onboardingDismissed, recentPatternIds
```

### Validation and preview

Imports are capped at 25 MB. A dedicated worker parses, migrates, validates, and
counts records before any mutation. The prepared preview stays in memory until
confirmation and uses an opaque reference, rather than trusting a caller-created
preview object.

Validation checks IDs, timestamps, record limits, built-in collisions, duplicate
drum cells, recent-pattern references, and applicable cross-record references.
Valid version 1–3 backups migrate to version 4 with historical defaults for missing
fields. Unknown versions are rejected.

### Merge and replace

- **Merge** inserts or updates records by ID and keeps other local records.
- **Replace** starts a validated safety-backup download, replaces IndexedDB-managed
  collections in one transaction, then applies settings and preferences.
- **Both modes apply imported settings.** Version 3 and 4 imports also replace
  appearance, recent patterns, and onboarding preferences. Version 1 and 2 merge
  imports preserve those preferences because the formats did not contain them;
  legacy replace imports use historical defaults.

**IndexedDB and `localStorage` are not one transaction.** A settings write or UI
refresh can fail after database replacement succeeds. The app reports these as
partial-completion warnings, not as a failed database replacement.

### Reset and delete

- **Reset settings** changes preferences but leaves IndexedDB collections intact.
- **Delete all** first starts a complete version 4 safety-backup download, then
  empties IndexedDB collections, resets live state, and removes current and legacy
  app-owned `localStorage` keys using an explicit allowlist.
- Both reset the device-specific Controls layout preference. Unrelated origin
  storage and the offline application shell are preserved by Delete all.

Deleting custom content does not rewrite historical practice presets. Presets with
missing references remain exportable but cannot load until the content is restored.

## IndexedDB schema

[`src/db/database.ts`](../src/db/database.ts) defines the Dexie database
**`web-band`**, currently at **schema version 3**.

| Table                       | Primary key     | Purpose                             |
| --------------------------- | --------------- | ----------------------------------- |
| `customPatterns`            | `id`            | Validated custom drum patterns      |
| `favoritePatterns`          | `patternId`     | Drum-pattern favorites              |
| `chordProgressions`         | `id`            | Validated custom chord progressions |
| `favoriteChordProgressions` | `progressionId` | Chord-progression favorites         |
| `strummingPatterns`         | `id`            | Validated custom strumming patterns |
| `practiceSessions`          | `id`            | Local practice journal              |
| `practicePresets`           | `id`            | Saved practice configurations       |

Version 2 added chord-progression favorites. Version 3 strongly types custom
patterns, strumming patterns, and sessions, and adds session indexes for start
time, pattern, and mode. Existing version 1 and 2 records are retained; invalid
legacy records are filtered before reaching UI or playback and reported as
partially recovered collections.

Schema declarations are migration history. Add a new `version()` and migration
tests for schema changes rather than rewriting versions 1–3.

## Local settings

Preferences use these app-owned `localStorage` keys:

| Key                             | Contents                                                                                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web-band-practice-settings-v4` | BPM, groove ID, master volume, count-in, swing, humanization, fills, mixer, kit character, Wake Lock, BPM step, and restore-last-practice preference |
| `web-band-guided-practice-v1`   | Active mode and validated tempo, chord, and strumming setup                                                                                          |
| `web-band-history-settings-v1`  | Session-recording toggle and minimum duration                                                                                                        |
| `web-band-recent-patterns-v1`   | Up to 20 recently used pattern IDs                                                                                                                   |
| `web-band-appearance-v2`        | Theme, reduced motion, subdivision detail, and beat-flash intensity                                                                                  |
| `web-band-practice-layout-v1`   | Desktop Controls visibility; excluded from presets and backups                                                                                       |
| `web-band-onboarding-dismissed` | Onboarding completion; included in backup/reset handling                                                                                             |

Practice settings migrate the v1–v3 shapes, including a safe Balanced kit default;
appearance settings migrate v1. Values are parsed defensively and clamped.
Corrupted practice settings fall back to Basic Rock at 90 BPM and 80% volume.

The BPM step is 1 or 5. With restore-last-practice disabled, startup resets BPM,
groove, fills, humanization, and swing while keeping mixer, count-in, kit character,
Wake Lock, and BPM-step preferences.

Desktop Controls start collapsed. Below 1024px, the sheet starts dismissed and
does not overwrite the desktop preference. Layout is device-specific, not part
of musical settings or portable backups.

## Practice journal durability

The journal supports weekly and lifetime totals, most-used groove, BPM range,
grouped recent sessions, and deletion. Its meaningful-session threshold is
1–3600 seconds, with a 30-second default; legacy zero values migrate to one second.

Active sessions checkpoint when the page becomes hidden or receives `pagehide`.
Navigation/finalization updates the same session ID with its longer final duration.
These asynchronous writes are **best effort**: process termination, power loss,
or immediate mobile suspension can prevent a final checkpoint from becoming durable.

## Storage failures

If IndexedDB is missing or cannot open, the storage service starts fresh in-memory
repositories and shows a nonblocking warning. Data saved there lasts only for the
current visit.

If an operation fails after IndexedDB opened, the service copies every readable
collection into memory and the caller retries the failed operation once. The
active practice configuration stays usable. Preference writes that fail to reach
`localStorage` are also reported and may reset next visit.

Components consume storage through services and repositories. Validation and
cloning happen at those boundaries; components do not access Dexie directly.
