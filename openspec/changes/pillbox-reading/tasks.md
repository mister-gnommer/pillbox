# Tasks

## 1. Setup

- [x] 1.1 Install `expo-audio`, `expo-file-system` and `expo-secure-store` with `npx expo install`, then pin exact versions. Verify `npx expo-doctor` passes.
- [x] 1.2 In `src/app/_layout.tsx`, call `setAudioModeAsync({ playsInSilentMode: true })` once on mount and add the `settings` route to the Stack (title "Ustawienia"). Verify `npx tsc --noEmit` passes.

## 2. Settings and API key

- [x] 2.1 Create `src/features/settings/apiKey.ts` (get/save trimmed/clear over SecureStore, key `elevenlabs-api-key`) and `src/app/settings.tsx` (masked input, Zapisz, Usuń klucz, status with the last 4 chars). Add the ⚙ `headerRight` on the home screen. Verify by screen test: save stores the trimmed key, clear deletes it, the status line updates, and the gear navigates to `/settings`.

## 3. Script builder

- [x] 3.1 Create `src/features/reading/script.ts` with `buildScript(pillbox)` per design.md. Verify unit tests cover the count line, ordinals 1–10, `Lek 11:`, the amount omitted when empty, and breaks only between medications.

## 4. ElevenLabs client

- [x] 4.1 Create `src/features/reading/elevenlabs.ts` with `synthesize(text, apiKey)`: an `expo/fetch` POST, bytes written to a cache file, the URI returned, and errors mapped to Polish reasons. Check the `expo/fetch` and `File` APIs against the SDK 58 docs first. Verify unit tests (mocked fetch and file system) cover the request shape, the success path, and 401, 429 and network errors.

## 5. Read button on the pillbox screen

- [x] 5.1 Add Czytaj/Zatrzymaj to `src/app/pillbox/[id].tsx`: the empty warning, the missing-key alert with a link to settings, a spinner while loading, `useAudioPlayer` playback, replay when the script is unchanged, the failure alert with Retry. Verify by screen test (mocked `expo-audio`, `elevenlabs`, `expo-secure-store`): empty → warning; no key → alert → `/settings`; success → play; second tap → no new `synthesize`; failure → Retry re-calls it.

## 6. Integration check

- [x] 6.1 Run `npx tsc --noEmit`, `npm run lint`, `npm test` and `npx expo-doctor`; all pass.
- [x] 6.2 Manually in Expo Go with a real key: read a 2–3 medication pillbox and check that the Polish speech is slow and has pauses; check that Zatrzymaj stops it; turn on airplane mode and check the alert and Retry; enter a wrong key and check the invalid-key alert.

## Workflow follow-up

- Commit the apply step; then sync and archive after user approval, one commit each.
