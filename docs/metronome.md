# Metronome mode

Metronome is part of `/practice`, not a separate route. It synthesizes its own
clicks; it never plays a muted drum pattern, records audio, or requests input permissions.

## Musical semantics

- Supported meters: 2/4, 3/4, 4/4, 5/4, 6/8 and 12/8. The default is 4/4.
- BPM always describes the **primary pulse**, within the existing 40–220 range.
  Simple meters use a quarter note; 6/8 and 12/8 use a dotted quarter, with two
  and four pulses per measure respectively. The visualizer also names the
  underlying grouped eighth-note positions.
- Tone's quarter-note BPM is `displayed BPM × 1.5` in compound meter. Thus
  switching from 4/4 at 80 BPM to 6/8 at 80 BPM preserves a 750 ms primary pulse.
- Subdivisions describe 1, 2, 3 or 4 equally spaced attacks per primary pulse.
  In simple meter these are quarters, eighths, eighth-note triplets and sixteenths.
  In compound meter they are dotted quarters, dotted eighths, eighths and dotted
  sixteenths. The three-way compound subdivision is **not** labeled a triplet.
- Pulse Only keeps the selected subdivision visible but sounds primary pulses
  only. Pulse + Guide also sounds the intermediate attacks. A primary attack
  replaces, rather than overlaps, a subdivision click.

## Playback and editing

`AudioEngine` owns the single Tone Transport and activates exactly one scheduler.
`MetronomeScheduler` uses a pulse-relative 12-part tick lattice, which represents
all four supported subdivisions exactly, without sixteenth-grid approximation.
Audio nodes receive Tone's callback time. Tone Draw publishes matching visual
frames; React and the practice timer are not musical clocks.

Meter, training mode, stage length and completion policy require **Stop**, including
when paused. Manual subdivisions, accent patterns and subdivision audio policy
enter at the next unscheduled measure boundary. If lookahead has already planned
the next boundary, the following boundary is used. Volume changes apply to newly
scheduled clicks immediately. BPM changes use the existing short transport ramp
without resetting position.

Progressive training visits subdivisions 1 → 2 → 3 → 4, with 2/4/8/16 measures
per stage (default four). Completion can repeat (default), hold the final
subdivision, or stop after its full stage. It does not change BPM. Count-in uses
primary pulses and does not consume training measures. Pause preserves the
transport position and progression; Stop resets them. Context suspension pauses
metronome playback and requires an explicit Resume interaction. Late events are
discarded, not piled up at the current audio time.

## Timing extension point

`getAudioEngine().subscribeMetronomeTiming(listener)` registers without starting
audio. Scheduled events contain an epoch, audio-context timestamp, transport tick,
phase, measure, beat, subdivision and stage. The `audible` field describes the
guide policy before master mute. Cancellation invalidates every event in the
named epoch. Consumers must discard those events on pause, stop or disposal;
resumed events have a new epoch and new audio timestamps. No unbounded event log
or audio data is retained. Future onset analysis can subscribe here without
coupling itself to React render times or the click voice.

## Persistence

- BPM, count-in and master volume retain their existing preference owner.
- Guided-practice preferences use payload version 2, retaining the existing
  `web-band-guided-practice-v1` key for backward-compatible discovery. Version 1
  loads its existing settings unchanged and adds metronome defaults; the next
  write stores version 2. Restore-last-practice behavior is preserved.
- Metronome presets and sessions are separate typed variants without drum IDs,
  swing, humanization or fill settings. Existing pattern records remain valid.
- Backups now export version 5. Readers validate versions 1–4 against their
  original settings shapes, then add metronome defaults. Replacement remains
  transactional for IndexedDB, with existing partial-preference-write warnings.
- No table or index changes are needed: IndexedDB schema versions 1–3 are
  untouched. Missing drum-pattern indexes do not prevent metronome rows from
  being stored; totals include them, while “most used pattern” excludes them.

## Verification limits

Unit tests exercise tick arithmetic, lifecycle, progression and persistence.
Playwright checks actual oscillator scheduling, interruption/resume, journal and
preset flows, small viewports, reduced motion and accessibility. These checks do
not substitute for listening to click timbre, output-device latency or audibility
alongside a guitar. Device/browser background audio behavior remains subject to
the operating system; playback is not automatically unlocked after suspension.
