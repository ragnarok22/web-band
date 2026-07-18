# Web Band Rhythm Practice

Web Band is a browser-based drum and rhythm practice companion for guitarists. The completed foundation, audio-engine, pattern-system, practice-feature, guided-practice, and creation-and-persistence phases provide a focused practice room, a 44-pattern groove library, accurate Tone.js scheduling, synchronized guidance, custom groove creation, a local practice journal, and portable backups.

Every drum sound is synthesized in real time with the Web Audio API. The project contains no recorded drum samples, MP3 files, WAV files, external audio assets, backend, authentication, analytics, or cloud services.

## Current Features

- Synthesized kick, snare, closed and open hi-hats, three toms, crash, ride, rim, clap, and count-in click.
- Tone.js transport with 44 built-in educational patterns across 11 practice categories.
- Searchable pattern browser with genre, difficulty, meter, and subdivision filters.
- Pattern sorting by name, default BPM, recently used, and favorites.
- Persistent IndexedDB favorites and lightweight rhythm previews.
- Pattern changes quantized to the next measure during playback.
- Support for 2/4, 3/4, 4/4, 5/4, 6/8, 7/8, and 12/8 patterns on eighth- and sixteenth-note grids.
- Smooth BPM changes from 40 to 220 without restarting playback.
- Play, Pause, Resume, and Stop behavior.
- Configurable 0-, 1-, 2-, or 4-measure count-in with meter-aware clicks and accented downbeats.
- Audio-synchronized beat and subdivision visualization.
- Practice timer, distraction-free focus mode, and tap tempo.
- Live swing and subtle timing and velocity humanization.
- Meter-aware generated fills every 4, 8, or 16 measures or at controlled random intervals.
- Compact six-group mixer with volume, mute, solo, reset, and perceptual master-volume control.
- Optional Screen Wake Lock during active practice.
- Keyboard shortcuts for transport, BPM, tap tempo, focus mode, and master mute.
- Tempo training with ascending or descending targets, measure- or seconds-based intervals, configurable increments, and optional target stop.
- Chord progression training with current/next chord guidance, countdowns, five built-in progressions, favorites, and a custom progression editor.
- Strumming guidance with down, up, mute, rest, hold, and accent cues across seven built-in 4/4, 3/4, and 6/8 patterns.
- Practice presets that save and atomically restore the groove and guided setup, with rename, duplicate, favorite, recent, and delete controls.
- A responsive step-sequencer editor for creating, duplicating, previewing, saving, and deleting custom one-, two-, or four-bar drum patterns.
- Per-hit velocity cycling plus advanced probability, flam, and timing controls, measure copy/paste, row clearing, and audio-synchronized editor playhead guidance.
- A local practice journal with configurable session thresholds, weekly and lifetime totals, most-used groove and BPM range, grouped recent sessions, and deletion controls.
- Versioned JSON export and validated merge or replace import for custom content, favorites, presets, history, and practice settings.
- Versioned IndexedDB initialization through Dexie.
- Runtime in-memory storage fallback with readable-data recovery, one retry, and a nonblocking warning.
- Versioned `localStorage` persistence for practice and mixer preferences.
- Installable PWA with offline practice, pattern library, editor, history, and settings routes plus an update notification.
- Responsive layouts tested at 320px, mobile, and desktop widths.

The remaining final-quality work is tracked in `PLANING.md`.

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
pnpm test:e2e       # Desktop and mobile Playwright flows
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
5. `Tone.getDraw().schedule()` publishes visual steps at the audible time.
6. Queued pattern changes replace the active pattern at the next measure and may change meter or subdivision without rebuilding the transport loop.
7. Swing updates Tone Transport directly; humanization and fills alter individual scheduled hits without changing the transport grid.
8. The guided-practice controller derives tempo, chord, and strumming positions from that same pulse; tempo changes and target stops occur on musical boundaries.
9. Six retained kit buses apply channel volume, mute, and solo automation without rebuilding voices or schedules.
10. Pause preserves transport position. Stop clears owned schedules, resets position, and silences active voices.
11. Disposal stops sources, disconnects one-shot and shared nodes, removes context listeners, and cancels draw work.

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

Version 2 adds chord progression favorites. Version 3 strongly types custom patterns, custom strumming patterns, and practice sessions, with session indexes for start time, pattern, and mode. Existing version 1 and 2 rows are retained; invalid legacy rows are ignored by repository validation rather than reaching the UI or scheduler.

If IndexedDB is missing, opening fails, or a later repository operation makes the database unavailable, the storage service attempts to copy readable records into in-memory repositories, retries the operation once, and displays a nonblocking warning. New memory-backed data lasts only for the current visit; the active practice configuration remains usable.

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

