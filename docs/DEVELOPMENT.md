# Development

[← README](../README.md) · [Installation](INSTALLATION.md) · [Architecture](ARCHITECTURE.md)

## Commands

Run these from the repository root after completing [local setup](INSTALLATION.md).

```bash
pnpm dev            # Development server using Webpack
pnpm build          # Production build and service worker
pnpm start          # Serve the production build
pnpm format         # Format the project
pnpm format:check   # Verify formatting
pnpm lint           # ESLint
pnpm typecheck      # Generate Next route types, then check TypeScript
pnpm test           # Vitest unit and component tests
pnpm test:watch     # Vitest in watch mode
pnpm test:coverage  # Vitest with V8 text and HTML coverage
pnpm test:e2e       # Playwright functional tests across four browser profiles
pnpm test:a11y      # Focused Playwright accessibility checks
pnpm test:pwa       # Fresh production build and offline PWA tests
```

`pnpm typecheck` runs `next typegen --webpack` before `tsc --noEmit`. Do not
replace it with bare `tsc`: the route types under `.next/types` must exist first.
Keep TypeScript on version 6 until the ESLint toolchain supports version 7.

## Routine verification

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

Use `pnpm test:coverage` when checking coverage. Run `pnpm build` after Next.js,
routing, or PWA changes, and the relevant browser suites for user-facing flows.
Formatting or lint issues should be fixed, not hidden by warning suppression.

## Unit and component tests

Vitest discovers `src/**/*.test.{ts,tsx}` and uses jsdom plus `fake-indexeddb`
from [`src/test/test-setup.ts`](../src/test/test-setup.ts).
Web Audio-dependent component tests mock the engine boundary; production and
browser E2E use the real audio engine.

Coverage includes:

- Musical-time calculations, BPM limits, count-ins, measure-aligned changes,
  pause/resume, fills, timed hi-hat choking, flams, and mixer behavior.
- Built-in and imported content validation, editor transformations and grid
  interactions, pattern sharing, and collision-safe imports.
- Tempo, chord, and strumming positions; practice-history lifecycle and totals.
- Dexie repositories and migrations, backup orchestration, storage recovery, and
  core UI controls. Direct scheduler cases include 2/4, 5/4, 7/8, and 12/8.

[`vitest.config.mts`](../vitest.config.mts) requires at least **81% statements,
80% branches, 82% functions, and 82% lines**. HTML reports are written to `coverage/`.

To focus a run:

```bash
pnpm test src/audio/pattern-scheduler.test.ts
pnpm test src/audio/pattern-scheduler.test.ts -t "test name"
```

## Browser tests

Install matching browser binaries after installing or updating Playwright:

```bash
pnpm exec playwright install
pnpm test:e2e
```

The functional suite starts a reusable development server on **port 3002** and
runs Chromium, Firefox, WebKit, and mobile Chromium. It exercises real playback,
count-ins, live controls, keyboard shortcuts, focus mode, guided practice,
custom editors, favorites, history, pattern sharing, and backup/restore with
reload persistence.

Layout checks cover the practice and library screens at 320px, wider practice
layouts through 1920px, and desktop Controls versus mobile sheets. Accessibility
checks cover axe scans, skip navigation, keyboard interaction, focus recovery,
and reduced-motion preferences.

Reduced-motion integration runs on desktop Chromium; axe scans and target geometry
run on desktop and mobile Chromium. The WebKit keyboard-navigation test is skipped
because it depends on the host's Full Keyboard Access setting.

To focus a browser run:

```bash
pnpm test:e2e tests/e2e/practice-flow.spec.ts --project=chromium
```

Do **not** put `--` after `pnpm test` or `pnpm test:e2e`; the runner may ignore
the intended file or project filter.

## Production PWA tests

```bash
pnpm test:pwa tests/pwa/offline-shell.spec.ts
```

The PWA suite always builds production assets and serves **port 3102**. It
verifies service-worker control, every precached route, offline storage and
backup-worker operation, and synthesized playback without HTTP requests from Play.
Update tests install a second worker, apply it through the notification, confirm
takeover, and exercise reload. Development mode cannot verify offline behavior.

Edit [`src/app/service-worker.ts`](../src/app/service-worker.ts) and
[`next.config.ts`](../next.config.ts), never generated `public/sw*.js` or
`public/swe-worker-*.js`. New local-first routes need both precache entries and
offline test coverage.

## Manual checks and follow-up work

Automation checks scheduling, state, node creation, gain/dynamics settings, and
error-free playback. It does **not** prove audible timbre, output-device behavior,
or installed-PWA behavior. Use [Release checks](RELEASE_CHECKS.md) for performance
evidence and the physical listening matrix.

That matrix currently confirms desktop Chromium with macOS built-in speakers.
Safari, headphones, Android installed PWA, and iOS installed PWA checks remain open.
Other follow-up areas are custom strumming-pattern sharing and broader fill and
synthesized-kit character options.
