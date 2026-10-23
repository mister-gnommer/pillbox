# Proposal

## Why

Voice is the point of the app and the assessment's hard requirement: a pillbox's contents must be read aloud by an external AI service (ElevenLabs) using the user's own API key. This change delivers that end to end for a single pillbox, building on `pillbox-management`. Sessions across pillboxes come later (`reading-session`).

## What Changes

- Settings screen (gear in the home header) to enter, replace or clear the ElevenLabs API key, stored securely on the device.
- "Czytaj" button on the pillbox screen. It builds a Polish script from the pillbox's medications, sends it to ElevenLabs text-to-speech, downloads the audio to a file and plays it slowly.
  - Tapping it again on the same, unchanged pillbox replays the downloaded file without a new request.
  - While playing, the button stops playback.
- Spinner while the audio downloads.
- An empty pillbox shows "Brak leków w tym pudełku" instead of reading.
- No key → alert linking to settings. Any request or playback failure (offline, bad key, quota) → Polish alert with Retry.

Out of scope: sessions, Repeat/Next/Stop semantics and background playback (`reading-session`); caching across screens or app restarts; voice/speed choice; on-device TTS fallback.

## Capabilities

### New Capabilities

- `pillbox-reading`: turning a pillbox into a spoken Polish script and playing it via ElevenLabs.
- `settings`: user-provided configuration, starting with the ElevenLabs API key.

### Modified Capabilities

None. `pillboxes` and `medications` (from `pillbox-management`) are read, not changed.

## Impact

- New dependencies (all in Expo Go): `expo-audio`, `expo-file-system`, `expo-secure-store`, plus `expo-asset` (a peer dependency of `expo-audio`).
- New code: `src/features/reading/`, `src/features/settings/`, route `src/app/settings.tsx`. Edits to `src/app/pillbox/[id].tsx` (button) and `src/app/index.tsx` (header gear).
- External: HTTPS calls to `api.elevenlabs.io` with the user's key; consumes the user's ElevenLabs credits (~1 credit per character).
