# Web Band Implementation Plan

Last audited against the source on 2026-07-19.

## How To Use This Plan

- `[x]` means the capability was verified in the current source or tests.
- `[ ]` means work remains. Partial features are split so completed behavior stays checked and missing behavior has its own task.
- Mark a task complete only after its behavior, tests, and relevant documentation are finished.
- For bugs, first add a failing regression test, then implement the fix and prove the test passes.

## Product Boundaries

- Keep the application client-only. Do not add API routes, server actions, backend services, authentication, analytics, advertisements, or cloud persistence.
- Synthesize every drum sound in the browser. Do not add recordings, samples, MP3/WAV files, or external audio assets.
- Use Tone Transport and Web Audio callback times as the musical clock. React state, animation frames, and timers must not schedule music.
- Keep Tone nodes, AudioNodes, schedules, and precise tick state outside React and Zustand.
- Validate and clone persisted or imported data before it reaches stores, UI, or the scheduler.

## Phase 1: Foundation And App Shell

- [x] **Configure the application stack.** Use Next.js App Router, React, strict TypeScript, Tailwind CSS, Tone.js, Zustand, Dexie, Serwist, Lucide, Vitest, Testing Library, and Playwright.
- [x] **Keep one client-first application package.** Run browser-only screens through client shells while keeping App Router page files thin.
- [x] **Create the primary routes.** Provide `/practice`, `/patterns`, `/editor`, `/history`, and `/settings`, with `/` redirecting to `/practice`.
- [x] **Create responsive navigation.** Use mobile bottom navigation and a desktop side rail without interrupting active audio cleanup.
- [x] **Bootstrap appearance before hydration.** Apply the persisted dark, light, or system theme without a visible theme flash.
- [x] **Add the About route.** Create `/about`, add navigation and metadata, include it in offline precaching, and cover it in the PWA route test.

## Phase 2: Audio Engine And Scheduling

- [x] **Start audio from the Play interaction.** Call `Tone.start()` only from the direct user gesture and resume a suspended context when playback restarts.
- [x] **Implement synthesized drum voices.** Provide kick, snare, closed/open hats, low/mid/high toms, crash, ride, rim, clap, and count-in click without recordings.
- [x] **Centralize instrument ownership.** Use one instrument manager for triggering, buses, mute, solo, master volume, silence, and disposal.
- [x] **Implement transport states.** Handle not initialized, initializing, ready, count-in, playing, paused, stopped, suspended audio, and initialization failure.
- [x] **Schedule against Tone Transport.** Support looping eighth- and sixteenth-note grids, multiple bars, accents, velocity, and callback-time scheduling.
- [x] **Support all required meters.** Handle 2/4, 3/4, 4/4, 5/4, 6/8, 7/8, and 12/8 patterns.
- [x] **Implement live groove controls.** Support 40-220 BPM, smooth tempo changes, swing, timing/velocity humanization, tap tempo, and 0/1/2/4-measure count-ins.
- [x] **Preserve musical lifecycle behavior.** Pause keeps transport position; stop and disposal clear owned schedules, semantic callbacks, visual work, voices, and nodes.
- [x] **Quantize normal pattern changes.** Queue active pattern changes for the next measure and publish the selection at audible time.
- [x] **Synchronize visuals from audio time.** Drive beat and guidance timelines from scheduled Tone callbacks rather than React render timing.
- [x] **Schedule hi-hat choking at audio time.** Pass the closed-hat hit time into open-hat stopping so Tone lookahead cannot choke the sound early; add a regression test.
- [x] **Implement audible flam behavior.** Convert `flam` metadata into a bounded second hit while preserving velocity, timing, pause replay, and disposal behavior.
- [x] **Fix zero-probability semantics.** Guarantee a hit with probability `0` never triggers, including when the random source returns exactly zero.
- [x] **Apply pattern swing consistently.** Decide whether selecting a pattern adopts its `swing` metadata or remove the misleading metadata-driven Swing label; test selection and preview behavior.
- [x] **Expose immediate pattern switching.** Add an explicit same-meter immediate-switch option while retaining next-measure switching as the safe default.

