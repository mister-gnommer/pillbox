# Proposal

## Why

The point of the app is filling pillboxes with your hands full. `reading-session` still needs a tap for every repeat, next or stop. This change lets the user say the command instead, using ElevenLabs speech-to-text, the same provider and key as the reading.

## What Changes

- In a session, after a pillbox finishes reading (or on arriving at an empty one), the app listens for 5 seconds, with a pulsing microphone icon and the text "Słucham…".
- The recording goes to ElevenLabs speech-to-text (Polish, biased towards the three command words). The transcript is matched to a command:
  - "powtórz" → Powtórz
  - "dalej" → Dalej
  - "stop" → Stop (idle, so the session ends)
- An utterance of 1–3 words that contains exactly one command runs it. Anything else (silence, other words, two commands) does nothing; the buttons still work.
- Tapping any button while listening cancels the listening and does what the button does.
- The microphone permission is requested when a session starts. If it's denied, the session works with buttons only, and no error is shown.
- Errors while listening (network, key, quota) are silent: no alert, back to buttons. A hands-free flow must not block on a dialog.

Out of scope: continuous or wake-word listening, listening during playback (the mic would hear the reading), listening outside sessions, more commands.

## Capabilities

### New Capabilities

- `voice-commands`: spoken Repeat/Next/Stop in a reading session.

### Modified Capabilities

None. The `reading-session` button behaviour is unchanged; voice triggers the same actions.

## Impact

- `app.json`: turn the microphone back on in the `expo-audio` plugin (a Polish `microphonePermission` text, `recordAudioAndroid: true`).
- New: `transcribe()` in `src/features/reading/elevenlabs.ts`, `src/features/voice/command.ts`, `src/features/voice/useListener.ts`.
- Edits: `useReader` gets an `onFinished` callback, and the session screen gets the listening wiring and indicator.
- Credits: one speech-to-text call (about 5 s of audio) per pillbox.
