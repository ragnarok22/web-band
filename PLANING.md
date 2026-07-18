# Implement a Browser-Based Drum Practice Companion for Guitarists

Build a complete, polished, responsive web application that acts as a drum and rhythm practice companion for guitarists.

The application must generate all drum sounds programmatically in the browser. Do not use MP3, WAV, recorded samples, external audio files, a backend, a database server, authentication, or cloud services.

The application must work entirely on the client side and save user preferences, custom patterns, favorites, and practice history locally using IndexedDB. Small interface preferences may use `localStorage`.

The experience should feel like a focused musical practice tool rather than a complex professional drum machine.

---

# 1. Product concept

The application should allow a guitarist to:

- Choose a musical style.
- Select a drum pattern.
- Adjust BPM.
- Start a count-in.
- Play along with a synthesized drum groove.
- Follow the current beat visually.
- Practice chord progressions.
- Practice strumming patterns.
- Automatically increase tempo over time.
- Save favorite practice configurations.
- Review basic local practice statistics.
- Use the application offline after the first visit.

The main experience should be immediate:

1. Open the application.
2. Choose a style or keep the default.
3. Set the BPM.
4. Press Play.
5. Start practicing guitar.

The user should not need to create an account or configure anything before starting.

---

# 2. Required technology

Use the following stack:

- Next.js with App Router.
- React.
- TypeScript with strict mode.
- Tone.js for musical scheduling and synchronization.
- Web Audio API for synthesized drum instruments.
- Zustand for application state.
- IndexedDB using Dexie.js.
- Tailwind CSS.
- PWA support.
- Lucide icons.
- Framer Motion for subtle UI transitions only.
- Vitest for unit testing.
- React Testing Library for component testing.
- Playwright for essential end-to-end flows.

Do not use:

- Backend APIs.
- Server databases.
- Authentication.
- Firebase.
- Supabase.
- Recorded drum samples.
- External MP3 or WAV files.
- `setInterval` as the main musical scheduler.
- Excessive third-party UI libraries.

Tone.js must control the musical transport, BPM, loops, subdivisions, sequencing, and audio scheduling.

---

# 3. Browser and audio requirements

The audio engine must follow browser autoplay restrictions.

The `AudioContext` and Tone.js audio context must only start after a direct user interaction, such as pressing Play for the first time.

Handle these states clearly:

- Audio engine not initialized.
- Audio engine initializing.
- Ready.
- Playing.
- Paused.
- Stopped.
- Browser audio suspended.
- Audio initialization failure.

If the browser suspends the audio context after inactivity, pressing Play must resume it.

The application must stop all active audio nodes, schedules, loops, animations, and wake locks when they are no longer needed.

Avoid memory leaks and duplicated Tone.js scheduled events during React re-renders.

---

# 4. No recorded audio

Every drum instrument must be synthesized in real time.

Create these instruments:

- Kick drum.
- Snare drum.
- Closed hi-hat.
- Open hi-hat.
- Low tom.
- Mid tom.
- High tom.
- Crash cymbal.
- Ride cymbal.
- Rim click.
- Optional clap.

Implement them in isolated modules so their synthesis can be adjusted independently.

## Kick drum

Create the kick using:

- A sine oscillator.
- A rapid pitch envelope.
- A short amplitude envelope.
- Optional subtle transient click.

Suggested behavior:

- Initial pitch around 140–170 Hz.
- Rapid drop toward 45–60 Hz.
- Short, controlled decay.
- Velocity should affect volume and slightly affect the attack.

## Snare drum

Create the snare using:

- White noise.
- Band-pass or high-pass filtering.
- A short noise envelope.
- A tonal oscillator around the lower-mid frequencies for body.

## Hi-hats and cymbals

Generate metallic sounds using:

- Filtered noise, metallic oscillators, or multiple inharmonic oscillators.
- High-pass filtering.
- Very short decay for closed hi-hat.
- Longer decay for open hi-hat.
- Longer, brighter envelope for crash.
- Controlled decay for ride.

When a closed hi-hat plays, it should choke an active open hi-hat.

## Toms

Generate toms using:

- Sine or triangle oscillators.
- Pitch envelopes.
- Different frequency ranges for low, mid, and high toms.

Each instrument must expose a consistent API similar to:

```ts
interface DrumVoice {
  trigger(time: number, velocity?: number): void;
  stop?(): void;
  dispose(): void;
}
```

Create an instrument manager responsible for:

- Initializing voices.
- Triggering instruments.
- Controlling instrument volume.
- Muting and soloing instruments.
- Applying master volume.
- Disposing all audio resources.

---

# 5. Musical timing and scheduler

Timing accuracy is critical.

Use Tone.js Transport and schedule audio events ahead of time.

Do not depend on React state updates for audio timing.

React should display the transport state, but it must not be the source of truth for precisely scheduling drum hits.

Implement:

- BPM from 40 to 220.
- BPM increments of 1 and 5.
- Tap tempo.
- Count-in of 0, 1, 2, or 4 measures.
- Swing from 0% to approximately 65%.
- Humanization from 0% to a subtle maximum.
- Looping.
- Time signatures.
- Musical subdivisions.
- Automatic BPM progression.
- Pattern changes aligned to the next measure.
- Safe stopping and restarting.

Supported time signatures:

- 2/4.
- 3/4.
- 4/4.
- 5/4.
- 6/8.
- 7/8.
- 12/8.

For the first implementation, prioritize excellent support for:

- 4/4.
- 3/4.
- 6/8.

The scheduler must support:

- Eighth-note patterns.
- Sixteenth-note patterns.
- Multiple measures.
- Accented beats.
- Velocity per hit.
- Probability per hit.
- Optional flam or double-hit metadata.
- Pattern fills.
- Pattern transitions.

Pattern changes while playing should occur cleanly at the beginning of the next measure unless the user explicitly chooses immediate switching.

---

# 6. Musical data model

Use patterns as pure data. They must not contain audio files or direct audio-node references.

Use a model similar to:

```ts
type DrumInstrument =
  | "kick"
  | "snare"
  | "closedHat"
  | "openHat"
  | "lowTom"
  | "midTom"
  | "highTom"
  | "crash"
  | "ride"
  | "rim"
  | "clap";

type PatternDifficulty = "beginner" | "intermediate" | "advanced";

type PatternCategory =
  | "rock"
  | "pop"
  | "blues"
  | "funk"
  | "reggae"
  | "country"
  | "ballad"
  | "latin"
  | "metal"
  | "jazz"
  | "custom";

interface DrumHit {
  id: string;
  instrument: DrumInstrument;
  step: number;
  velocity: number;
  probability?: number;
  flam?: boolean;
  timingOffset?: number;
}

interface DrumPattern {
  id: string;
  name: string;
  description: string;
  category: PatternCategory;
  difficulty: PatternDifficulty;
  timeSignature: {
    numerator: number;
    denominator: number;
  };
  subdivision: 8 | 16;
  bars: number;
  defaultBpm: number;
  recommendedBpmRange: {
    min: number;
    max: number;
  };
  swing?: number;
  hits: DrumHit[];
  isBuiltIn: boolean;
  createdAt?: string;
  updatedAt?: string;
}
```

Validate pattern data before using it in the audio engine.

A malformed custom pattern must never crash playback.

---

# 7. Built-in styles and patterns

Include a useful initial library of built-in patterns.

Each pattern should have:

- Name.
- Short description.
- Genre.
- Difficulty.
- Default BPM.
- Recommended BPM range.
- Time signature.
- One or more measures.
- Appropriate velocity variation.
- Musically believable accents.

Include at least the following.

## Rock

- Basic Rock.
- Driving Eighths.
- Four on the Floor.
- Half-Time Rock.
- Rock with Open Hi-Hat.
- Beginner Rock Fill.
- 6/8 Rock Ballad.

## Pop

- Basic Pop.
- Modern Pop Groove.
- Dance Pop.
- Pop Ballad.
- Syncopated Pop.

## Blues

- Straight Blues.
- Shuffle Blues.
- Slow 12/8 Blues.
- Blues Rock.
- Texas-style Shuffle-inspired practice groove.

Do not copy protected recordings. Create generic educational genre patterns.

## Funk

- Basic Sixteenth Funk.
- Syncopated Funk.
- Ghost-note-inspired groove.
- Half-Time Funk.

## Reggae

- One Drop.
- Steppers.
- Rockers.
- Basic Reggae Practice Groove.

## Country

- Basic Country.
- Train Beat.
- Country Ballad.
- Country Rock.

## Latin-inspired practice patterns

- Basic Bossa-inspired rhythm.
- Basic Son-inspired practice groove.
- Basic Cha-cha-inspired practice groove.
- Basic Latin Rock.

Keep them educational and generic rather than imitating a particular copyrighted song.

## Additional

- Metronome only.
- Kick and snare only.
- Hi-hat only.
- Simple 3/4.
- Simple 6/8.
- Slow ballad.
- Basic metal.
- Basic jazz ride practice.

Provide beginner, intermediate, and advanced variations where appropriate.

---

# 8. Main application pages

Create the following primary routes:

```text
/
 /practice
 /patterns
 /editor
 /history
 /settings
 /about
```

The home route may redirect to `/practice` or act as a minimal introduction.

---

# 9. Practice screen

The Practice screen is the most important screen.

It must be optimized for use while the user is holding a guitar.

## Main layout

Display:

- Current style.
- Current pattern.
- Current BPM.
- Time signature.
- Large Play, Pause, and Stop controls.
- BPM decrement and increment buttons.
- Tap Tempo.
- Current beat indicator.
- Current measure number.
- Practice timer.
- Count-in status.
- Master volume.
- Quick access to pattern selection.
- Quick access to practice mode.
- Fullscreen or focus mode.

The central Play button must be large and easy to press.

## Beat visualization

Display the current beat and subdivision visually.

For 4/4, represent:

```text
1 & 2 & 3 & 4 &
```

For sixteenth-note patterns:

```text
1 e & a 2 e & a 3 e & a 4 e & a
```

Visually distinguish:

- Current subdivision.
- Main beats.
- Downbeat.
- Accented hit.
- Measure boundary.

The visual indicator should use Tone.js draw scheduling or an equivalent audio-synchronized approach so that it follows what the user hears as closely as possible.

Do not trigger React state updates for every audio event if that causes performance issues. Use refs, requestAnimationFrame, CSS variables, or a lightweight visual state layer where appropriate.

## Focus mode

Focus mode must hide nonessential controls and display only:

- BPM.
- Current beat.
- Pattern name.
- Practice duration.
- Play or Stop control.
- Optional current chord.
- Optional strumming direction.

Focus mode should prevent accidental navigation where practical.

---

# 10. BPM controls

Implement:

- Numeric BPM input.
- Range slider.
- `-5`.
- `-1`.
- `+1`.
- `+5`.
- Tap Tempo.
- Reset to pattern default.

Tap Tempo behavior:

- Calculate BPM from recent taps.
- Ignore unrealistic gaps.
- Smooth the result over several taps.
- Clamp the final result between 40 and 220 BPM.
- Reset the tap sequence after an inactivity timeout.

Changing BPM while playing should smoothly update the Tone.js transport without restarting the pattern.

---

# 11. Count-in

Allow:

- No count-in.
- 1 measure.
- 2 measures.
- 4 measures.

During count-in:

- Use a clear synthesized click.
- Emphasize the first beat.
- Show a large visual countdown.
- Do not start the full drum pattern until the count-in finishes.
- Allow cancellation with Stop.
- Correctly support the selected time signature.

Optionally provide spoken-style visual labels such as:

```text
1, 2, 3, 4
```

Do not use recorded voice audio.

---

# 12. Automatic tempo trainer

Create a tempo progression mode for scales, riffs, chord changes, and technical exercises.

The user can configure:

- Starting BPM.
- Ending BPM.
- BPM increment.
- Increase every number of measures.
- Increase every number of seconds.
- Optional decrease mode.
- Optional repeat at final BPM.
- Stop when target BPM is reached.
- Reset to starting BPM after stopping.

Example:

```text
Start: 70 BPM
End: 110 BPM
Increase: 2 BPM
Every: 4 measures
```

Show:

- Current BPM.
- Next BPM.
- Measures remaining before the next increase.
- Overall progress.

Tempo changes should occur at clean musical boundaries.

---

# 13. Chord progression trainer

Create a practice mode where users can define a chord progression.

Example:

```text
G | D | Em | C
```

Features:

- Add, edit, reorder, and remove chords.
- Choose how many beats or measures each chord lasts.
- Repeat the progression.
- Show the current chord prominently.
- Preview the next chord.
- Change chords in synchronization with the drum transport.
- Optional visual countdown before the chord change.
- Save chord progressions locally.
- Mark progressions as favorites.
- Provide a few example progressions.

Example presets:

- G – D – Em – C.
- C – G – Am – F.
- Am – F – C – G.
- 12-bar blues in A.
- Simple I–IV–V progression.

Store chord names only. Do not generate copyrighted song transcriptions.

Use a model similar to:

```ts
interface ChordStep {
  id: string;
  chord: string;
  durationInMeasures: number;
}

interface ChordProgression {
  id: string;
  name: string;
  steps: ChordStep[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

# 14. Strumming trainer

Create a visual strumming mode.

Allow the user to select predefined patterns such as:

```text
↓ ↓↑ ↑↓↑
```

And display the subdivision:

```text
1 & 2 & 3 & 4 &
```

Support:

- Downstroke.
- Upstroke.
- Rest.
- Muted stroke.
- Accent.
- Hold or sustain.

Use a data model similar to:

```ts
type StrumAction = "down" | "up" | "mute" | "rest" | "hold";