## Phase 3: Pattern Data And Library

- [x] **Define pure serializable patterns.** Keep instrument, step, velocity, probability, flam, timing offset, meter, subdivision, bars, BPM, category, and difficulty as data only.
- [x] **Validate scheduler inputs.** Reject malformed patterns, duplicate cells, invalid ranges, and unsafe imported or persisted data before playback.
- [x] **Provide the built-in catalog.** Ship 44 original educational grooves spanning the required genres, difficulties, meters, and subdivisions.
- [x] **Implement library discovery.** Search, filter by genre/difficulty/meter/subdivision, and sort by name, BPM, recent use, or favorites.
- [x] **Implement pattern actions.** Preview, favorite, open in Practice, export custom patterns, and duplicate built-ins into the editor.
- [x] **Render lightweight rhythm previews.** Show an understandable per-instrument groove summary without starting full playback.
- [x] **Show recommended BPM ranges.** Add each pattern's recommended minimum and maximum BPM to library cards and component tests.
- [x] **Lock the catalog contract with tests.** Verify required pattern names and intended categories, resolving current title/category deviations instead of testing only count and validity.

## Phase 4: Practice Experience

- [x] **Build the main practice workspace.** Show style, pattern, BPM, meter, transport, timer, count-in, master volume, mode selection, and quick pattern access.
- [x] **Implement BPM controls.** Provide numeric and range inputs, -5/-1/+1/+5 buttons, tap tempo, clamping, and reset to pattern default.
- [x] **Implement count-in feedback.** Play a synthesized accented click, show meter-aware visual counts, delay the groove, and allow Stop to cancel.
- [x] **Implement the beat visualizer.** Distinguish subdivisions, beats, downbeat, accents, measure boundaries, and the current measure at audible time.
- [x] **Implement focus mode.** Hide navigation and secondary controls while retaining pattern, BPM, timer, beat, transport, and guided-practice cues.
- [x] **Implement session tools.** Provide the practice timer, Wake Lock toggle/status, shortcuts dialog, and master mute.
- [x] **Implement keyboard shortcuts.** Support transport, BPM, tap, focus, mute, and pattern navigation without firing inside editable controls.
- [x] **Provide usable mobile and desktop layouts.** Keep primary transport controls large and provide horizontal editor scrolling with sticky labels.
- [x] **Collapse advanced mobile controls.** Add accessible disclosure controls for guided practice and groove settings so the mobile screen stays focused.
- [x] **Improve tablet composition.** Introduce the intended two-column pattern/control layout before the current extra-large breakpoint.
- [x] **Make mobile pattern browsing swipe-friendly.** Provide a deliberate touch browsing interaction rather than relying only on a vertical card list.
- [x] **Verify the 320px layout.** Add an E2E viewport assertion and fix any overflow or unreachable controls at approximately 320 CSS pixels.

## Phase 5: Guided Practice And Presets

- [x] **Implement tempo training.** Support ascending/descending targets, measure/second intervals, increments, current/next BPM, progress, target stop, and reset-on-stop.
- [x] **Implement chord progression training.** Create, edit, reorder, remove, repeat, time, save, favorite, and display current/next chords with optional countdowns.
- [x] **Provide built-in chord progressions.** Include the requested pop progressions, I-IV-V progression, and 12-bar blues example.
- [x] **Implement built-in strumming guidance.** Support down, up, mute, rest, hold, accents, meter matching, and audio-synchronized current/next actions.
- [x] **Provide the beginner strumming catalog.** Include beat downstrokes, eighth-note downstrokes, common pop/ballad patterns, and 3/4 and 6/8 patterns.
- [x] **Render strumming subdivision labels.** Show musical positions such as `1 & 2 & 3 & 4 &` and highlight the active sequence step at audible time.
- [x] **Complete custom strumming workflows.** Hydrate persisted custom patterns, include them in selection and backup restore, and provide create/edit/delete management.
- [x] **Implement complete practice presets.** Save, load, rename, duplicate, delete, favorite, and reopen recent drum and guided-practice configurations.

