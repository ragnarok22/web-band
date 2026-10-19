# Web Band

A browser-based rhythm practice companion for guitarists. Pick a drum groove,
set your tempo, and play along with chord, strumming, or tempo-training guidance.

[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)](https://nextjs.org/)
[![TypeScript 6](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![pnpm 12.14.0](https://img.shields.io/badge/pnpm-12.14.0-F69220?logo=pnpm&logoColor=white)](docs/INSTALLATION.md)
[![Storage: local-first](https://img.shields.io/badge/storage-local--first-327568)](docs/DATA_AND_BACKUPS.md)
[![PWA: offline-ready](https://img.shields.io/badge/PWA-offline--ready-5266A3)](docs/ARCHITECTURE.md#offline-support)

Drum sounds are synthesized in your browser, not played from recordings.
There are no accounts, analytics, or cloud services.

## Features

- **Find a groove:** browse 44 built-in drum patterns by genre, difficulty, or
  meter, and save your favorites.
- **Shape the sound:** adjust tempo from 40–220 BPM while playing, add fills and
  swing, and balance the kit with a mixer.
- **Practice with guidance:** build speed with tempo training, follow chord
  changes, or work on strumming patterns.
- **Create your own patterns:** edit one-, two-, or four-bar grooves in the step
  sequencer, then share them as JSON files.
- **Keep a routine:** save practice setups as presets and review your time,
  most-used grooves, and tempo range in a local journal.
- **Stay focused:** use the beat display, focus mode, keyboard shortcuts, and
  dark or light themes on desktop and mobile.

## Run locally

Follow the [local installation guide](docs/INSTALLATION.md) for requirements,
setup, and production builds. No environment variables or backend setup are needed.

Once running, open [localhost:3000/practice](http://localhost:3000/practice),
choose a groove, and press **Play**.

## Documentation

| Guide                                        | What you'll find                                            |
| -------------------------------------------- | ----------------------------------------------------------- |
| [Installation](docs/INSTALLATION.md)         | Local setup, browser requirements, and troubleshooting      |
| [Development](docs/DEVELOPMENT.md)           | Commands, tests, coverage, and release checks               |
| [Architecture](docs/ARCHITECTURE.md)         | Project structure, audio engine, and offline support        |
| [Data and backups](docs/DATA_AND_BACKUPS.md) | Local storage, pattern sharing, and backup/restore behavior |
| [Drum presets](docs/PRESETS.md)              | Importable song-groove examples and the pattern file format |
| [Release checks](docs/RELEASE_CHECKS.md)     | Performance evidence and physical-device testing status     |

## Good to know

- **Audio starts with Play.** Browsers require a user interaction before sound
  can begin; chord and strumming cues are visual guidance, not guitar audio.
- **Your data stays in this browser profile.** Export a backup to keep a copy or
  move it to another browser. There is no automatic sync.
- **Offline use needs a first online visit.** Let the production app finish
  installing its offline files; offline support is disabled in development mode.
- **Use a current browser.** Chrome, Edge, Firefox, or Safari with Web Audio is
  recommended. If persistent storage is unavailable, changes last only for the visit.
