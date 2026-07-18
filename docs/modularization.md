# Verva Translate modularization rules

## 1. Purpose

The application must stay easy to review and safe to change. Files are split by
responsibility before they become difficult to reason about.

## 2. Size limits

- React component: target 160 lines, hard limit 240 lines.
- TypeScript hook/service/reducer: target 120 lines, hard limit 200 lines.
- Rust module: target 180 lines, hard limit 280 lines.
- CSS module: hard limit 240 lines.
- Test file: hard limit 300 lines.
- Function: target 30 lines, hard limit 60 lines.

Generated files and lockfiles are exempt. Exceeding a hard limit requires
splitting the file in the same change.

`src-tauri/src/commands/translation.rs` currently sits at the 280-line Rust
limit; the next change to it should split streaming orchestration out of the
command module.

Line count alone is not the goal. Several components pack multiple JSX elements
onto single 300+ character lines, which satisfies the limit while being hard to
review. Prefer readable wrapping over dense one-liners; the limits assume
normally formatted code.

## 3. Directory ownership

```text
src/
|- main.tsx            root render, window label, error boundary
|- AppShell.tsx        theme + i18n providers, routing by window label
|- pages/              one component per window
|- components/         workspace and settings UI, dialogs, title bar
|- hooks/              orchestration: settings, translation, shortcuts
|- services/           Tauri invoke/event wrappers, store, updater
|- domain/             catalogs and shared TypeScript types
|- i18n/               typed English and Chinese dictionaries
`- styles/             global.css

src-tauri/src/
|- lib.rs              plugin, state, and command registration only
|- commands/           thin Tauri command adapters
|- providers/          OpenAI, Claude, SSE, prompt construction
|- state.rs            vault, cancellations, sessions, HTTP client
|- security.rs         DPAPI bootstrap
|- history.rs          bounded history
`- models.rs           shared serde types
```

## 4. React rules

- Components render; hooks orchestrate; services invoke Rust.
- No component constructs provider JSON or handles an API key.
- Fluent UI v9 components are preferred over hand-built controls.
- Dialog state belongs to the feature that owns the dialog.
- A list item selection and an edit action are separate interactions. The Custom
  card may be selected without opening its editor.
- Streaming chunks are coalesced outside the render function.
- Every icon-only button has an accessible label and tooltip.
- Never put an app layout class on `FluentProvider`. Fluent copies that
  `className` onto the body-level portal mount node, and any sizing rule then
  covers the entire window. Scope layout to `#root > .provider-root`.

## 5. Styling rules

Styling is a single global stylesheet, `src/styles/global.css`, using Fluent
design tokens (`var(--colorNeutralBackground1)` and friends). Griffel
`makeStyles` is **not** used. Do not introduce a second styling framework; if
component-scoped styles become necessary, migrate to Griffel deliberately rather
than mixing approaches.

Fluent tokens only resolve inside `FluentProvider`. Rules on `html`, `body`, or
the splash screen must use literal colours, with a
`prefers-color-scheme: dark` fallback.

Window-specific responsive rules are scoped with `body[data-window="main"]`, set
in `main.tsx`. The settings window is narrower than the workspace breakpoints and
must not inherit them.

## 6. TypeScript rules

- `strict` remains enabled.
- No `any` in application code.
- Tauri command names and payloads are centralized in `src/services/backend.ts`.
- Wire types are explicit and use a consistent casing policy.
- Pure logic is tested without rendering.
- Localization keys are inferred from the English dictionary; Chinese must
  satisfy the same key type.

## 7. Rust rules

- `lib.rs` registers plugins, state, and commands only.
- Tauri commands contain validation delegation and error conversion only.
- Provider-specific DTOs stay inside their adapter module; shared inputs use the
  provider-neutral `StreamRequest`.
- Stronghold access stays behind `state::SecretVault`; DPAPI is used only during
  master-key bootstrap.
- Cancellation registrations are removed on every success, failure, or
  cancellation path.
- No `unwrap`, `expect`, `dbg!`, or `println!` in production modules.
- Commands that build a window must be `async`. A synchronous command runs on the
  main thread, where `WebviewWindowBuilder::build()` deadlocks on Windows and
  leaves the new window blank.

## 8. Security rules

- Only Rust-backed commands may access API keys; the webview never receives a
  stored key.
- Remote HTTP is rejected; loopback HTTP is allowed.
- Preferences never contain keys or translation history.
- History is capped at 100 entries before serialization and stored in the vault.
- Tauri capabilities are window-specific and least-privilege.
- Do not enable shell execution or broad filesystem permissions for convenience.
- Update packages must be signed and verified.

Intended but not yet implemented: bounded response size, explicit request
timeouts, bounded redirects, and systematic secret redaction in error strings.
Treat these as required for any change that touches provider error handling.

## 9. UI behavior invariants

- Settings is a single separate app window with its own drawn title bar.
- History and Custom Style are in-app Fluent dialogs without native controls.
- Dialog identity is shown by the upper-left title; dismissal uses bottom actions.
- Clear is leftmost and visually bordered; Copy is beside Translate/Stop.
- Results become editable after the first chunk.
- Auto Detect remains selected after detection.
- The detected language is shown beside Auto Detect and stored only for the
  current source text.
- Swap consumes the stored detected language; editing or clearing the source
  invalidates it.
- Long-conversation state is memory-only and warns at 50%.
- UI language changes preserve current work.
- A render failure shows the `ErrorBoundary` message, never a blank window.

## 10. Test placement

- Pure TypeScript tests live beside the module as `*.test.ts`.
- React behavior tests live as `*.test.tsx` beside the component.
- Rust unit tests live in the module; cross-module tests belong under
  `src-tauri/tests`, which does not exist yet.
- A bug fix adds a regression test at the lowest layer that can reproduce it.

## 11. Review checklist

Before merging:

- no file exceeds its hard limit;
- no API key crosses into the webview or JSON;
- English and Chinese keys match;
- dialogs expose no accidental native controls;
- no app layout class sits on `FluentProvider`;
- streaming does not render every network fragment;
- portable mode cannot self-replace;
- `npm run build`, `npx vitest run`, `cargo fmt --check`,
  `cargo clippy --all-targets -- -D warnings`, and `cargo test` pass;
- a change that alters window creation or a Fluent portal surface is verified by
  actually opening that window or popup, not only by unit tests.