## Phase 6: Pattern Editor

- [x] **Create and duplicate patterns.** Start blank patterns or copy built-ins while keeping built-in records read-only.
- [x] **Edit pattern metadata.** Configure name, category, difficulty, meter, one/two/four bars, subdivision, default BPM, and recommended range.
- [x] **Edit drum cells.** Add/remove hits, cycle velocity, clear rows/patterns, and copy or paste measures.
- [x] **Edit advanced hit properties.** Persist probability, flam, and timing offset values with validation.
- [x] **Support desktop and touch editing.** Provide grid keyboard movement, advanced-property access, horizontal scrolling, sticky labels, and safe touch behavior.
- [x] **Preview and persist drafts.** Play editor changes, show the synchronized playhead, save valid custom patterns, and delete existing custom patterns.

## Phase 7: Fills And Mixer

- [x] **Generate phrase fills.** Support off, every 4/8/16 measures, and controlled random fills that respect meter and return with a crash.
- [x] **Implement the compact mixer.** Provide master, kick, snare, hats, toms, cymbals, and rim/clap volume plus mute, solo, reset, and persistence.
- [x] **Add fill-before-stop behavior.** Queue a musically bounded fill and stop cleanly after it, while retaining immediate Stop for emergency cancellation.
- [x] **Add fill-before-pattern-change behavior.** Schedule a transition fill before committing a queued compatible pattern change.
- [x] **Create a fill library.** Add several validated fill arrangements and category compatibility rules instead of one generic algorithm.
- [x] **Add sound-character presets.** Implement Soft, Balanced, and Punchy synthesis/mix presets without loading samples, then expose the setting consistently.

## Phase 8: Persistence, History, And Backup

- [x] **Version the IndexedDB schema.** Keep Dexie versions 1-3 as migration history for patterns, favorites, progressions, strumming, presets, and sessions.
- [x] **Use repository boundaries.** Keep components away from Dexie and clone/validate records at repositories and `StorageService`.
- [x] **Recover from IndexedDB failure.** Copy readable records into memory repositories, show a nonblocking warning, and retry the failed operation once.
- [x] **Persist lightweight preferences.** Version local settings for practice, guided modes, history, appearance, recents, and onboarding.
- [x] **Record practice history.** Store playing time, mode, pattern, meter, starting/ending BPM, and timestamps with a configurable meaningful-session threshold.
- [x] **Summarize history.** Show total/weekly time, session count, most-used pattern, BPM range, recent sessions, daily groups, deletion, and clearing.
- [x] **Import and export core data.** Validate versioned JSON, preview it, merge or replace transactionally, handle collisions, and download a safety backup before replacement.
- [x] **Back up every local preference.** Include appearance, reduced motion, recent patterns, and onboarding state so export and safety backups match the all-data claim.
- [x] **Make delete-all complete.** Clear appearance and every other Web Band key in addition to IndexedDB, recents, onboarding, and practice settings.
- [x] **Report localStorage failures.** Surface nonblocking warnings when normal preference writes fail instead of silently ignoring repository results.
- [x] **Report corrupted stored rows.** Continue filtering invalid legacy data, but tell the user which collections were partially recovered.
- [x] **Strengthen session finalization.** Reduce navigation/page-lifecycle data loss and clearly preserve best-effort semantics where browsers cannot guarantee an async write.
- [x] **Enforce meaningful history settings.** Define a nonzero minimum threshold policy and cover normal-duration recording without lowering the E2E threshold to zero.

## Phase 9: Settings

