# Tasks

## 1. Speech-to-text and parser

- [x] 1.1 Add `transcribe(uri, apiKey, signal?)` to `src/features/reading/elevenlabs.ts`, sharing the error mapping with `synthesize`. Check `FormData` + file upload with `expo/fetch` and the `keyterms` multipart shape against the SDK 58 and ElevenLabs docs first. Verify by unit tests: the form fields, the returned text, and 401/429/network errors.
- [x] 1.2 Create `src/features/voice/command.ts` with `parseCommand`. Verify with unit tests for every case listed in design.md.

## 2. Microphone and listener

- [x] 2.1 Turn the microphone back on in `app.json` (the `expo-audio` plugin: `microphonePermission` "Pillbox słucha komend głosowych: powtórz, dalej, stop.", `recordAudioAndroid: true`, keeping `enableBackgroundPlayback`). Verify `npx expo-doctor` passes.
- [x] 2.2 Create `src/features/voice/useListener.ts` per design.md (permission ref, 5 s timer, recorder, `transcribe` with abort, `cancel`, cleanup on unmount, silent errors). Verified through the session tests in 3.1.

## 3. Session wiring

- [x] 3.1 Return `finishes` from `useReader`, a counter of `playbackStatusUpdate` events with `didJustFinish`. In `src/app/session.tsx`:
  - request the permission on mount;
  - set the session audio mode with `allowsRecording`, and restore it on unmount;
  - call `listen()` on finish and on arrival at an empty pillbox;
  - map `onCommand` to the existing handlers;
  - cancel listening in every button handler;
  - render the pulsing "🎤 Słucham…" indicator.

  Verify by screen tests (fake timers) for each scenario in design.md, and confirm each guard's test fails when the guard is removed.

## 4. Integration check

- [x] 4.1 Run `npx tsc --noEmit`, `npm run lint`, `npm test` and `npx expo-doctor`; all pass.
- [x] 4.2 Manually in Expo Go with a real key, in a session of 2–3 pillboxes:
  - allow the microphone;
  - after a reading, say "dalej" and check it moves on;
  - say "powtórz" and check it rereads;
  - say something else and check nothing happens;
  - say "stop" and check it returns to the list;
  - tap during listening and check it cancels.

## Workflow follow-up

- Commit the apply step; then sync and archive after user approval, one commit each.