interface StrumStep {
  id: string;
  subdivisionIndex: number;
  action: StrumAction;
  accent?: boolean;
}

interface StrummingPattern {
  id: string;
  name: string;
  timeSignature: {
    numerator: number;
    denominator: number;
  };
  subdivision: 8 | 16;
  steps: StrumStep[];
  isBuiltIn: boolean;
}
```

Include beginner patterns:

- Downstrokes on each beat.
- Downstrokes on eighth notes.
- Down, down-up, up-down-up.
- Ballad pattern.
- Basic pop pattern.
- Basic 3/4 pattern.
- Basic 6/8 pattern.

Highlight the current strum action in sync with the audio.

---

# 15. Pattern browser

Create a dedicated Pattern Browser.

It should allow users to:

- Browse built-in and custom patterns.
- Search by name.
- Filter by genre.
- Filter by difficulty.
- Filter by time signature.
- Filter by subdivision.
- Sort by name, BPM, recently used, or favorites.
- Preview patterns.
- Add or remove favorites.
- Open a pattern in Practice mode.
- Duplicate a built-in pattern into the custom editor.

Pattern cards should show:

- Pattern name.
- Genre.
- Difficulty.
- Time signature.
- Default BPM.
- Recommended BPM range.
- Favorite status.
- Short visual rhythm preview.

The preview must be lightweight and understandable.

---

# 16. Custom pattern editor

Create a grid-based drum pattern editor.

The user must be able to:

- Create a new pattern.
- Duplicate a built-in pattern.
- Rename the pattern.
- Select time signature.
- Select one, two, or four measures.
- Select eighth or sixteenth subdivisions.
- Add and remove drum hits.
- Adjust hit velocity.
- Optionally set probability.
- Clear a row.
- Clear the pattern.
- Copy a measure.
- Paste a measure.
- Save locally.
- Delete custom patterns.
- Play the pattern while editing.

Grid rows represent instruments.

Grid columns represent musical subdivisions.

Example rows:

```text
Crash
Ride
Open Hat
Closed Hat
High Tom
Mid Tom
Low Tom
Snare
Rim
Clap
Kick
```

Interaction requirements:

- Click or tap an empty cell to add a hit.
- Click or tap an active cell to cycle velocity levels.
- Long-press or use a context action for advanced properties.
- Keyboard support for desktop.
- Horizontal scrolling on small screens.
- Sticky instrument labels.
- Clear current playhead.
- Visually highlight main beats and measure boundaries.
- Avoid accidental changes while scrolling on touch devices.

Built-in patterns must be read-only. Users can duplicate them before editing.

---

# 17. Fill system

Implement optional fills.

The user may choose:

- No fills.
- Fill every 4 measures.
- Fill every 8 measures.
- Fill every 16 measures.
- Random fill within a controlled probability.
- Fill before stopping.
- Fill before changing patterns.

Create generic synthesized fills using toms, snare, kick, and crash.

Fills should:

- Respect the current time signature.
- Fit within the final measure of the phrase.
- Avoid excessive randomization.
- Transition cleanly back to the groove.
- Use a crash on the next downbeat where musically appropriate.

Include several predefined fills and a mechanism for associating compatible fills with pattern categories.

---

# 18. Mixer

Add a compact mixer panel.

Controls:

- Master volume.
- Kick volume.
- Snare volume.
- Hi-hat volume.
- Toms volume.
- Cymbals volume.
- Rim and clap volume.
- Mute.
- Solo.
- Reset mix.

Persist mixer preferences locally.

Avoid professional-level complexity such as routing matrices or plugin chains.

Optionally provide three sound characters:

- Soft.
- Balanced.
- Punchy.

These presets should adjust synthesis and mix parameters, not load samples.

---

# 19. Practice history

Store basic practice sessions in IndexedDB.

A session may include:

```ts
interface PracticeSession {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  patternId: string;
  patternName: string;
  category: string;
  startingBpm: number;
  endingBpm: number;
  timeSignature: string;
  practiceMode: "drums" | "chords" | "strumming" | "tempoTrainer";
}
```

Only save meaningful sessions, for example sessions longer than 30 seconds.

History page features:

- Total practice time.
- Practice time this week.
- Number of sessions.
- Most-used pattern.
- Most-used BPM range.
- Recent sessions.
- Sessions grouped by day.
- Ability to delete a session.
- Ability to clear all history.
- Export local data as JSON.
- Import previously exported JSON.

Do not overstate these statistics. They are simple local practice records, not professional performance analytics.

---

# 20. Local persistence

Use Dexie.js and IndexedDB for:

- Custom patterns.
- Favorite patterns.
- Chord progressions.
- Custom strumming patterns.
- Practice sessions.
- Saved practice presets.
- User-created collections if implemented.

Use `localStorage` only for small settings such as:

- Theme.
- Last selected pattern.
- Last BPM.
- Last volume.
- Focus mode preference.
- Count-in preference.
- Interface density.
- Reduced-motion choice.

Create a versioned persistence layer.

Handle schema migrations safely.

The application must continue working if:

- IndexedDB is unavailable.
- Storage permission fails.
- Stored data is corrupted.
- The user is in private browsing mode with limited persistence.

In those cases:

- Show a nonblocking warning.
- Continue operating in memory.
- Avoid losing the current active session unexpectedly.
- Do not crash the application.

Create a storage abstraction so components do not access IndexedDB directly.

---

# 21. Practice presets

Allow users to save a complete practice configuration.

A preset may contain:

```ts
interface PracticePreset {
  id: string;
  name: string;
  patternId: string;
  bpm: number;
  countInMeasures: number;
  swing: number;
  humanization: number;
  fillFrequency: number | null;
  practiceMode: string;
  chordProgressionId?: string;
  strummingPatternId?: string;
  tempoTrainer?: {
    startBpm: number;
    endBpm: number;
    increment: number;
    intervalMeasures: number;
  };
  createdAt: string;
  updatedAt: string;
}
```

Allow:

- Save current configuration.
- Load a preset.
- Rename.
- Duplicate.
- Delete.
- Favorite.
- Quickly open recent presets.

---

# 22. Offline PWA

Make the application installable as a Progressive Web App.

Requirements:

- Web app manifest.
- App icons.
- Theme color.
- Standalone display.
- Service worker.
- Offline support for the application shell.
- Offline access to built-in patterns.
- Offline access to previously saved local user data.
- Update notification when a new version is available.

Do not cache unnecessary remote resources.

Since no external audio files are used, the entire musical functionality should work offline after installation or initial caching.

---

# 23. Wake Lock

Use the Screen Wake Lock API during active practice when available.

Behavior:

- Request wake lock after playback begins.
- Release it when playback stops.
- Reacquire it after the document becomes visible again if practice is still active.
- Provide a setting to disable wake lock.
- Fail gracefully on unsupported browsers.

---

# 24. Keyboard shortcuts

Add desktop keyboard shortcuts:

- Space: Play or pause.
- Escape: Stop.
- Arrow Up: Increase BPM by 1.
- Arrow Down: Decrease BPM by 1.
- Shift + Arrow Up: Increase BPM by 5.
- Shift + Arrow Down: Decrease BPM by 5.
- `T`: Tap tempo.
- `F`: Toggle focus mode.
- `M`: Mute master.
- Left and Right arrows: Change pattern only when focus is not inside an input.

Do not trigger shortcuts while the user is typing in a text field.

Show a keyboard shortcuts dialog.

---

# 25. Design direction

The interface should feel:

- Calm.
- Musical.
- Focused.
- Modern.
- Warm.
- Easy to understand.
- Useful during real guitar practice.

Avoid making it look like:

- A complex digital audio workstation.
- A nightclub application.
- A toy.
- A generic admin dashboard.
- A neon cyberpunk interface.

## Visual style

Use:

- A warm, dark background.
- Slightly lighter elevated surfaces.
- One strong accent color for active beats and primary actions.
- A secondary warm accent for count-in, warnings, or tempo changes.
- Large typography for BPM and current beat.
- Rounded but not excessively pill-shaped controls.
- Clear visual hierarchy.
- Subtle shadows.
- Moderate border contrast.
- Generous spacing.
- Touch targets of at least 44 by 44 pixels.

Suggested color direction:

```text
Background: #12110F
Surface: #1B1916
Elevated surface: #24211D
Primary text: #F5F1E8
Secondary text: #AAA399
Primary accent: #E7A94B
Secondary accent: #D56A4A
Success: #65A875
Border: rgba(255,255,255,0.08)
```

These values may be adjusted for accessibility.

## Typography

Use a readable modern sans-serif font.

Examples:

- Inter.
- Manrope.
- Geist.
- Instrument Sans.

Use a tabular-number font feature for BPM, timers, and measure counts.

Do not use decorative fonts for essential controls.

---

# 26. Responsive design

Design mobile-first.

## Mobile

- Large Play button.
- Bottom navigation.
- Collapsible advanced controls.
- Swipe-friendly pattern browser.
- Fullscreen focus mode.
- Avoid dense side panels.
- Keep primary controls reachable with one hand.

## Tablet

- Two-column layout where useful.
- Pattern list beside practice controls.
- Expanded beat visualization.

## Desktop

- Optional sidebar navigation.
- Practice controls in the center.
- Pattern and mixer panels on the sides.
- Keyboard shortcuts.
- Larger pattern editor.

The application must remain fully usable at approximately 320 pixels wide.

---

# 27. Accessibility

Implement:

- Semantic HTML.
- Keyboard navigation.
- Visible focus indicators.
- Accessible labels.
- Screen-reader announcements for major state changes.
- Sufficient color contrast.
- Reduced-motion support.
- Controls that do not rely exclusively on color.
- Large touch targets.
- Accessible dialogs.
- Accessible sliders.
- `aria-pressed` for toggle buttons.
- Meaningful status text for Play, Pause, Stop, and Count-in.

Do not announce every beat to screen readers because that would be disruptive.

Instead, announce:

- Playback started.
- Playback paused.
- Playback stopped.
- Pattern changed.
- BPM changed when changed through major controls.
- Tempo target reached.
- Storage error.
- Audio initialization error.

---

# 28. Motion and animation

Use Framer Motion sparingly.

Animations should include:

- Page transitions.
- Panel opening and closing.
- Play button state changes.
- Beat pulse.
- Pattern selection feedback.
- Focus mode transition.
- Count-in animation.

Do not use heavy animation that could interfere with audio performance.

Beat animations must use transforms and opacity where possible.

Respect `prefers-reduced-motion`.

Never use animation timing as the source of musical timing.

---

# 29. State architecture

Separate the following concerns:

## Audio engine state

- Transport state.
- Audio initialization state.
- Scheduled pattern.
- Current musical position.
- Active voices.
- Mixer state.

## UI state

- Open panels.
- Selected tab.
- Focus mode.
- Dialogs.
- Filters.
- Responsive navigation.

## Practice configuration

- Pattern.
- BPM.
- Time signature.
- Count-in.
- Swing.
- Humanization.
- Fills.
- Tempo trainer.
- Chords.
- Strumming.

## Persistent data

- Favorites.
- Custom patterns.
- Presets.
- Progressions.
- Practice history.
- Settings.

Avoid placing all state inside a single large Zustand store.

Create focused stores or slices.

Do not store nonserializable Tone.js objects in persisted Zustand state.

---

# 30. Suggested project structure

Use a maintainable structure similar to:

```text
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── practice/
│   │   └── page.tsx
│   ├── patterns/
│   │   └── page.tsx
│   ├── editor/
│   │   └── page.tsx
│   ├── history/
│   │   └── page.tsx
│   ├── settings/
│   │   └── page.tsx
│   └── about/
│       └── page.tsx
├── audio/
│   ├── AudioEngine.ts
│   ├── TransportController.ts
│   ├── PatternScheduler.ts
│   ├── CountInController.ts
│   ├── FillController.ts
│   ├── TempoTrainerController.ts
│   ├── MixerController.ts
│   ├── instruments/
│   │   ├── KickVoice.ts
│   │   ├── SnareVoice.ts
│   │   ├── ClosedHatVoice.ts
│   │   ├── OpenHatVoice.ts
│   │   ├── TomVoice.ts
│   │   ├── CymbalVoice.ts
│   │   ├── RimVoice.ts
│   │   └── ClapVoice.ts
│   └── synthesis/
│       ├── envelopes.ts
│       ├── noise.ts
│       ├── filters.ts
│       └── utilities.ts
├── components/
│   ├── layout/
│   ├── navigation/
│   ├── transport/
│   ├── practice/
│   ├── patterns/
│   ├── editor/
│   ├── chords/
│   ├── strumming/
│   ├── history/
│   ├── settings/
│   └── ui/
├── data/
│   ├── patterns/
│   │   ├── rock.ts
│   │   ├── pop.ts
│   │   ├── blues.ts
│   │   ├── funk.ts
│   │   ├── reggae.ts
│   │   ├── country.ts
│   │   ├── latin.ts
│   │   └── utility.ts
│   ├── fills/
│   ├── chordProgressions.ts
│   └── strummingPatterns.ts
├── db/
│   ├── database.ts
│   ├── schema.ts
│   ├── migrations.ts
│   ├── repositories/
│   └── backup.ts
├── stores/
│   ├── audioStore.ts
│   ├── practiceStore.ts
│   ├── uiStore.ts
│   └── settingsStore.ts
├── hooks/
│   ├── useAudioEngine.ts
│   ├── useKeyboardShortcuts.ts
│   ├── useWakeLock.ts
│   ├── usePracticeSession.ts
│   └── usePersistentSettings.ts
├── lib/
│   ├── patternValidation.ts
│   ├── musicalTime.ts
│   ├── tapTempo.ts
│   ├── exportImport.ts
│   └── accessibility.ts
├── types/
│   ├── audio.ts
│   ├── pattern.ts
│   ├── practice.ts
│   ├── persistence.ts
│   └── settings.ts
└── tests/
```

Adjust the structure when necessary, but maintain clear separation between audio, UI, data, and persistence.

---

# 31. Import and export

Allow the user to export all locally stored data as a versioned JSON file.

Export:

- Custom patterns.
- Favorites.
- Presets.
- Chord progressions.
- Custom strumming patterns.
- Practice history.
- Settings where appropriate.

Example envelope:

```ts
interface BackupFile {
  app: "guitar-rhythm-practice";
  version: number;
  exportedAt: string;
  data: {
    patterns: DrumPattern[];
    favorites: string[];
    presets: PracticePreset[];
    chordProgressions: ChordProgression[];
    strummingPatterns: StrummingPattern[];
    practiceSessions: PracticeSession[];
  };
}
```

Import requirements:

- Validate the file.
- Reject unsupported or dangerous structures.
- Show an import summary.
- Allow merge or replace.
- Avoid duplicate IDs.
- Create a backup before replacing current local data.
- Never execute imported content as code.
- Show useful validation errors.

---

# 32. Error handling

Create friendly handling for:

- Audio engine initialization failure.
- Unsupported Web Audio API.
- Unsupported IndexedDB.
- Storage quota exceeded.
- Invalid imported backup.
- Corrupted custom pattern.
- Service worker update failure.
- Wake Lock unavailable.
- Invalid BPM.
- Invalid time signature.
- Deleted pattern still referenced by a preset.
- Interrupted browser tab.
- Audio context suspension.

Errors should not destroy the current user configuration where avoidable.

Use error boundaries for major application sections.

---

# 33. Performance requirements

Prioritize stable audio.

- Avoid unnecessary React re-renders during playback.
- Do not recreate audio nodes on each beat.
- Reuse and dispose audio resources correctly.
- Avoid updating global state on every subdivision unless necessary.
- Keep animations GPU-friendly.
- Lazy-load the pattern editor and history visualizations.
- Keep built-in pattern data reasonably compact.
- Avoid blocking the main thread during import or large local operations.
- Batch IndexedDB writes where appropriate.

Playback should remain stable when:

- Opening and closing panels.
- Changing volume.
- Switching focus mode.
- Updating the practice timer.
- Displaying beat animations.
- Saving a session.

---

# 34. Testing

Create meaningful tests.

## Unit tests

Test:

- BPM clamping.
- Tap tempo calculation.
- Pattern validation.
- Step-to-musical-time conversion.
- Time-signature calculations.
- Measure length calculations.
- Tempo trainer progression.
- Chord progression timing.
- Strumming-step timing.
- IndexedDB repository behavior.
- Backup validation.
- Pattern duplication.
- Fill scheduling rules.

## Component tests

Test:

- Play button states.
- BPM controls.
- Count-in selector.
- Pattern filters.
- Favorite toggle.
- Focus mode.
- Storage warnings.
- Pattern editor cell interaction.
- Chord progression editor.
- Tempo trainer form validation.

## End-to-end tests

Cover:

1. Open the application.
2. Start the audio after pressing Play.
3. Change BPM.
4. Select another pattern.
5. Stop playback.
6. Save a favorite.
7. Create and save a custom pattern.
8. Reload and confirm persistence.
9. Save a practice preset.
10. Export and import local data.
11. Enable focus mode.
12. Complete and save a meaningful practice session.

Mock the Web Audio layer where required in automated tests, but keep the production engine real.

---

# 35. Initial user experience

On first visit:

- Show the Practice screen immediately.
- Select Basic Rock.
- Use approximately 90 BPM.
- Use 4/4.
- Use one-measure count-in.
- Display a small onboarding hint near Play.
- Explain that sound begins after pressing Play because browsers require user interaction.
- Allow dismissing onboarding permanently.

Do not present a long onboarding wizard.

---

# 36. Settings

Include:

- Theme: system, dark, or light.
- Reduced motion.
- Default count-in.
- Default BPM adjustment step.
- Wake Lock.
- Keep screen active.
- Save practice history.
- Minimum duration required to save a session.
- Restore last session configuration.
- Visual subdivision detail.
- Beat flash intensity.
- Sound character.
- Master volume.
- Reset settings.
- Delete all local data.
- Export data.
- Import data.

Destructive actions must require confirmation.

---

# 37. Light theme

Dark mode should be the primary visual direction, but include an accessible light theme.

The light theme should remain warm and low-glare rather than pure white.

Persist the selected theme locally.

---

# 38. Implementation sequence

Implement the application in this order.

## ✅ Phase 1: Foundation

- Configure Next.js, TypeScript, Tailwind, linting, tests, and PWA.
- Add application layout and responsive navigation.
- Define types.
- Create Zustand stores.
- Create IndexedDB schema.
- Add basic settings persistence.

## ✅ Phase 2: Audio engine

- Initialize Tone.js safely.
- Create synthesized kick, snare, and hi-hat.
- Implement transport.
- Implement BPM.
- Implement Play, Pause, and Stop.
- Implement a basic 4/4 pattern.
- Implement synchronized beat visualization.
- Verify cleanup and audio context behavior.

## ✅ Phase 3: Pattern system

- Add the full pattern data model.
- Add built-in patterns.
- Add pattern selection and filters.
- Add time signatures and subdivisions.
- Add pattern switching at measure boundaries.
- Add favorites.

## ✅ Phase 4: Practice features

- Count-in.
- Practice timer.
- Focus mode.
- Tap Tempo.
- Swing.
- Humanization.
- Fills.
- Mixer.
- Wake Lock.

## ✅ Phase 5: Guided practice

- Tempo trainer.
- Chord progression trainer.
- Strumming trainer.
- Practice presets.

## ✅ Phase 6: Creation and persistence

- Custom pattern editor.
- IndexedDB repositories.
- Practice history.
- Import and export.
- Storage migration and fallback handling.

## ✅ Phase 7: Final quality

- Accessibility.
- Responsive polish.
- Error handling.
- Automated tests.
- Offline verification.
- Performance review.
- Audio scheduling review.
- Documentation.

Do not attempt to build all features inside one oversized component.

---

# 39. Completion criteria

The application is complete when:

- It generates convincing basic drum sounds without audio files.
- A user can start practicing in no more than two interactions.
- Playback remains rhythmically stable.
- BPM can change during playback.
- Pattern changes are musically aligned.
- Beat visualization follows the audio.
- Count-in works correctly.
- At least the requested built-in genre patterns are available.
- Chord and strumming trainers remain synchronized.
- Custom patterns can be created and saved.
- Preferences survive page reloads.
- Practice history is stored locally.
- Data can be exported and imported.
- The application works offline after initial loading.
- Mobile controls are usable while holding a guitar.
- No backend or account is required.
- No MP3, WAV, or sample-based audio is included.
- Core features have automated tests.
- The codebase is modular and maintainable.

---

# 40. Deliverables

Provide:

- Complete working source code.
- Clean project structure.
- `README.md`.
- Setup instructions.
- Development commands.
- Production build instructions.
- Architecture explanation.
- Audio-engine explanation.
- IndexedDB schema documentation.
- Pattern format documentation.
- Import and export format documentation.
- Browser support notes.
- Known limitations.
- Testing instructions.
- A list of possible future improvements.

The README must explain that the drum sounds are synthesized in real time and that no recorded audio files are used.

---

# 41. Development rules

- Use strict TypeScript.
- Avoid `any`.
- Use small, focused components.
- Keep audio logic outside React components.
- Dispose Tone.js and Web Audio resources properly.
- Do not persist nonserializable audio objects.
- Validate all local and imported data.
- Use accessible controls.
- Do not add a backend.
- Do not add authentication.
- Do not add analytics or tracking.
- Do not add advertisements.
- Do not include copyrighted song patterns.
- Do not use fake placeholder buttons.
- Do not leave critical functionality as TODO comments.
- Ensure production build succeeds.
- Ensure linting succeeds.
- Ensure tests succeed.

Start by implementing a solid, working vertical slice containing:

- [x] Synthesized kick, snare, and hi-hat.
- [x] Tone.js transport.
- [x] Basic Rock pattern.
- [x] BPM controls.
- [x] Play, Pause, and Stop.
- [x] One-measure count-in.
- [x] Beat visualization.
- [x] Master volume.
- [x] IndexedDB initialization.
- [x] Persistence of the last selected BPM and pattern.

Verify that this vertical slice works correctly before implementing the remaining features.

**Vertical slice status:** Done and verified on 2026-07-17.

Verification passed with `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage`, `pnpm test:e2e`, `pnpm test:pwa`, and `pnpm build`.
