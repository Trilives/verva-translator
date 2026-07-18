# Verva Translate modularization rules

## 1. Purpose

The Tauri rewrite must remain easy to review and safe to change. Files are split by responsibility before they become difficult to reason about.

## 2. Hard limits

- React component: target 160 lines, hard limit 240 lines.
- TypeScript hook/service/reducer: target 120 lines, hard limit 200 lines.
- Rust module: target 180 lines, hard limit 280 lines.
- CSS/Griffel style module: hard limit 220 lines.
- Test file: hard limit 300 lines.
- Function: target 30 lines, hard limit 60 lines.

Generated files and lockfiles are exempt. Exceeding a hard limit requires splitting the file in the same change.

## 3. Directory ownership

```text
src/
|- app/                  startup, providers, window routing
|- components/           product-neutral Fluent wrappers
|- features/
|  |- translate/         workspace, styles, languages, streaming
|  |- settings/          profile and application preferences
|  |- history/           bounded-history dialog
|  `- session/           memory-only conversation session
|- i18n/                 typed English and Chinese dictionaries
|- lib/                  Tauri invoke/event wrappers and utilities
|- state/                shared application state
`- types/                wire and domain TypeScript types

src-tauri/src/
|- commands/             thin Tauri command adapters
|- application/          translation/update orchestration
|- domain/               provider-neutral models and policies
|- infrastructure/
|  |- providers/         OpenAI, Claude, SSE
|  |- persistence/       Tauri Store and DPAPI history
|  |- security/          Stronghold vault bootstrap and redaction
|  `- updates/           GitHub release and install-mode logic
`- lib.rs                composition root only
```

## 4. React rules

- Components render; hooks orchestrate; services invoke Rust.
- No component constructs provider JSON or handles an API key.
- Fluent UI v9 components are preferred over hand-built controls.
- Layout uses Griffel `makeStyles` and Fluent tokens; do not introduce a second styling framework.
- Dialog state belongs to the feature that owns the dialog.
- A list item selection and an edit action are separate interactions. The Custom card may be selected without opening its editor.
- Streaming chunks are coalesced outside the render function.
- Every icon-only button has an accessible label and tooltip.

## 5. TypeScript rules

- `strict` remains enabled.
- No `any` in application code.
- Tauri command names and payloads are centralized in `src/lib/tauri.ts`.
- Wire types are explicit and use the same snake/camel casing policy consistently.
- Reducers and pure selection logic are tested without rendering.
- Localization keys are inferred from the English dictionary; Chinese must satisfy the same key type.

## 6. Rust rules

- `lib.rs` registers plugins, state, and commands only.
- Tauri commands contain validation delegation and error conversion only.
- Provider-specific DTOs stay inside their adapter module.
- The domain layer does not depend on Tauri, reqwest, Windows APIs, or JSON files.
- Stronghold access stays behind the native secret-vault module; DPAPI is used only during vault bootstrap.
- Cancellation registrations are removed on every success, failure, or cancellation path.
- No `unwrap`, `expect`, `dbg!`, or `println!` in production modules.
- Errors exposed to the UI are typed, concise, and secret-redacted.

## 7. Security rules

- Only Rust-backed Stronghold commands may access API keys; the webview never receives a stored key.
- Remote HTTP is rejected; loopback HTTP is allowed.
- Preferences never contain keys or translation history.
- History is capped before serialization and encrypted before writing.
- Writes use an app-data path and atomic replace.
- Tauri capabilities are window-specific and least-privilege.
- Do not enable shell execution or broad filesystem permissions for convenience.
- Update packages must be signed and verified.

## 8. UI behavior invariants

- Settings is a single separate app window.
- History and Custom Style are in-app Fluent dialogs without native window controls.
- Dialog identity is shown by the upper-left title; dismissal uses bottom actions.
- Clear is leftmost and visually bordered; Copy is beside Translate/Stop.
- Results become editable after the first chunk.
- Auto Detect remains selected after detection.
- The detected language is shown beside Auto Detect and stored only for the current source text.
- Swap consumes the stored detected language; editing or clearing the source invalidates it.
- Long-conversation state is memory-only and warns at 50%.
- UI language changes preserve current work.

## 9. Test placement

- Pure TypeScript tests live beside the module as `*.test.ts`.
- React behavior tests live as `*.test.tsx` beside the feature.
- Rust unit tests live in the module; cross-module tests live under `src-tauri/tests`.
- A bug fix adds a regression test at the lowest layer that can reproduce it.

## 10. Review checklist

Before merging:

- no file exceeds its hard limit;
- no API key crosses into the webview or JSON;
- English and Chinese keys match;
- dialogs expose no accidental native controls;
- streaming does not render every network fragment;
- portable mode cannot self-replace;
- `npm run check`, frontend tests, `cargo fmt --check`, `cargo clippy -- -D warnings`, and Rust tests pass;
- Windows bundle output contains the expected installer and updater artifacts.
