# Design

## Context

Builds on `pillbox-management` (store, `usePillboxes()`, list order = session order) and `pillbox-reading`:
- `buildScript`, `synthesize(text, apiKey) → file URI`, `getApiKey`;
- `useAudioPlayer` playback inline in `src/app/pillbox/[id].tsx`, with a `{ script, uri }` replay cache, the missing-key alert and the failure alert with Retry;
- `setAudioModeAsync({ playsInSilentMode: true })` in the root layout.

That design said `reading-session` would extract the playback flow once there is a second caller. This is that change. Expo SDK 58 facts below were checked against current docs.

## Goals / Non-Goals

**Goals:** one reading flow shared by the Czytaj button and the session; correct behaviour when the user taps faster than the audio downloads.

**Non-Goals:** session persistence (leaving the screen ends it), lock-screen or notification controls, prefetching the next pillbox, voice commands.

## Decisions

### Extract `useReader()` → `src/features/reading/useReader.ts`
The flow moves out of the pillbox screen unchanged, with two generalisations:
- **Cache**: a `Map<script, uri>` in a ref instead of a single `{ script, uri }`. In a session this lets Powtórz replay any pillbox already read. On the pillbox screen it behaves the same as before.
- **Aborting downloads**: `synthesize(text, apiKey, signal?)` gains an optional `AbortSignal`, passed to `expo/fetch`. The hook keeps the current `AbortController` in a ref. Every `read()` and `stop()` aborts the previous one first, and so does unmount (effect cleanup). This replaces the `mounted` ref guard that `pillbox-reading` added to the pillbox screen, so leaving during a download never touches the released player and never shows an alert. An `AbortError` is swallowed: no alert and no state change beyond `idle`. This covers "Dalej during download" and "Stop during download". Rejected: a request-id guard that waits for the response and drops it, which needs more code and still waits on the network.

API: `{ status: "idle" | "loading" | "playing", read(pillbox), stop() }`.
- `read` assumes a non-empty pillbox. It handles the missing key (alert → settings), the spinner state, cache or synthesize, `replace` + `seekTo(0)` + `play`, and the failure alert with Retry.
- `stop` aborts any download, then `pause()` + `seekTo(0)`.
- `status` comes from `useAudioPlayerStatus(player).playing` plus a local loading flag. (Apply finding: SDK 58 sends `playing` as a native event, so the planned optimistic "playing" flag was dropped; the only gap is the few ms of loading the local mp3, during which Stop counts as idle.)

The empty-pillbox handling stays with each caller: the pillbox screen keeps its alert, and the session shows on-screen text. A Czytaj alert is fine, but in a hands-free session an alert would need a tap to dismiss.

### Entry points
- ▶ `IconButton` on each list row (`aria-label "Rozpocznij od: <name>"`) and a "Start" `Button` on the pillbox screen. Both call `startSession(pillboxId)` in `src/features/reading/session.ts`. It checks `getApiKey()`: with no key it shows the shared missing-key alert; otherwise it calls `router.push({ pathname: "/session", params: { start: id } })`.
- The missing-key alert becomes an exported `alertMissingKey()` in `src/features/reading/`, used by `useReader` and `startSession`.

### Session screen `src/app/session.tsx`
- State: `index`, initialised from `pillboxes.findIndex(p => p.id === start)`. The current pillbox is `pillboxes[index]`; an unknown `start` shows "Nie znaleziono pudełka".
- An effect on `current.id` calls `reader.read(current)` when it has medications. Otherwise the screen shows "Brak leków w tym pudełku" and Powtórz is disabled.
- Controls are three large full-width buttons (≥72 dp, glyph + label):
  - **↻ Powtórz** → `reader.read(current)` (a cache hit restarts at 0).
  - **⏭ Dalej** → `reader.stop()`; on the last pillbox, `router.dismissTo("/")`; otherwise `setIndex(i + 1)`.
  - **■ Stop** → if `status` is `"loading"` or `"playing"`, `reader.stop()` and stay; if `"idle"`, `router.dismissTo("/")`.
- `dismissTo("/")` returns to the list whether the session started from the list or from a pillbox screen (`dismissTo` pops to that href, or replaces if it's not in the history).
- Header title is the pillbox name, with a line "Pudełko 2 z 5" under it. The header back button also ends the session: on unmount the hook releases the player.

### Background playback
- Root layout: `setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" })`. `doNotMix` pauses music so the reading is heard.
- `app.json`: `["expo-audio", { "enableBackgroundPlayback": true }]`. This only applies in development or production builds.
- No lock-screen controls. On Android, without `setActiveForLockScreen`, background audio stops after about 3 minutes. One pillbox reading is well under that. `shortcut: no lock-screen controls; add setActiveForLockScreen if a single reading can exceed ~3 min.`

### Tests (`src/__tests__/session.test.tsx`)
Reuse the mocks for `expo-audio`, `elevenlabs` and `expo-secure-store` from the `pillbox-reading` tests, with `renderRouter` over the real routes. Scenarios:
- ▶ starts on the tapped pillbox, and Start does the same from the pillbox screen;
- no key → alert and no session;
- arriving auto-reads (`synthesize` with that pillbox's script, then `play`);
- an empty pillbox shows the text and never calls `synthesize`;
- Powtórz → `play` again with no new `synthesize`;
- Dalej while playing → `pause`, then the next pillbox is read;
- Dalej on the last → pathname `/`;
- Stop while playing or during a pending `synthesize` → stays (same title), with no error alert;
- Stop while idle → `/`;
- Dalej during a pending `synthesize` → its signal is aborted, no alert, and the next pillbox is read;
- failure → alert, and Anuluj leaves the controls usable.

The existing `pillbox-reading` screen tests must still pass after the extraction; that is the regression check for the hook.

## Risks / Trade-offs

- [Expo Go may ignore the background config, because config plugins need a build] → check by hand (task 5.2). If it doesn't work in Expo Go, document "background playback requires a development build" in the README. The code stays the same.
- [Every arrival triggers a request, which costs credits] → reuse within the session only. Caching across sessions is deferred.
- [Pillboxes edited during a session] → not possible, because the session screen covers the editing screens. If the list changes length (it can't today), `index` is guarded against out of range by the end-of-session check.
- [`dismissTo` with a modal-free stack] → covered by the pathname assertions in the tests.
