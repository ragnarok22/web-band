# Web Band Rhythm Practice

Web Band is a browser-based drum and rhythm practice companion for guitarists. The completed foundation, audio-engine, and pattern-system phases provide a focused practice room, a 44-pattern groove library, accurate Tone.js scheduling, live tempo controls, synchronized beat visualization, and local persistence.

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
- One-measure, meter-aware count-in with an accented downbeat.
- Audio-synchronized beat and subdivision visualization.
- Perceptual master-volume control.
- Versioned IndexedDB initialization through Dexie.
- In-memory storage fallback with a nonblocking warning.
- `localStorage` persistence for BPM, selected pattern, and volume.
- Installable PWA with offline practice and pattern-library routes plus an update notification.
- Responsive layouts tested at 320px, mobile, and desktop widths.

The remaining practice, guided-training, editing, history, and final-polish phases are tracked in `PLANING.md`.

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
|-- audio/                Tone runtime, scheduler, voices, mixer, visual timeline
|-- components/           Practice, pattern-browser, navigation, and provider UI
|-- data/patterns/        Pure built-in pattern data
|-- db/                   Dexie database, repositories, and fallback service
|-- lib/                  Pattern validation and musical-time calculations
|-- stores/               Focused serializable Zustand stores
|-- test/                 Shared Vitest setup
`-- types/                Audio, pattern, and persistence contracts
```

Tone.js and Web Audio objects are never stored in Zustand or persisted. Zustand only holds serializable transport status, practice configuration, pattern-library state, and storage status.

Components do not access IndexedDB directly. They initialize and consume storage through `StorageService` and repository interfaces.

## Audio Engine

`src/audio/audio-engine.ts` owns the browser audio lifecycle:

1. Play invokes `Tone.start()` from the direct user interaction.
2. The engine creates one reusable instrument manager and master signal path.
3. The scheduler registers one count-in event and one continuous sixteenth-note pattern pulse on `Tone.getTransport()`.
4. Tone's callback time is passed directly to Web Audio nodes for sample-accurate scheduling.
5. `Tone.getDraw().schedule()` publishes visual steps at the audible time.
6. Queued pattern changes replace the active pattern at the next measure and may change meter or subdivision without rebuilding the transport loop.
7. Pause preserves transport position. Stop clears owned schedules, resets position, and silences active voices.
8. Disposal stops sources, disconnects one-shot and shared nodes, removes context listeners, and cancels draw work.

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

Schema version: `1`

| Table               | Primary key | Current purpose                      |
| ------------------- | ----------- | ------------------------------------ |
| `customPatterns`    | `id`        | Validated user-created pattern data  |
| `favoritePatterns`  | `patternId` | Pattern favorite records             |
| `chordProgressions` | `id`        | Future chord progression records     |
| `strummingPatterns` | `id`        | Future custom strumming records      |
| `practiceSessions`  | `id`        | Future local practice history        |
| `practicePresets`   | `id`        | Future saved practice configurations |

The complete schema is created in version 1 so later slices can add repositories without reshaping the initial database. Future schema changes must use explicit Dexie versions and migrations.

If IndexedDB is missing or opening it fails, the storage service switches to in-memory pattern and favorite repositories and displays a nonblocking warning. The active practice configuration remains usable.

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

The versioned key `web-band-practice-settings-v1` stores only:

- Last BPM.
- Last selected pattern ID.
- Master volume.

The separate `web-band-recent-patterns-v1` key stores up to 20 recently used pattern IDs for browser sorting. Favorites remain in IndexedDB.

Values are parsed defensively and clamped before use. Corrupted settings fall back to Basic Rock at 90 BPM and 80% volume.

## PWA and Offline Behavior

`src/app/manifest.ts` defines the installable app metadata and generated 192px, 512px, and maskable icons. Serwist precaches the built application assets, `/practice`, and `/patterns`; built-in pattern data and synthesis code are part of that shell.

After the first successful production visit, the practice room and complete built-in pattern browser reload offline with saved local data. A service-worker controller change shows a reload notification when a new version becomes active.

No remote resources or audio files are cached.

## Import and Export

Backup import and export are not part of the current phases. The database schema and validation boundaries are prepared for the later versioned JSON backup phase described in `PLANING.md`. No current control suggests that import or export is available.

## Browser Support

Recommended:

- Current Chrome, Edge, Firefox, or Safari.
- iOS Safari 16.4 or newer for installed PWA behavior.
- HTTPS in production, which is required for service workers outside localhost.

Graceful degradation:

- Missing Web Audio shows an audio initialization error.
- A suspended audio context resumes when Play is pressed.
- Missing or blocked IndexedDB uses memory for the current visit.
- Missing service-worker support leaves the online practice experience functional.

## Testing

Vitest covers musical calculations, BPM clamping, all built-in pattern validation, compound filters and sorting, Dexie pattern and favorite repositories, local settings, storage fallback, measure-aligned Tone scheduling, and core practice and browser controls.

Playwright runs the real browser audio engine and verifies:

- Root redirect and initial Basic Rock state.
- User-initiated audio startup.
- Count-in to groove transition.
- Live BPM changes.
- Pause, Resume, and Stop.
- Pattern browsing and filtering.
- Favorite persistence across reloads.
- Opening a selected pattern in Practice mode.
- Measure-aligned pattern changes during active playback.
- Reload persistence on desktop and mobile profiles.
- Production service-worker control and offline loading for both primary routes.

The Web Audio implementation remains real in production. Unit component tests mock only the engine boundary where browser audio is unavailable in jsdom.

## Known Limitations

- The count-in is fixed to one measure, although it follows the selected pattern's meter.
- Pattern editing, fills, mixer controls, wake lock, guided trainers, history, presets, theme selection, backup import/export, and keyboard shortcuts remain future phases.
- Swing metadata is present on relevant patterns but transport swing control arrives in the next phase.
- Automated tests can verify scheduling, state, node creation, and error-free playback, but synthesized timbre still benefits from listening checks on physical devices and headphones.

## Future Improvements

The next planned phase adds configurable count-in, practice timer, focus mode, tap tempo, swing, humanization, fills, mixer controls, and wake lock. Later phases add guided trainers, creation tools, history, backup workflows, and final cross-browser audio tuning as listed in `PLANING.md`.
