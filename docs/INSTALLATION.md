# Local installation

[← README](../README.md) · [Development guide](DEVELOPMENT.md)

Run Web Band on your computer without accounts, API keys, environment variables,
or a separate backend. Practice data is stored in your browser.

## Requirements

- **Node.js 24.22.1 or newer 24.x**, pinned in [`.nvmrc`](../.nvmrc).
  Check your version with `node --version`. If you use nvm, run `nvm install`
  and `nvm use` from the repository root.
- **pnpm 12.14.0**, pinned in [`package.json`](../package.json).
- **Git** and access to this repository.
- A current Chrome, Edge, Firefox, or Safari browser with Web Audio support.
  IndexedDB is needed for persistent custom content and history.

If pnpm is not installed, install the pinned version after installing Node.js:

```bash
npm install --global pnpm@12.14.0
pnpm --version
```

TypeScript 6 and the other project dependencies are installed in the next step;
you do not need to install them globally.

## Start the development app

```bash
git clone https://github.com/ragnarok22/web-band.git
cd web-band
pnpm install
pnpm dev
```

Open [http://localhost:3000/practice](http://localhost:3000/practice).
The root URL redirects to `/practice`.

Choose a groove, set a comfortable volume, and press **Play**. Browser autoplay
rules prevent audio from starting before that interaction.

All commands run from the repository root. This is a single package;
`pnpm-workspace.yaml` configures dependency build policy, not a monorepo.

## Run a production build

Stop the development server before using the same port for production:

```bash
pnpm build
pnpm start
```

Open the same local URL. Next.js prerenders the pages during the build, and
`pnpm start` serves the result. There are no backend data dependencies.

Development and production use Webpack because the active Serwist integration
does not use Turbopack. Keep the existing package scripts rather than replacing
them with bare Next.js commands.

## Offline use and app installation

Offline support is **disabled in development**. To try it locally, run a production
build, visit the app online, and allow its service worker to finish installing
before disconnecting.

Where supported, use your browser's **Install app** or **Add to Home Screen**
option. Safari 16.4 or newer is recommended for installed PWA use on iOS.
Outside localhost, service workers require HTTPS; optional Screen Wake Lock also
needs browser support and a secure context.

Installation options vary by browser. See the [physical-device matrix](RELEASE_CHECKS.md#physical-device-matrix)
for what has actually been checked, and [Architecture](ARCHITECTURE.md#offline-support)
for caching and update behavior.

## Troubleshooting

| Problem                           | What to check                                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Clone is denied                   | Confirm your GitHub account has access and Git authentication is configured.                                                                           |
| Install or startup fails          | Check Node.js and pnpm versions, and run commands from the repository root.                                                                            |
| Port 3000 is occupied             | Stop the other server or use the local URL printed by Next.js.                                                                                         |
| No sound                          | Press Play, check system and mixer volume, and confirm Web Audio is supported. Play also resumes a suspended audio context.                            |
| Changes disappear on reload       | Look for a storage warning. Blocked or failed IndexedDB falls back to memory for the current visit; failed preference writes may also reset.           |
| Offline reload fails              | Use a production build, wait for service-worker installation, and use localhost or HTTPS. Without service-worker support, online practice still works. |
| Screen stays awake inconsistently | Wake Lock can be unavailable or denied. Playback still works, and the app reports a nonblocking status.                                                |

Keep a [JSON backup](DATA_AND_BACKUPS.md#full-backups) before clearing browser
storage. Data belongs to a browser profile and origin, so changing the host or port
does not carry your library or settings to the new address.
