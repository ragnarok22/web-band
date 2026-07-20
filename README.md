# Web Band Rhythm Practice

Web Band is a browser-based drum and rhythm practice companion for guitarists. The completed application provides a focused practice room, a 44-pattern groove library, accurate Tone.js scheduling, synchronized guidance, custom groove creation, a local practice journal, portable backups, offline support, and accessible dark and light themes.

Every drum sound is synthesized in real time with the Web Audio API. The project contains no recorded drum samples, MP3 files, WAV files, external audio assets, backend, authentication, analytics, or cloud services.

## Current Features

- Synthesized kick, snare, closed and open hi-hats, three toms, crash, ride, rim, clap, and count-in click.
- Tone.js transport with 44 built-in educational patterns across 11 practice categories.
- Searchable pattern browser with genre, difficulty, meter, and subdivision filters.
- Pattern sorting by name, default BPM, recently used, and favorites.
- Pattern cards with default and recommended BPM, meter, grid, and lightweight rhythm previews.
- Persistent IndexedDB favorites.
- Pattern changes use a compatible transition fill before committing, with an explicit same-meter immediate-switch option.
- Support for 2/4, 3/4, 4/4, 5/4, 6/8, 7/8, and 12/8 patterns on eighth- and sixteenth-note grids.
- Smooth BPM changes from 40 to 220 without restarting playback.
- Play, Pause, Resume, graceful fill-to-finish, and immediate Stop behavior.
- Configurable 0-, 1-, 2-, or 4-measure count-in with meter-aware clicks and accented downbeats.
- Audio-synchronized beat and subdivision visualization.
- Practice timer, distraction-free focus mode, and tap tempo.
- Live swing and subtle timing and velocity humanization.
- A validated category- and meter-aware fill library used every 4, 8, or 16 measures, at controlled random intervals, and for transitions.
- Compact six-group mixer with volume, mute, solo, reset, and perceptual master-volume control.
- Global Soft, Balanced, and Punchy synthesized kit characters; Balanced preserves the original sound.
- Optional Screen Wake Lock during active practice.
- Keyboard shortcuts for play/pause, stop, pattern changes, BPM, tap tempo, focus mode, and master mute.
- Tempo training with ascending or descending targets, measure- or seconds-based intervals, configurable increments, and optional target stop.
- Chord progression training with current/next chord guidance, countdowns, five built-in progressions, favorites, and a custom progression editor.
- Strumming guidance with down, up, mute, rest, hold, and accent cues across seven built-in 4/4, 3/4, and 6/8 patterns.
- Practice presets that save and atomically restore the groove and guided setup, with rename, duplicate, favorite, recent, and delete controls.
- A responsive step-sequencer editor for creating, duplicating, previewing, saving, and deleting custom one-, two-, or four-bar drum patterns.
- Per-hit velocity cycling plus advanced probability, audible flam, and timing controls, measure copy/paste, row clearing, and audio-synchronized editor playhead guidance.
- Pattern-only JSON sharing for one groove or the full custom library, with previewed imports that create copies instead of overwriting ID collisions.
- A local practice journal with configurable session thresholds, weekly and lifetime totals, most-used groove and BPM range, grouped recent sessions, and deletion controls.
- Versioned JSON export and validated merge or replace import for custom content, favorites, presets, history, and practice settings.
- Versioned IndexedDB initialization through Dexie.
- Runtime in-memory storage fallback with readable-data recovery, one retry, and a nonblocking warning.
- Versioned `localStorage` persistence for practice and mixer preferences.
- Warm dark, light, and system color themes plus an explicit reduced-motion preference.
- Skip navigation, visible keyboard focus, destructive-action focus recovery, safe-area-aware navigation, and stacked nonblocking notices.
- Installable PWA with offline practice, pattern library, editor, history, settings, and about routes plus an update notification.
- Responsive layouts tested at 320px, mobile, and desktop widths.

## Requirements

- Node.js 20 or newer.
- pnpm 11.13.1, as declared by `packageManager` in `package.json`.
- A modern browser with Web Audio and IndexedDB support.

