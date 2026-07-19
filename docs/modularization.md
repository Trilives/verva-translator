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

The stylesheet was split when it passed the 240-line limit; see §5. Every sheet
is now well inside it.

Line count alone is not the goal. Several components pack multiple JSX elements
onto single 300+ character lines, which satisfies the limit while being hard to
review. Prefer readable wrapping over dense one-liners; the limits assume
normally formatted code.

## 3. Directory ownership

```text
src/
|- main.tsx            root render, stylesheet import order, error boundary
|- AppShell.tsx        theme + i18n providers, page routing, workspace state
|- pages/              one component per page
|- components/         workspace and settings UI, dialogs
|- hooks/              orchestration: settings, workspace, translation, shortcuts
|- services/           Tauri invoke/event wrappers, store, updater
|- domain/             catalogs and shared TypeScript types
|- i18n/               typed English and Chinese dictionaries
`- styles/             base, workspace, dialogs, settings, history, responsive

src-tauri/src/
|- lib.rs              plugin, state, and command registration only
|- commands/           thin Tauri command adapters
|- providers/          OpenAI, Claude, SSE, prompt construction
|- state.rs            vault, cancellations, sessions, HTTP client
|- security.rs         DPAPI bootstrap
|- history.rs          bounded history
|- tray.rs             notification-area icon, menu, show_main
`- models.rs           shared serde types
```

## 4. React rules

- Components render; hooks orchestrate; services invoke Rust.
- No component constructs provider JSON or handles an API key.
- Fluent UI v9 components are preferred over hand-built controls.
- Dialog state belongs to the feature that owns the dialog.
- A list item selection and an edit action are separate interactions. A tone
  bubble may be selected without opening its editor.
- State that must outlive a page lives above the router in `AppShell`, not in
  the page. Pages unmount on navigation, so page-owned state is discarded.
- Streaming chunks are coalesced outside the render function.
- Every icon-only button has an accessible label and tooltip.
- Never put an app layout class on `FluentProvider`. Fluent copies that
  `className` onto the body-level portal mount node, and any sizing rule then
  covers the entire window. Scope layout to `#root > .provider-root`.

## 5. Styling rules

Styling is a set of plain stylesheets under `src/styles/`, using Fluent design
tokens (`var(--colorNeutralBackground1)` and friends). Griffel `makeStyles` is
**not** used. Do not introduce a second styling framework; if component-scoped
styles become necessary, migrate to Griffel deliberately rather than mixing
approaches.

The sheets are `base`, `workspace`, `dialogs`, `settings`, `history`, and
`responsive`. They are imported individually from `main.tsx`, and **cascade
order is import order**, so `base` stays first and `responsive` stays last —
its media queries share specificity with the rules they override.

Do **not** compose them with CSS `@import` from a manifest sheet. Vite's dev
server does not inline CSS `@import`: the manifest serves as an empty stylesheet
and the entire app renders unstyled under `npm run dev`, while the production
build looks fine. `src/styles/stylesheets.test.ts` enforces both the absence of
`@import` and the import order.

Fluent tokens only resolve inside `FluentProvider`. Rules on `html`, `body`, or
the splash screen must use literal colours, with a
`prefers-color-scheme: dark` fallback.

The window is Mica-backed, so `body` must stay transparent and surfaces use
`color-mix(... transparent)` rather than opaque fills.

Each page owns its own scroll region. `.app-content` is `overflow: hidden`; a
page that can overflow gives its body `flex: 1; min-height: 0; overflow-y: auto`.
Do not put `overflow: auto` back on the shell: combined with `min-height: 100%`
plus padding it made every page scroll a few pixels when it already fitted.

No content may be both clipped and unreachable. A page that can outgrow the
window scrolls; it does not rely on a `min-width` floor on `html`/`body`, which
clips instead of scrolling. When space is short the translation panes are the
last thing to give it up.

## 6. TypeScript rules

- `strict` remains enabled.
- No `any` in application code.
- Tauri command names and payloads are centralized in `src/services/backend.ts`.
- Wire types are explicit and use a consistent casing policy.
- Pure logic is tested without rendering.
- Localization keys are inferred from the English dictionary; Chinese must
  satisfy the same key type.
- Catalogue values are identifiers, not labels. Anything persisted, sent to a
  provider, or written to history stays canonical English; localize at render
  time only.

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

- One window with native decorations. Settings and History are pages, not windows.
- The tone editor, Update, and the close prompt are the only dialogs.
- Dialog identity is shown by the upper-left title; dismissal uses bottom actions.
- A dialog with three actions must keep every label on one line; see §5 of
  `architecture.md` for why Fluent squeezes them by default.
- Tone and style is a block above the panes; each language selector sits on the
  pane it applies to.
- The tone row is four builtins, then up to four user-defined tones, then Add,
  which disappears at the cap. The row scrolls sideways and never wraps.
- Switching pages preserves the source text and the streaming result.
- Clear input is at the bottom left of the input pane and Translate at its
  bottom right. Translate does not toggle.
- Copy result is the only permanent action on the result pane and stays at its
  bottom right. Stop appears at the bottom left of that pane only while
  streaming, so it sits beside the output it interrupts.
- The action rows reserve their height, so a pane must not resize when Stop
  appears or disappears.
- Style labels must not shift on hover or selection; the bold ghost in
  `.style-bubble-label::after` reserves the selected width.
- One Save per configuration. Saving collapses the row.
- Shortcuts are recorded, never typed, and always require a modifier unless the
  trigger is a function key.
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
