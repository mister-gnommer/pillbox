# Proposal

## Why

Reading pillboxes aloud (the next changes, `pillbox-reading` and `reading-session`) needs data to read. This change delivers the data layer and the screens for managing it. It is also usable on its own as a pillbox planner.

## What Changes

- Pillbox list (home screen): create, rename, delete (with confirmation) and reorder with ↑/↓.
- Pillbox screen: medications in insertion order; add, edit, delete (with confirmation).
- Add/edit through modal forms: pillbox = name; medication = name (required) + amount (optional, free text).
- Data persisted on the device and restored on app start.
- Test setup (unit + screen tests) that later changes reuse.
- UI strings in Polish, hardcoded (no i18n layer).

Out of scope: reading/TTS, settings and API key, sessions (later changes), fixed medication form list, drag-and-drop.

## Capabilities

### New Capabilities

- `pillboxes`: the user's ordered list of named pillboxes and its persistence.
- `medications`: the ordered medications inside a pillbox.

### Modified Capabilities

None. No specs exist yet.

## Impact

- New dependencies: AsyncStorage (data), jest-expo + React Native Testing Library (dev).
- New code: `src/features/pillboxes/`, routes in `src/app/` (list, pillbox, two modal forms). The root layout is replaced.
- Data format becomes a contract for `pillbox-reading` and `reading-session`.
