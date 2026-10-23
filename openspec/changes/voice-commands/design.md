# Design

## Context

Builds on `reading-session` (being applied alongside this change): `useReader()` gives `{ status, read, stop }` with an `AbortController` per read, and the session screen `src/app/session.tsx` has handlers for Powtórz, Dalej and Stop. `synthesize()` in `src/features/reading/elevenlabs.ts` owns the ElevenLabs error mapping. The `expo-audio` plugin currently disables the microphone. Facts below were checked against the current Expo and ElevenLabs docs. Apply re-checks against SDK 58 types.

## Goals / Non-Goals

**Goals:** voice triggers the *same* handlers as the buttons, with no second state machine. A small, unit-tested command parser.

**Non-Goals:** streaming or realtime speech-to-text, voice activity detection (fixed 5 s window), echo cancellation (we never listen while playing).

## Decisions

### Speech-to-text: `transcribe(uri, apiKey, signal?)` in `elevenlabs.ts`
- `POST https://api.elevenlabs.io/v1/speech-to-text` with header `xi-api-key` and a multipart `FormData`:
  - `model_id=scribe_v2`
  - `language_code=pl`
  - `keyterms` containing "powtórz", "dalej" and "stop", to bias recognition towards the command words. Check the multipart shape for a list (repeated field vs JSON) in the docs during apply.
  - `file`: the recording.
- It returns `json.text`, and reuses the HTTP→Polish error mapping from `synthesize` (extract the shared part into a local helper inside this file).
- How the file goes into `FormData` with `expo/fetch` must be checked in the SDK 58 docs: an `expo-file-system` `File` (a Blob) or `{ uri, name, type }`. Use whichever the docs show.
- Rejected: on-device speech recognition. It needs a native module that Expo Go doesn't have, and it would be a second AI provider.

### Command parsing: `src/features/voice/command.ts`
`parseCommand(text): "repeat" | "next" | "stop" | null`:
1. Lowercase, then strip diacritics with `normalize("NFD")` plus removing combining marks. `ł` needs an explicit replacement; none of our commands contain it.
2. Remove punctuation, split on whitespace, and drop empty words.
3. Return null for 0 or more than 3 words.
4. Map words to commands: `powtorz` → repeat, `dalej` → next, `stop` → stop. Exactly one distinct command → return it; otherwise null.

### Listening: `src/features/voice/useListener.ts`
`useListener(onCommand)` → `{ listening, listen(), cancel() }`.
- It uses `useAudioRecorder(RecordingPresets.HIGH_QUALITY)`. `listen()`:
  1. If permission isn't granted, return.
  2. `prepareToRecordAsync()` + `record()`, set `listening`.
  3. Wait 5 s (a timer that `cancel` can clear) → `stop()`.
  4. `transcribe(recorder.uri, key, signal)` → `parseCommand` → `onCommand(cmd)` if not null.
- `cancel()`: clear the timer, `stop()` the recorder if recording, abort the request, clear `listening`. It is also called on unmount.
- Permission: `requestRecordingPermissionsAsync()` once on mount of the session screen, with the result kept in a ref. Denied means `listen()` does nothing.
- All errors are caught and only logged (never the key), and `listening` is cleared.
- Audio mode: with the session mounted, `setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" })`. The root layout's mode is restored on unmount (`allowsRecording: false`). `shouldRouteThroughEarpiece` stays false so playback still uses the speaker.

### Wiring in the session screen
- `useReader` gains an `onFinished` callback, fired when `useAudioPlayerStatus(player).didJustFinish` becomes true. It doesn't fire on `stop()`, because pausing doesn't set `didJustFinish`.
- Session: `useReader({ onFinished: listener.listen })`. The arrival effect calls `listener.listen()` for an empty pillbox.
- `onCommand` maps to the existing `repeat`, `next` and `stop` handlers. Every button handler calls `listener.cancel()` first. So "voice = button" holds by construction.
- Indicator: a 🎤 glyph and "Słucham…" with `Animated.loop` on opacity (`useNativeDriver: true`), rendered only while `listening`, with `aria-live="polite"`.

### Tests
- `command.test.ts`: "Dalej.", "POWTÓRZ", "powtorz", "stop!", "no dalej" (2 words → next), "dalej dalej" (one distinct → next), "dalej stop" → null, "" → null, 4 words → null, "jutro" → null.
- `elevenlabs.test.ts`: `transcribe` sends `model_id`, `language_code`, `keyterms` and the file, returns `text`, and maps 401/429/network like `synthesize`.
- Session screen tests: mock the recorder in `expo-audio` (`prepareToRecordAsync`, `record`, `stop`, `uri`), `requestRecordingPermissionsAsync` and `transcribe`. Use jest fake timers for the 5 s. Cover:
  - `didJustFinish` → listening shown;
  - after 5 s, "dalej" → the next pillbox is read;
  - "stop" → list;
  - "powtórz" → `play` again;
  - unrecognised → still listening off and nothing happened;
  - buttons enabled while listening; each of Powtórz/Dalej/Stop tapped during listening → recorder `stop` called, `transcribe` aborted, and that button's action done; a transcript resolving after the tap is ignored;
  - permission denied → never records;
  - transcribe rejects → no alert.

## Risks / Trade-offs

- [The iOS audio session switch to play-and-record may change playback volume or routing] → keep it to the session screen only; check by hand (5.2).
- [Mic permission in Expo Go] → Expo Go has its own microphone permission. The app's plugin text only applies in a build. Check by hand.
- [Speech-to-text latency of about 1–2 s after the 5 s window] → acceptable. The indicator stays on until the transcript arrives.
- [Background noise or the user's chatter] → only 1–3 word utterances with a single command are acted on.
- [Credits: about 5 s of speech-to-text per pillbox] → noted in the README.