The versioned key `web-band-practice-settings-v2` stores:

- Last BPM.
- Last selected pattern ID.
- Master volume.
- Count-in length.
- Swing and humanization.
- Fill frequency.
- Six mixer channel settings.
- Wake Lock preference.

The repository reads the legacy `web-band-practice-settings-v1` shape and fills the Phase 4 fields with safe defaults. The separate `web-band-guided-practice-v1` key stores the active mode and validated tempo, chord, and strumming trainer settings. `web-band-history-settings-v1` stores whether session recording is enabled and its minimum meaningful duration. `web-band-recent-patterns-v1` stores up to 20 recently used pattern IDs for browser sorting. Favorites, custom patterns, chord progressions, presets, and history remain in IndexedDB.

Values are parsed defensively and clamped before use. Corrupted settings fall back to Basic Rock at 90 BPM and 80% volume.

## PWA and Offline Behavior

`src/app/manifest.ts` defines the installable app metadata and generated 192px, 512px, and maskable icons. Serwist precaches the built application assets and the `/practice`, `/patterns`, `/editor`, `/history`, and `/settings` routes; built-in pattern data and synthesis code are part of that shell.

After the first successful production visit, every local-first route reloads offline with saved local data. A service-worker controller change shows a reload notification when a new version becomes active.

No remote resources or audio files are cached.

## Import and Export

Settings and History can export an `application/json` file named `web-band-backup-YYYY-MM-DD.json`. The strict version 1 envelope contains:

```text
app: "web-band"
version: 1
exportedAt: canonical UTC ISO timestamp
data:
  customPatterns, favoritePatternIds
  customChordProgressions, favoriteChordProgressionIds
  customStrummingPatterns, practicePresets, practiceSessions
  settings: practice, guidedPractice, history
```

Imports are parsed as data, capped at 25 MB, and fully validated before mutation. IDs, timestamps, record limits, built-in collisions, duplicate drum cells, and applicable cross-record references are checked. Merge upserts imported records by ID and keeps other local records. Replace starts a safety-backup download, atomically replaces the IndexedDB-managed collections, then applies the small versioned settings stored in `localStorage`. IndexedDB and `localStorage` are separate browser systems and therefore are not one transaction; post-commit settings or refresh failures are reported as partial-completion warnings rather than claiming the database replacement failed.

## Browser Support

Recommended:

- Current Chrome, Edge, Firefox, or Safari.
- iOS Safari 16.4 or newer for installed PWA behavior.
- HTTPS in production, which is required for service workers outside localhost.

Graceful degradation:

- Missing Web Audio shows an audio initialization error.
- A suspended audio context resumes when Play is pressed.
- Missing or blocked IndexedDB uses memory for the current visit.
- IndexedDB failures after startup trigger one recovery-and-retry attempt in memory.
- Missing service-worker support leaves the online practice experience functional.
- Missing or denied Screen Wake Lock leaves playback functional and reports a nonblocking status.

## Testing

Vitest covers musical calculations, BPM clamping, built-in and custom content validation, editor transformations and grid interaction, tempo, chord, and strumming positions, practice-history lifecycle and aggregation, Dexie repositories and migrations, backup validation and orchestration, runtime storage recovery, measure-aligned Tone scheduling, and core UI controls.

Playwright runs the real browser audio engine and verifies:

- Root redirect and initial Basic Rock state.
- User-initiated audio startup.
- Count-in to groove transition.
- Configurable count-in, groove feel, fill, and mixer persistence.
- Space-bar start and active-session stop behavior.
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
- Meaningful practice-session recording, journal persistence, and deletion.
- JSON backup download, validation, merge, clear, restore, and reload persistence.
- Reload persistence on desktop and mobile profiles.
- Production service-worker control and offline loading for every local-first route.

The Web Audio implementation remains real in production. Unit component tests mock only the engine boundary where browser audio is unavailable in jsdom.

## Known Limitations

- Custom strumming-pattern editing and theme selection remain future work.
- Wake Lock depends on browser support and a secure context.
- Fills are generic meter-aware practice fills rather than category-specific arrangements.
- Chord symbols are text guidance only; Web Band does not synthesize guitar chords.
- Session finalization on route navigation is best effort; abrupt browser or process termination can interrupt the final asynchronous IndexedDB write.
- Data is local to one browser profile unless the user exports and imports a backup.
- Automated tests can verify scheduling, state, node creation, and error-free playback, but synthesized timbre still benefits from listening checks on physical devices and headphones.

## Future Improvements

The final planned phase covers broader accessibility and browser verification, responsive polish, performance review, error handling, and cross-browser audio tuning as listed in `PLANING.md`.