- [x] **Configure appearance.** Expose system/dark/light themes and explicit reduced-motion preference.
- [x] **Configure practice history.** Expose recording enablement and minimum session duration.
- [x] **Manage local data.** Provide backup export/import and confirmed deletion controls.
- [x] **Configure default count-in.** Expose the persisted count-in preference on Settings as well as Practice.
- [x] **Configure the BPM adjustment step.** Let users choose the default keyboard/button increment while retaining direct +/-1 and +/-5 controls.
- [x] **Configure Wake Lock.** Expose the persisted keep-screen-awake preference on Settings and keep it synchronized with Practice.
- [x] **Configure restore behavior.** Allow users to choose whether the last practice configuration is restored on startup.
- [x] **Configure visual subdivision detail.** Let users reduce or expand beat-grid detail without changing musical scheduling.
- [x] **Configure beat-flash intensity.** Apply a persisted accessible visual intensity without relying only on color.
- [x] **Configure master volume.** Expose the same persisted master level on Settings and in the Practice mixer.
- [x] **Implement reset settings.** Restore preference defaults without deleting user-created patterns, presets, progressions, or history.

## Phase 10: Offline PWA

- [x] **Provide installable metadata.** Define the manifest, icons, theme colors, and standalone behavior.
- [x] **Generate the service worker.** Build Serwist from `src/app/service-worker.ts` and keep generated workers out of source control.
- [x] **Precache local-first routes.** Cache Practice, Patterns, Editor, History, and Settings with `/practice` as the document fallback.
- [x] **Load the application shell offline.** Verify every current local-first route after service-worker control is established.
- [x] **Notify after a controller update.** Show a reload notice when an activated service worker takes control.
- [ ] **Handle the full update lifecycle.** Detect waiting/updatefound workers and registration or activation failures, and show accurate retry/reload guidance.
- [ ] **Verify saved data offline.** Seed IndexedDB data, go offline, and prove custom content and preferences still load.
- [ ] **Verify audio offline.** Start synthesized playback offline and assert the engine reaches Playing without network requests.
- [ ] **Test update notifications.** Exercise the service-worker update UI rather than relying only on static component behavior.

## Phase 11: Accessibility, Motion, And Error Recovery

- [x] **Provide accessibility foundations.** Use semantic landmarks, skip navigation, visible focus, labels, large common targets, native dialogs/sliders, and reduced motion.
- [x] **Avoid noisy beat announcements.** Keep per-subdivision visuals hidden from screen readers while exposing meaningful transport status.
- [x] **Handle primary runtime errors.** Show audio initialization alerts, IndexedDB fallback warnings, and validated import errors without destroying active configuration.
- [x] **Provide an application error boundary.** Render a recoverable App Router error screen for page failures.
- [ ] **Preserve live regions in focus mode.** Announce playback and pattern changes even when the normal Practice screen is replaced by focus mode.
- [ ] **Announce major BPM changes.** Add a concise live message for buttons, slider commits, tap tempo, presets, and keyboard changes without announcing every tick.
- [ ] **Announce tempo completion.** Put the target-reached state in an assertive or polite live region as appropriate.
- [ ] **Audit toggle semantics.** Ensure every stateful toggle or preview control has accurate `aria-pressed`, label, and disabled behavior.
- [ ] **Expose Wake Lock failure visibly.** Replace title-only error details with a readable, nonblocking status message.
- [ ] **Add section-level error isolation.** Protect major browser-only screens and provider failures beyond the current route error boundary.
- [ ] **Add automated accessibility checks.** Cover contrast, names, roles, keyboard paths, and 44px targets with an appropriate audit tool and focused tests.
- [ ] **Add Framer Motion sparingly.** Introduce the required dependency only for useful transitions and keep musical timing completely independent.
- [ ] **Implement restrained transitions.** Add reduced-motion-safe page, panel, Play-state, pattern-selection, focus-mode, beat, and count-in feedback using transform/opacity where possible.

## Phase 12: Performance And Stability