## Setup

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000/practice](http://localhost:3000/practice). The root route redirects to `/practice`.

Audio will not start until Play is pressed. This is required by browser autoplay policies.

## Commands

```bash
pnpm dev            # Next.js development server using Webpack
pnpm build          # Optimized production build and service worker
pnpm start          # Serve the production build
pnpm format         # Format the project
pnpm format:check   # Verify formatting
pnpm lint           # ESLint
pnpm typecheck      # Generate Next route types and run strict TypeScript
pnpm test           # Vitest unit and component tests
pnpm test:coverage  # Vitest with V8 coverage
pnpm test:e2e       # Chromium, Firefox, WebKit, and mobile Playwright flows
pnpm test:pwa       # Production-build offline PWA verification
```

## Production Build

```bash
pnpm build
pnpm start
```

Serwist currently uses its stable Webpack integration, so both development and production scripts explicitly select Webpack on Next.js 16. The build generates `public/sw.js`; generated service-worker files are ignored by Git, Prettier, and ESLint.

The application has no server routes, server actions, or backend data dependencies. Next.js statically prerenders the application routes, while `next start` serves the built assets.

## Architecture

Application concerns are kept separate under `src/`:

```text
src/
|-- app/                  Next.js routes, metadata, styles, and service worker
|-- audio/                Tone runtime, scheduler, voices, mixer, and guidance
|-- components/           Practice, pattern-browser, navigation, and provider UI
|-- data/                 Pure built-in drum, chord, and strumming data
|-- db/                   Dexie database, repositories, and fallback service
|-- lib/                  Validation and musical-time calculations
|-- services/             Backup orchestration across storage and stores
|-- stores/               Focused serializable Zustand stores
|-- test/                 Shared Vitest setup
`-- types/                Audio, pattern, and persistence contracts
```

Tone.js and Web Audio objects are never stored in Zustand or persisted. Zustand only holds serializable transport status, practice and guided configuration, library state, presets, history, and storage status.

Components do not access IndexedDB directly. They initialize and consume storage through `StorageService` and repository interfaces.

## Audio Engine

`src/audio/audio-engine.ts` owns the browser audio lifecycle:

1. Play invokes `Tone.start()` from the direct user interaction.
2. The engine creates one reusable instrument manager and master signal path.
3. The scheduler registers an optional meter-aware count-in and one continuous sixteenth-note pattern and guidance pulse on `Tone.getTransport()`.
4. Tone's callback time is passed directly to Web Audio nodes for sample-accurate scheduling.
5. `Tone.getDraw().schedule()` publishes visual steps at the audible time and never owns semantic transport state.
6. Queued pattern changes replace the active pattern at the next measure and may change meter or subdivision without rebuilding the transport loop; same-meter changes can switch immediately when explicitly enabled, and pattern swing defaults are adopted with the new groove.
7. Swing updates Tone Transport directly; humanization and fills alter individual scheduled hits without changing the transport grid.
8. The guided-practice controller derives tempo, chord, and strumming positions from that same pulse; cancellable Tone context-clock callbacks publish semantic state and target stops without depending on animation frames.
9. Six retained kit buses apply channel volume, mute, and solo automation without rebuilding voices or schedules.
10. Repeat callbacks carry stable source-tick positions so Tone lookahead events replay correctly after pause, including during swing or BPM changes.
11. Pause preserves transport position. Stop clears owned schedules, resets position, and silences active voices.
12. Disposal stops sources, runs each cleanup exactly once, disconnects one-shot and shared nodes, removes context listeners, and cancels visual and semantic work.

The instrument modules use the following synthesis:

- Kick: sine oscillator, rapid pitch drop, amplitude envelope, and a subtle transient oscillator.
- Snare: programmatically generated white noise through a band-pass filter plus a pitched triangle body.
- Closed hi-hat: programmatically generated noise through high-pass and band-pass filters with a short decay.
- Open hi-hat: a longer filtered-noise envelope that is choked by the closed hi-hat.
- Toms: low, mid, and high triangle oscillators with individual pitch envelopes.
- Crash and ride: filtered generated noise, with a short pitched bell component on the ride.
- Rim and clap: short filtered oscillator and layered generated-noise transients.
- Count-in click: short square oscillator with separate downbeat pitch and velocity.

Noise buffers contain random values generated in memory by the application. They are not recordings or bundled samples.

## IndexedDB Schema

Dexie database name: `web-band`

Schema version: `3`

| Table                       | Primary key     | Current purpose                     |
| --------------------------- | --------------- | ----------------------------------- |
| `customPatterns`            | `id`            | Validated user-created pattern data |
| `favoritePatterns`          | `patternId`     | Pattern favorite records            |
| `chordProgressions`         | `id`            | Validated custom chord progressions |
| `favoriteChordProgressions` | `progressionId` | Chord progression favorite records  |
| `strummingPatterns`         | `id`            | Validated custom strumming records  |
| `practiceSessions`          | `id`            | Local practice journal entries      |
| `practicePresets`           | `id`            | Saved practice configurations       |

Version 2 adds chord progression favorites. Version 3 strongly types custom patterns, custom strumming patterns, and practice sessions, with session indexes for start time, pattern, and mode. Existing version 1 and 2 rows are retained; invalid legacy rows are filtered before reaching the UI or scheduler and reported by collection as partially recovered data.

If IndexedDB is missing, opening fails, or a later repository operation makes the database unavailable, the storage service attempts to copy readable records into in-memory repositories, retries the operation once, and displays a nonblocking warning. New memory-backed data lasts only for the current visit; the active practice configuration remains usable. The same global notice reports normal preference writes that could not reach `localStorage` and may reset next visit.

## Pattern Format

Patterns are pure serializable data defined by `DrumPattern` in `src/types/pattern.ts`. They contain metadata, meter, subdivision, bar count, and hit records. They never contain audio nodes or asset references.

Each hit identifies an instrument, zero-based step, velocity from 0 to 1, and optional probability, flam, and timing-offset metadata. `validatePattern()` checks imported or stored data before a pattern can enter the scheduler. Invalid custom data is ignored or rejected instead of reaching playback.

The built-in library is split by category under `src/data/patterns/`. All 44 patterns are original generic practice grooves rather than song transcriptions. The library covers beginner, intermediate, and advanced difficulties with musically varied velocities and accents.

Basic Rock uses one 4/4 bar with eight subdivisions:

```text
Subdivision: 1 & 2 & 3 & 4 &
Hi-hat:     x x x x x x x x
Snare:          x       x
Kick:       x       x
```

## Local Settings

The versioned key `web-band-practice-settings-v4` stores:

- Last BPM.
- Last selected pattern ID.
- Master volume.
- Count-in length.
- Swing and humanization.
- Fill frequency.
- Six mixer channel settings.
- Soft, Balanced, or Punchy sound character.
- Wake Lock preference.
- Default 1 or 5 BPM adjustment step.
- Whether to restore the last session-specific practice setup on startup.

The repository reads the legacy `web-band-practice-settings-v1` through `v3` shapes and supplies safe defaults, including Balanced sound character. The separate `web-band-guided-practice-v1` key stores the active mode and validated tempo, chord, and strumming trainer settings. `web-band-history-settings-v1` stores whether session recording is enabled and its meaningful-duration threshold. The supported range is 1–3600 seconds with a 30-second default; historical zero values migrate to one second. `web-band-recent-patterns-v1` stores up to 20 recently used pattern IDs for browser sorting. `web-band-appearance-v2` stores the device-only theme, reduced-motion preference, visual subdivision detail, and beat-flash intensity while migrating the v1 shape. Favorites, custom patterns, chord progressions, presets, and history remain in IndexedDB.

Practice history checkpoints active sessions when the page becomes hidden or receives `pagehide`, and normal navigation/finalization upserts the same session ID with its longer final duration. These asynchronous IndexedDB writes are best effort: browser process termination, power loss, or immediate mobile suspension can still prevent the final checkpoint from becoming durable.

Values are parsed defensively and clamped before use. Corrupted settings fall back to Basic Rock at 90 BPM and 80% volume.

## PWA and Offline Behavior

`src/app/manifest.ts` defines the installable app metadata and generated 192px, 512px, and maskable icons. Serwist precaches the built application assets and the `/practice`, `/patterns`, `/editor`, `/history`, `/settings`, and `/about` routes; built-in pattern data and synthesis code are part of that shell.

After the first successful production visit, every local-first route reloads offline with saved local data. Web Band owns service-worker registration so updatefound and waiting workers are visible: users apply a waiting update explicitly, reload only after the new worker takes control, and receive targeted retry guidance if registration, installation, or activation fails.

The production PWA suite seeds IndexedDB records and local preferences, verifies them after an offline service-worker navigation, and starts synthesized playback offline while asserting that Play triggers no HTTP requests. Update coverage installs a second worker, applies it through the notification UI, confirms takeover, and exercises the reload action. No remote resources or audio files are cached.

## Import and Export

The Pattern Library can export one custom groove as `web-band-pattern-<name>.json` or all custom grooves as `web-band-patterns-YYYY-MM-DD.json`. Pattern-share files use a separate strict envelope:

```text
app: "web-band"
kind: "drum-patterns"
version: 1
exportedAt: canonical UTC ISO timestamp
data:
  patterns: one to 100 validated custom drum patterns
```

Pattern files are capped at 10 MB and cannot contain built-in IDs, malformed hits, duplicate pattern IDs, or more than 100 grooves. The import preview lists every groove before saving. If an imported ID already exists locally, Web Band creates a new pattern and hit IDs so shared files never overwrite the recipient's work.

The repository includes ten directly importable song-groove examples under `presets/`. See [`docs/PRESETS.md`](docs/PRESETS.md) for the catalog, complete schema, grid notation, manual authoring workflow, and guidance for creating additional files with AI.

Settings and History can export an `application/json` file named `web-band-backup-YYYY-MM-DD.json`. The strict version 4 envelope contains:

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

Imports are parsed as data, capped at 25 MB, and fully validated before mutation. Valid version 1 through 3 backups migrate to version 4 with historical defaults for fields they could not contain; unknown versions remain rejected. IDs, timestamps, record limits, built-in collisions, duplicate drum cells, recent-pattern references, and applicable cross-record references are checked. Merge upserts imported records by ID and keeps other local records. Version 3 and 4 settings and preferences replace their current values in both modes; version 1 and 2 merge imports preserve appearance, recents, and onboarding because those formats never contained them, while legacy replacement uses historical defaults. Replace starts a validated safety-backup download, atomically replaces the IndexedDB-managed collections, then applies the versioned settings and preferences stored in `localStorage`. IndexedDB and `localStorage` are separate browser systems and therefore are not one transaction; post-commit settings or refresh failures are reported as partial-completion warnings rather than claiming the database replacement failed.

Delete all starts a complete version 4 safety backup, empties the IndexedDB collections, resets live state, and removes every current and legacy Web Band `localStorage` key from an explicit allowlist. It preserves unrelated origin storage and the offline application shell. Reset settings changes only preferences and leaves all IndexedDB collections intact.

## Browser Support

Recommended:

- Current Chrome, Edge, Firefox, or Safari.
- iOS Safari 16.4 or newer for installed PWA behavior.
- HTTPS in production, which is required for service workers outside localhost.

The automated browser matrix runs the complete 15-flow suite in Chromium, Firefox, WebKit, and mobile Chromium. Synthesized timbre and installed-PWA behavior should still receive listening and device checks before a public release.

Graceful degradation:

- Missing Web Audio shows an audio initialization error.
- A suspended audio context resumes when Play is pressed.
- Missing or blocked IndexedDB uses memory for the current visit.
- IndexedDB failures after startup trigger one recovery-and-retry attempt in memory.
- Missing service-worker support leaves the online practice experience functional.
- Missing or denied Screen Wake Lock leaves playback functional and reports a nonblocking status.

## Testing

Vitest covers musical calculations, BPM clamping, built-in and custom content validation, editor transformations and grid interaction, pattern-share parsing and collision-safe imports, tempo, chord, and strumming positions, practice-history lifecycle and aggregation, Dexie repositories and migrations, backup validation and orchestration, runtime storage recovery, measure-aligned Tone scheduling, timed hi-hat choking, audible flams, and core UI controls.

Playwright runs the real browser audio engine and verifies:

- Root redirect and initial Basic Rock state.
- User-initiated audio startup.
- Count-in to groove transition.
- Configurable count-in, groove feel, fill, and mixer persistence.
- Space-bar play, pause, and resume behavior plus Escape stop and arrow-key pattern changes.
- Focus-mode entry and exit.
- Live BPM changes.
- Pause, Resume, and Stop.
- Pattern browsing and filtering.
- Favorite persistence across reloads.
- Opening a selected pattern in Practice mode.
- Measure-aligned pattern changes during active playback.
- Guided tempo preset save and reload behavior.
- Tempo-trainer advancement on a real musical boundary.
- Custom pattern creation, save, library discovery, practice loading, and reload persistence.
- Pattern-only download, removal, import, and reload persistence.
- Meaningful practice-session recording, journal persistence, and deletion.
- JSON backup download, validation, merge, clear, restore, and reload persistence.
- Custom strumming-pattern creation, editing, deletion, backup restore, and reload persistence.
- Reload persistence across Chromium, Firefox, WebKit, and mobile Chromium profiles.
- Production service-worker control and offline loading for every local-first route.

The Web Audio implementation remains real in production. Unit component tests mock only the engine boundary where browser audio is unavailable in jsdom.

## Known Limitations

- Wake Lock depends on browser support and a secure context.
- Fills are generic meter-aware practice fills rather than category-specific arrangements.
- Chord symbols are text guidance only; Web Band does not synthesize guitar chords.
- Session finalization on route navigation is best effort; abrupt browser or process termination can interrupt the final asynchronous IndexedDB write.
- Data is local to one browser profile unless the user exports and imports a backup.
- Automated tests can verify scheduling, state, node creation, and error-free playback, but synthesized timbre still benefits from listening checks on physical devices and headphones.

## Future Improvements

- Add custom strumming-pattern sharing.
- Add category-specific fill arrangements and optional alternate synthesis characters.
- Continue physical-device listening checks, especially installed iOS PWA audio and Wake Lock behavior.
