# TOMINAL-DESKTOP-X1 — Tauri 2 native shell

## Verdict

TOMinaL Studio has a thin Tauri 2 Windows shell around the unchanged browser application. HarnessIr, FormboardDocument, validation, artifact derivation, and React workspaces remain framework-independent TypeScript authorities. The native layer owns only OS dialogs and bounded filesystem writes.

## Native operations

- **Open Project** uses a native file dialog, reads one UTF-8 `.json` file through a bounded Rust command, parses its versioned envelope, and validates HarnessIr plus FormboardDocument before replacing application state.
- **Save Project** uses a native save dialog and writes a deterministic `<project-id>.tominal.json` envelope containing `formatVersion`, `project`, and `quoteRevision`.
- **Export Artifact Folder** uses a native directory dialog and writes the existing release-ready artifact package into `<selected-directory>/<project-id>-artifacts/`. Artifact names must be single safe path components; package count and total byte size are bounded.

The browser build retains the same buttons. Open uses an ordinary file input, Save downloads the project JSON, and Export All retains browser downloads. No Tauri API is invoked outside the native runtime.

## Build and run

```powershell
npm install
npm run desktop:test
npm run desktop:dev
npm run desktop:build
```

The Windows installer is produced under `src-tauri/target/release/bundle/nsis/`. The browser-only build remains `npm run build` and outputs `dist/`.

## Security and authority

The shell does not deserialize directly into trusted state: project JSON is parsed through the existing HarnessIr parser, Formboard parser, and validation gate. Native project reads are limited to 32 MiB. Artifact exports accept 1–64 files, limit aggregate content to 128 MiB, reject traversal/nested names, and write only after an explicit directory selection.

No engineering rules, artifact calculations, quote logic, or UI architecture were moved into Rust. No background service, updater, network provider, credential store, or new canonical state was introduced.

## Validation record

- `npm test`: 17 files and 96 tests passed, including deterministic project-file round trip, invalid-file rejection, and browser open/save fallback wiring.
- `npm run build`: TypeScript and the browser-only Vite production build passed.
- `npm run desktop:test`: Rust tests passed, including bounded project and artifact-folder filesystem writes.
- `npm run desktop:build`: release compilation and NSIS bundling passed.
- The release executable launched as a live `TOMinaL Studio` Windows process and remained running until the smoke check stopped it.
- `npm run artifacts:qualify-ui`: browser qualification completed with no failures.
- `git diff --check`: passed.

The generated installer is `TOMinaL Studio_0.1.0_x64-setup.exe` (2,149,761 bytes), with SHA-256 `723EFE819B61AF721990D3380DFC21E96628FEE1535740A5BC51EAE19E4258B1`. It is an unsigned development build, so Windows may show a SmartScreen warning until release signing is configured.