- [x] **Keep high-frequency timing outside global state.** Use retained visual/guidance timelines and direct DOM updates instead of Zustand updates on every subdivision.
- [x] **Reuse and dispose shared audio resources.** Retain the engine, manager, buses, and schedules for a session while cleaning up one-shot nodes.
- [x] **Lazy-load heavy screens.** Load browser-only Editor and History screens through dynamic client shells.
- [x] **Batch database replacement.** Use Dexie transactions and bulk writes for merge/replace operations.
- [ ] **Move large backup parsing off long tasks.** Chunk, yield, or use a worker for JSON parsing/validation near the 25 MB limit.
- [ ] **Profile active playback.** Record React and browser performance while changing panels, mixer levels, focus mode, timers, and storage writes.
- [ ] **Run physical audio checks.** Listen for timbre, timing, hi-hat choke, pause/resume, and installed-PWA behavior on representative desktop and mobile devices.

## Phase 13: Automated Verification

- [x] **Cover core logic with Vitest.** Test musical time, validation, scheduling, guided modes, editor transforms, repositories, migrations, backup, and recovery.
- [x] **Cover UI behavior with Testing Library.** Test transport, BPM, editor, filters, presets, settings, storage notices, and guided controls in jsdom with fake IndexedDB.
- [x] **Configure cross-browser E2E.** Run Chromium, Firefox, WebKit, and mobile Chromium against the real browser audio engine.
- [x] **Configure production PWA E2E.** Build and serve production separately before testing offline behavior.
- [ ] **Fix the current Chromium E2E failures.** Reproduce and repair backup restore, custom pattern editing, and pattern sharing; keep regression coverage.
- [ ] **Cover count-in to groove in E2E.** Start with a nonzero count-in and assert the audible-state transition rather than disabling count-in first.
- [ ] **Cover keyboard pattern navigation in E2E.** Verify left/right changes, editable-target suppression, and measure-aligned active changes.
- [ ] **Cover a meaningful recorded session in E2E.** Exercise the configured nonzero threshold instead of setting it to zero.
- [ ] **Cover every meter directly.** Add focused musical-time/scheduler tests for 2/4, 5/4, 7/8, and 12/8 in addition to common meters.
- [ ] **Add coverage thresholds.** Set justified line, branch, function, and statement minimums so `pnpm test:coverage` can detect regressions.
- [ ] **Make the full release suite green.** Pass format, lint, typecheck, unit/coverage, E2E, PWA, and production build in the required command forms.

## Phase 14: Documentation And Release

- [x] **Document setup and architecture.** Keep requirements, commands, route behavior, audio ownership, persistence, schemas, pattern format, backup, PWA, browser support, and limitations in `README.md`.
- [x] **Document repository workflow.** Keep concise, executable guidance in `AGENTS.md` for future sessions.
- [ ] **Correct stale README claims.** Align test coverage, 320px behavior, count-in E2E, custom strumming status, fills, and other limitations with executable evidence.
- [ ] **Update docs with completed tasks.** Revise README architecture, settings, backup, PWA, and testing sections whenever this checklist changes shipped behavior.

## Definition Of Done

Every unchecked implementation task must satisfy all applicable items below before it is marked complete:

1. Behavior is implemented without violating the product boundaries.
2. Regression or feature tests cover success, failure, and cleanup paths.
3. `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and focused/full `pnpm test` pass.
4. `pnpm build` passes for Next.js, routing, service-worker, or production changes.
5. Relevant Playwright and PWA tests pass for user-flow or offline changes.
6. Persistence changes preserve old schema versions and include migration/backup coverage.
7. README and this checklist describe the behavior accurately.

## Final Release Gate

- [ ] **Complete every required task above.** No mandatory checkbox remains open or is silently reclassified as optional.
- [ ] **Pass the complete automated suite.** Format, lint, typecheck, coverage, E2E, PWA, and production build all succeed from a clean checkout.
- [ ] **Pass manual browser and device checks.** Verify synthesized sound, stable timing, responsive controls, accessibility, Wake Lock, and installed-PWA behavior.
- [ ] **Confirm local-first data safety.** Test upgrades, corrupted data, unavailable storage, merge/replace, safety backup, delete-all, and offline reloads.
- [ ] **Publish truthful final documentation.** Ensure README feature, limitation, and testing claims match the released implementation.
