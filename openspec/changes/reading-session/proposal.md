# Proposal

## Why

`pillbox-reading` reads one pillbox at a time. Filling a week's worth means going back, picking the next pillbox and tapping Czytaj again, touching the phone between every pillbox. A session walks through the pillboxes in order with three large controls, so the only touches are "again", "next" and "stop". The controls are shaped like the voice commands planned for later. This is the last planned change and the first to cut if time runs out.

## What Changes

- Start a session from any pillbox: ▶ on each row of the list, or "Start" on the pillbox screen.
- Session screen: shows the current pillbox, reads it automatically on arrival, and walks down the list.
- Three large buttons:
  - **Powtórz**: reread from the start, from the downloaded file.
  - **Dalej**: cut the audio and move to the next pillbox. On the last one, return to the list.
  - **Stop**: if playing or downloading, stop (abort the download) and stay; if idle, end the session and return to the list.
- An empty pillbox shows "Brak leków w tym pudełku" on screen instead of reading.
- Audio keeps playing when the app is backgrounded or the screen is locked.
- Downloaded audio is reused within the session (Powtórz never re-requests).
- The single-pillbox reading flow moves into a shared hook used by both screens. Czytaj behaviour is unchanged.

Out of scope: voice commands, a "Gotowe ✓" end screen, caching across sessions, lock-screen media controls.

## Capabilities

### New Capabilities

- `reading-session`: guided, ordered reading of pillboxes with Repeat/Next/Stop controls.

### Modified Capabilities

None. The entry points (▶, Start) are specified in `reading-session`. `pillboxes`, `medications`, `pillbox-reading` and `settings` requirements are unchanged.

## Impact

- New route `src/app/session.tsx`. Edits to `src/app/index.tsx` (▶), `src/app/pillbox/[id].tsx` (Start, uses the hook), `src/app/_layout.tsx` (audio mode, route).
- New `src/features/reading/useReader.ts`, extracted from the pillbox screen.
- `app.json`: `expo-audio` config plugin with `enableBackgroundPlayback`. This only takes effect in development builds; Expo Go behaviour has to be checked by hand.
- No new dependencies.
