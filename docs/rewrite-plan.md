# Tauri 2 rewrite plan

## Goal

Replace the WPF/.NET implementation with Tauri 2, React, TypeScript, and Fluent UI React v9 without removing product capability. Layout may improve, but behavior and security requirements remain acceptance criteria.

## Execution phases

1. Foundation
   - Remove the WPF application, bespoke installer, and .NET tests.
   - Create the Vite/React frontend and Tauri 2 Rust workspace.
   - Register official Single Instance, Store, Stronghold, and Updater plugins.
   - Add CSP, per-window capabilities, the Windows icon, and NSIS configuration.
2. Typed domain and persistence
   - Define profile, preferences, translation, history, update, and session contracts.
   - Persist ordinary settings with Tauri Store.
   - Protect a random Stronghold master key with Windows DPAPI.
   - Keep API keys and at most 100 history entries in Stronghold.
   - Keep long-conversation messages in memory only.
3. Provider core
   - Implement OpenAI-compatible and Claude-compatible adapters.
   - Require HTTPS remotely and allow HTTP only on loopback.
   - Support SSE streaming, ordinary JSON fallback, cancellation, thinking mode, and source-language parsing.
   - Repeat all essential translation requirements on every long-conversation turn.
4. Fluent desktop UI
   - Build the main workspace, separate Settings window, History dialog, and Custom Style dialog.
   - Preserve detected-language swap semantics, custom target languages, pencil-only style editing, editable output, shortcuts, Stop, Copy, and visible Clear.
   - Coalesce streamed rendering to one animation frame and keep popup surfaces stable.
   - Support English and Simplified Chinese without changing the required English editor prompts.
5. Desktop integration
   - Focus the existing app on a second launch and focus the existing Settings window.
   - Configure bilingual, per-user NSIS installation with destination selection and progress.
   - Support independent stable/beta manifests, automatic/manual checks, installed updates, and portable notify-only behavior.
6. Documentation and automation
   - Maintain independent English and Chinese READMEs.
   - Build versioned portable and installer executables in GitHub Actions.
   - Publish checksums, signed updater artifacts, and channel manifests.
   - Keep `architecture.md` and `modularization.md` authoritative.

## Feature preservation checklist

- [x] OpenAI-compatible provider
- [x] Claude-compatible provider
- [x] Multiple switchable profiles
- [x] Thinking mode per profile
- [x] Long conversation, session time, refresh, repeated requirements, and 50% warning
- [x] Streaming output, JSON fallback, and Stop
- [x] Source detection shown beside Auto Detect
- [x] Swap consumes the temporarily detected source language
- [x] Major and Custom target languages
- [x] Natural, Conversation, Business, Command, and Custom styles
- [x] Pencil-only Custom editing
- [x] Editable results
- [x] Visible Copy and bordered leftmost Clear
- [x] Configurable shortcuts
- [x] Separate Settings window
- [x] In-app dialogs without native window controls
- [x] English/Simplified Chinese UI switch
- [x] 100-entry encrypted history
- [x] Stronghold API-key storage with a DPAPI-protected master key
- [x] System app-data paths only
- [x] Single-instance activation
- [x] Stable/beta automatic and manual updates
- [x] Portable notify-only update behavior
- [x] Installer language, destination selection, progress, shortcut, and uninstall
- [x] Versioned portable and Setup release assets with checksums
