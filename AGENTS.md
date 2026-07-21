# Repository Instructions

## Ground Truth

- This is one private Next.js 16 App Router package, not a monorepo. `pnpm-workspace.yaml` only configures dependency build policy; run commands from the repository root.
- Use Node.js 20.19+, 22.13+, or 24+ and the `package.json`-pinned pnpm 11.15.1.
- Treat `PLANING.md` as implementation history and a release checklist, not architectural ground truth; prefer scripts, config, and source when they conflict.
- Keep the product client-only: no API routes, server actions, backend, auth, analytics, cloud persistence, recorded audio, or external audio assets. Drum sounds are synthesized in the browser.

## Commands

- `pnpm dev` and `pnpm build` intentionally force Webpack because Serwist's active integration does not use Turbopack.
- `pnpm typecheck` runs `next typegen` before `tsc --noEmit`; do not replace it with bare `tsc`, because route types under `.next/types` are generated first.
- Routine full verification is `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, then `pnpm test`. Use `pnpm test:coverage` for the V8 text/HTML coverage report and `pnpm build` after Next, routing, or PWA changes.
- Focus Vitest with `pnpm test src/audio/pattern-scheduler.test.ts` or add `-t "test name"`. Tests are discovered only as `src/**/*.test.{ts,tsx}`.
- Focus Playwright with `pnpm test:e2e tests/e2e/practice-flow.spec.ts:26 --project=chromium`. Do not put `--` after `pnpm test`/`test:e2e`; it becomes a literal runner separator and the file/project filter may be ignored.
- Unit tests use jsdom plus `fake-indexeddb` from `src/test/test-setup.ts`. The E2E config starts a reusable dev server on port 3002 and otherwise runs Chromium, Firefox, WebKit, and mobile Chromium.
- `pnpm test:pwa tests/pwa/offline-shell.spec.ts` always performs a fresh production build and serves port 3102. Serwist is disabled in development, so do not use `pnpm dev` to verify offline behavior.

## Runtime Boundaries

- `src/app` route files are thin server components; substantive route screens enter browser-only code through client shells using `dynamic(..., { ssr: false })`. `/` redirects to `/practice`.
- `src/hooks` is the lifecycle/orchestration layer between UI, Zustand, storage, and the shared audio engine. Route owners dispose the audio singleton on unmount; preserve that teardown when changing navigation or playback ownership.
- `src/audio` owns Tone/Web Audio runtime and timing. Zustand stores contain only serializable status/configuration; never put Tone nodes, AudioNodes, schedules, or precise per-tick timing in React/Zustand state.
- Start Tone only from the direct Play interaction. Schedule against Tone Transport and pass callback time to audio nodes; React rendering, animation frames, and timers are not musical clocks. Preserve pause position, measure-boundary pattern changes, validation before scheduling, and complete stop/disposal cleanup.
- Components consume persistence through `src/db/storage-service.ts`, repositories, and feature stores; they do not access Dexie directly. Preserve the IndexedDB-to-memory recovery path and validate/clone stored or imported data at repository/service boundaries.
- Dexie schema versions 1-3 in `src/db/database.ts` are migration history. Append a new `version()` declaration and migration tests for schema changes; do not rewrite old declarations.
- `src/services/backup-service.ts` coordinates data across repositories and local settings. IndexedDB replacement is transactional, but later `localStorage` updates are not; keep partial-completion warnings accurate.

## PWA Artifacts

- Edit `src/app/service-worker.ts` and `next.config.ts`, never generated `public/sw*.js` or `public/swe-worker-*.js`. Also do not edit `.next/`, `next-env.d.ts`, `tsconfig.tsbuildinfo`, `coverage/`, or `test-results/`.
- New local-first routes must be added to Serwist `additionalPrecacheEntries` and covered by `tests/pwa/offline-shell.spec.ts`; the document fallback is `/practice`.
