# Performance And Physical Release Checks

This document separates repeatable automated evidence from checks that require
human listening or installed-device behavior. Do not mark a physical row as
passed from unit tests, browser automation, screenshots, or a desktop trace.

## Phase 12 performance evidence

Profile captured on July 20, 2026 with Chrome 150 on macOS, a 1280x900
viewport, no CPU throttling, and no network throttling.

The production trace covered 53.4 seconds of active Basic Rock playback at 90
BPM while changing master, kick, and snare levels, observing the session timer,
saving a practice preset to IndexedDB, and entering focus mode.

| Measurement                         | Result                                                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Interaction to Next Paint           | 138 ms: 0.7 ms input delay, 106 ms processing, 32 ms presentation                                    |
| Cumulative Layout Shift             | 0.00                                                                                                 |
| Longest development React mode swap | 31.1 ms for Strumming; Tempo 25.3 ms, Chords 25.3 ms, and Drums 25.7 ms                              |
| Slowest app component in mode swaps | 2.9 ms self time (`PatternSummary`); all other measured app component self times were 2.6 ms or less |
| Steady active React commits         | Roughly 3-4 ms average in the development build; focused playback remained below 6.7 ms              |

The production profile is the release signal. Development React timings include
Strict Mode and development instrumentation and are retained to identify broad
or repeated component work. Musical scheduling does not depend on React:
`BeatVisualizer` subscribes to the retained visual timeline and updates refs,
classes, and text directly. Tone Transport remains the clock for audio events.

Backup import parsing, migration, validation, and preview counting run in
`backup-import.worker.ts`. Browser coverage asserts that a worker is created,
and production PWA coverage imports a backup through the precached worker while
offline. The 25 MB limit is still checked before worker creation and inside the
worker.

## Automated audio and PWA evidence

- [x] Unit coverage exercises scheduling, tempo changes, count-in boundaries,
      fills, flams, mixer routing, timed open-hi-hat choke, pause/resume, stop,
      and disposal.
- [x] Browser coverage starts the real Web Audio engine from a user action and
      covers count-in, playback, live controls, guided modes, focus mode,
      persistence, and route teardown.
- [x] Production PWA coverage verifies service-worker control, every precached
      route, offline data persistence, and offline backup-worker startup.
- [x] Backup worker coverage verifies success, validation failure, runtime
      failure, opaque prepared data, and rejection before worker creation above
      25 MB.

## Physical device matrix

Run every applicable check with system sound enhancements disabled. Record the
browser/OS version, output device, result, and notes in the final four columns.

| Target                | Output                        | Browser/OS     | Result | Notes                                                                                                                                                             |
| --------------------- | ----------------------------- | -------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop Chromium      | Built-in speakers             | Chrome / macOS | [x]    | Passed July 20, 2026: 40/90/220 BPM, sound characters, hi-hat choke, count-ins, live controls, pause/resume, focus, stop/restart, swing, humanization, and fills. |
| Desktop Chromium      | Wired or Bluetooth headphones |                | [ ]    |                                                                                                                                                                   |
| Desktop Safari        | Built-in speakers             |                | [ ]    |                                                                                                                                                                   |
| Desktop Safari        | Wired or Bluetooth headphones |                | [ ]    |                                                                                                                                                                   |
| Android installed PWA | Phone speaker                 |                | [ ]    |                                                                                                                                                                   |
| Android installed PWA | Wired or Bluetooth headphones |                | [ ]    |                                                                                                                                                                   |
| iOS installed PWA     | Phone speaker                 |                | [ ]    |                                                                                                                                                                   |
| iOS installed PWA     | Wired or Bluetooth headphones |                | [ ]    |                                                                                                                                                                   |

For each row:

1. Play Basic Rock at 40, 90, and 220 BPM. Confirm stable timing, no doubled or
   dropped attacks, and an intelligible kick/snare balance.
2. Compare balanced, punchy, and soft sound characters at a safe volume.
   Confirm that each is distinct without clipping, clicks, or harsh resonances.
3. Play Rock with Open Hi-Hat, then a pattern with adjacent open and closed
   hats. Confirm that the closed hat chokes the open tail cleanly.
4. Use one-bar and four-bar count-ins. Confirm the downbeat, accents, displayed
   count, and groove entry align.
5. Enable swing, humanization, phrase fills, and flam hits separately. Confirm
   each remains musical and does not destabilize the underlying tempo.
6. Change BPM, pattern, master level, channel levels, mute, and solo during
   playback. Confirm changes are responsive and boundary-aligned where
   documented.
7. Pause for at least five seconds, resume, finish with a fill, stop, and start
   again. Confirm resume position, cleanup, and absence of stuck tails.
8. Enter and exit focus mode while playing. On supported mobile targets,
   confirm Wake Lock behavior and foreground/background recovery.
9. Install the production PWA, launch once online, close it, enable airplane
   mode, and cold-launch it. Confirm Practice loads and synthesized playback can
   start from the Play interaction without external audio assets.
10. Export a backup, remain offline, select it for import, and confirm the
    preview opens. Cancel without changing local data.

## Sign-off

- Release candidate or commit:
- Tester:
- Date:
- Blocking device rows:
- Follow-up issues:
