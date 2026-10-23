# Tasks

## 1. Shared reader

- [ ] 1.1 Extract the reading flow from `src/app/pillbox/[id].tsx` into `src/features/reading/useReader.ts` (Map cache, `AbortController` per read, also aborted on unmount, with `AbortError` swallowed; `status` set to playing right after `play()`; `status`/`read`/`stop`). The hook replaces the screen's `mounted` ref. Add the optional `signal` parameter to `synthesize` and a unit test that it is passed to fetch. Move the missing-key alert into an exported `alertMissingKey()`. Make the pillbox screen use the hook and keep its empty-pillbox alert. Verify the existing `pillbox-reading` screen tests pass unchanged.

## 2. Background audio

- [ ] 2.1 Set `shouldPlayInBackground: true` and `interruptionMode: "doNotMix"` in the root layout's `setAudioModeAsync`, and add the `expo-audio` plugin with `enableBackgroundPlayback: true` to `app.json`. Verify `npx expo-doctor` and `npx tsc --noEmit` pass.

## 3. Entry points

- [ ] 3.1 Add `startSession(pillboxId)` (key check → `alertMissingKey` or push `/session?start=<id>`), a ▶ `IconButton` on each list row, and a "Start" button on the pillbox screen. Verify by screen test: ▶ and Start open `/session` with the right `start`; no key → alert and the pathname is unchanged.

## 4. Session screen

- [ ] 4.1 Build `src/app/session.tsx` per design.md (index state, auto-read effect, empty text, "Pudełko n z N", the Powtórz/Dalej/Stop logic with `dismissTo("/")`) and register the route in the root layout. Verify by screen tests: auto-read on arrival; empty → text and no `synthesize`; Powtórz → `play` without a new `synthesize`; Dalej while playing → next pillbox read; Dalej on the last → `/`; Stop while playing stays; Stop while idle → `/`.
- [ ] 4.2 Verify aborts and errors by screen test: Stop during a pending `synthesize` → signal aborted, stays, no alert; Dalej during a pending `synthesize` → signal aborted, no alert, next pillbox read; a failure → alert, then Anuluj leaves Powtórz/Dalej/Stop working. Confirm each test fails when its guard is removed.

## 5. Integration check

- [ ] 5.1 Run `npx tsc --noEmit`, `npm run lint`, `npm test` and `npx expo-doctor`; all pass.
- [ ] 5.2 Manually in Expo Go with a real key and three pillboxes (one empty), starting from the second via ▶:
  - it auto-reads;
  - Powtórz replays instantly;
  - Stop while playing stays on the pillbox, and Stop when idle returns to the list;
  - Dalej reaches the empty pillbox (warning shown), then the last one, then returns to the list;
  - locking the screen keeps the reading going. If it stops in Expo Go, note in the README that this needs a development build.

## Workflow follow-up

- Commit the apply step; then sync and archive after user approval, one commit each.
