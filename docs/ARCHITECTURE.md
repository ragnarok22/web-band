# Architecture

[← README](../README.md) · [Development](DEVELOPMENT.md) · [Data and backups](DATA_AND_BACKUPS.md)

Web Band is one private Next.js 16 App Router package using React, TypeScript,
Tone.js, Zustand, Dexie, and Serwist. The product runs in the browser: there are
no API routes, server actions, backend, authentication, analytics, cloud
persistence, or recorded audio assets.

## Source layout and boundaries

```text
src/
|-- app/                  Routes, metadata, styles, and service worker
|-- audio/                Tone runtime, scheduler, voices, mixer, and guidance
|-- components/           Practice, library, navigation, and provider UI
|-- data/                 Built-in drum, chord, and strumming data
|-- db/                   Dexie database, repositories, and fallback service
|-- hooks/                Browser lifecycle and application orchestration
|-- lib/                  Validation and musical-time calculations
|-- services/             Backup orchestration across storage and stores
|-- stores/               Serializable Zustand stores
|-- test/                 Shared Vitest setup
`-- types/                Audio, pattern, and persistence contracts
```

- Route files are thin server components. Substantive screens enter browser-only
  code through client shells using `dynamic(..., { ssr: false })`.
- Hooks coordinate UI, stores, storage, and the shared audio engine. Route owners
  dispose the audio singleton on unmount.
- Zustand holds serializable status and configuration, never Tone nodes,
  AudioNodes, schedules, or precise per-tick timing.
- Components use [`StorageService`](../src/db/storage-service.ts) and repository
  interfaces rather than accessing Dexie directly.

## Audio engine

[`src/audio/audio-engine.ts`](../src/audio/audio-engine.ts) owns the browser audio
lifecycle. Tone Transport, not React rendering, timers, or animation frames, is
the musical clock.

1. A direct Play interaction calls `Tone.start()`.
2. The engine creates one reusable instrument manager and master signal path.
3. The scheduler registers an optional meter-aware count-in and a continuous
   sixteenth-note pattern/guidance pulse on `Tone.getTransport()`.
4. Tone's callback time goes directly to Web Audio nodes for sample-accurate scheduling.
5. `Tone.getDraw().schedule()` publishes visual steps at the audible time; it never
   owns semantic transport state.
6. Queued pattern changes commit at measure boundaries, with compatible transition
   fills. They can change meter or subdivision without rebuilding the loop. Explicit
   immediate switches require the same meter; new grooves adopt their swing defaults.
7. Swing updates Tone Transport. Humanization and fills alter individual hits,
   not the underlying transport grid.
8. Tempo, chord, and strumming guidance use the same pulse. Cancellable Tone
   context-clock callbacks publish semantic state and target stops independently
   of animation frames.
9. Six retained kit buses apply volume, mute, and solo automation without rebuilding
   voices or schedules.
10. Repeat callbacks retain source-tick positions so lookahead events replay
    correctly after pause, including during swing or BPM changes.
11. Pause preserves position. Stop clears owned schedules, resets position, and
    silences active voices.
12. Disposal stops sources, runs each cleanup once, disconnects nodes, removes
    context listeners, and cancels visual and semantic work.

### Synthesized instruments

| Instrument              | Synthesis                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------- |
| Kick                    | Sine oscillator, rapid pitch drop, amplitude envelope, and subtle transient oscillator |
| Snare                   | Band-pass-filtered white noise with a pitched triangle body                            |
| Closed hi-hat           | High-pass- and band-pass-filtered noise with a short decay                             |
| Open hi-hat             | Longer filtered-noise envelope, choked by the closed hi-hat                            |
| Low, mid, and high toms | Triangle oscillators with individual pitch envelopes                                   |
| Crash and ride          | Filtered noise; ride adds a short pitched bell component                               |
| Rim and clap            | Short filtered oscillator and layered noise transients                                 |
| Count-in click          | Short square oscillator with distinct downbeat pitch and velocity                      |

Noise buffers are generated from random values in memory. They are not recordings,
bundled samples, or downloaded audio.

## Pattern data

[`DrumPattern`](../src/types/pattern.ts) contains metadata, meter, subdivision,
bar count, and hit records. Each hit has an instrument, zero-based step, velocity
from 0 to 1, and optional probability, flam, and timing-offset metadata. Patterns
never contain audio nodes or asset references.

[`validatePattern()`](../src/lib/pattern-validation.ts) checks stored and imported
data before scheduling. Invalid custom data is ignored or rejected.

The [built-in library](../src/data/patterns/) has 44 original generic practice
grooves across 11 categories and beginner, intermediate, and advanced difficulties.
It supports 2/4, 3/4, 4/4, 5/4, 6/8, 7/8, and 12/8 on eighth- and sixteenth-note grids.
These are not song transcriptions; the separate [song-groove presets](PRESETS.md)
are simplified educational approximations.

Basic Rock is one 4/4 bar on an eighth-note grid:

```text
Subdivision: 1 & 2 & 3 & 4 &
Hi-hat:     x x x x x x x x
Snare:          x       x
Kick:       x       x
```

The custom editor supports one, two, or four bars, per-hit velocity cycling,
probability, audible flams, timing offsets, measure copy/paste, row clearing,
preview playback, and an audio-synchronized playhead. See [Data and backups](DATA_AND_BACKUPS.md#pattern-sharing)
for portable pattern files.

## Practice experience

The full-width workspace places mode selection, Current Groove details, and
tempo/playback controls together. Optional Controls hold sound, groove feel,
kit character, and advanced settings. On desktop, closing Controls expands the
workspace; below 1024px they open in a right-side sheet. Closing them never
changes playback or mixer parameters.

Playback supports 40–220 BPM, tap tempo, pause/resume, immediate stop, and
fill-to-finish. Count-ins can be 0, 1, 2, or 4 measures with accented downbeats.
Category- and meter-aware fills run every 4, 8, or 16 measures, at controlled
random intervals, or during transitions. Fills come from a finite template
library, not user-authored or song-specific arrangements.

The six-group mixer offers volume, mute, solo, reset, and perceptual master volume.
Soft, Balanced, and Punchy kit characters apply on start/resume; Balanced preserves
the original sound.

Guided modes add:

- **Tempo:** ascending or descending targets, measure- or seconds-based intervals,
  configurable increments, and optional target stop.
- **Chords:** current/next chord prompts, countdowns, five built-in progressions,
  favorites, and a custom editor. Chords are visual guidance, not synthesized guitar.
- **Strumming:** down, up, mute, rest, hold, and accent cues; seven built-in patterns
  covering 4/4, 3/4, and 6/8, plus a custom editor.

Practice presets atomically restore the groove and guided setup, with rename,
duplicate, favorite, recent, and delete controls. The library supports search,
genre/difficulty/meter/grid filters, name/BPM/recent/favorite sorting, and rhythm
previews. A disabled Metronome mode entry is only a future-UI placeholder.

Focus mode, a practice timer, optional Wake Lock, and audio-synchronized beat and
subdivision visuals support longer sessions. Keyboard shortcuts cover playback,
stop, pattern changes, BPM, tap tempo, focus, and master mute. Navigation and controls
include mobile sheets, safe-area handling, skip navigation, visible focus, focus
recovery after destructive actions, nonblocking notices, dark/light/system themes,
and an explicit reduced-motion preference.

## Offline support

[`src/app/manifest.ts`](../src/app/manifest.ts) defines installable app metadata
and local 192px, 512px, and maskable PNG icons. Serwist precaches built assets and
`/practice`, `/patterns`, `/editor`, `/history`, `/settings`, and `/about`.
Failed document navigations fall back to `/practice`.

After a successful production visit and service-worker installation, these routes
reload offline. Built-in patterns and synthesis code are part of the shell;
practice data comes from browser storage. No remote resources or audio files
are cached. Service-worker generation and registration are disabled in development.

Web Band owns registration and update notifications. Users explicitly apply a
waiting update and reload only after the new worker takes control. Registration,
installation, and activation failures show targeted retry guidance.

The Webpack build generates `public/sw.js`; generated worker files are ignored by
Git, Prettier, and ESLint. See [Development](DEVELOPMENT.md#production-pwa-tests)
for offline and update verification.
