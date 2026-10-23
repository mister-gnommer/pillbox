# Design

## Context

Builds on `pillbox-management`: `Pillbox { id, name, medications: Medication[] }` and `Medication { id, name, amount }` (amount `""` = none) from `usePillboxes()`. Routes are `/`, `/pillbox/[id]` and two modal forms. Tests use jest-expo, RNTL and `renderRouter`. The Expo SDK is 58. Facts below were checked against current Expo and ElevenLabs docs.

## Goals / Non-Goals

**Goals:** one working AI round-trip with the fewest moving parts. The HTTP client and the script builder are isolated so tests can mock or unit-test them.

**Non-Goals:** a reusable player abstraction or session state (`reading-session` will extract what it needs from this screen), streaming playback, persistent cache, background audio config.

## Decisions

### Files
| File | Contents |
|---|---|
| `src/features/reading/script.ts` | `buildScript(pillbox): string`, a pure function |
| `src/features/reading/elevenlabs.ts` | `synthesize(text, apiKey): Promise<string>`, which returns a local file URI and throws `Error` with a Polish reason |
| `src/features/settings/apiKey.ts` | `getApiKey`, `saveApiKey`, `clearApiKey` over SecureStore, key name `elevenlabs-api-key` |
| `src/app/settings.tsx` | the settings screen |
| `src/app/pillbox/[id].tsx` | adds the Czytaj/Zatrzymaj button and its state, inline |

The playback flow stays inline in the pillbox screen. A hook would be premature with one caller; `reading-session` extracts it once there's a second.

### Script format
- `Pudełko: Rano. Liczba leków: 2.` followed by `Pierwszy: Metformina, 1 tabletka.`, with ` <break time="1.5s" /> ` between medications.
  - Break tags are supported by `eleven_multilingual_v2`, max 3 s. The docs warn that many breaks can cause artifacts; one per medication is fine.
- Ordinal words for 1–10 (Pierwszy … Dziesiąty), then `Lek 11:`.
- Numbers stay as digits. ElevenLabs normalizes them to Polish words, which saves writing a Polish numeral speller. `shortcut: relies on TTS number normalization, spell out in code if it mispronounces.`
- The count is said as "Liczba leków: n", which is grammatical for any n, so no plural logic is needed. Proper agreement ("3 leki") is deferred.

### ElevenLabs request
- `POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}?output_format=mp3_44100_64`, with headers `xi-api-key` and `Content-Type: application/json`.
- The body is `{ text, model_id: "eleven_multilingual_v2", voice_settings: { speed: 0.8 } }`.
- The voice is a hardcoded premade voice (`JBFqnCBsd6RMkjVDRZzb`, the one in the docs' examples). Premade voices are usable on the free tier through the API.
- The request uses `fetch` from `expo/fetch` (WinterCG-compliant, reliable `arrayBuffer()`). The bytes go to `new File(Paths.cache, "reading-<timestamp>.mp3")` via `await file.write(await response.bytes())` (`expo-file-system`; `write` is async in SDK 58), which returns `file.uri`.
  - Rejected: `File.downloadFileAsync`, which is GET-only, and a data URI to the player, whose support varies by platform.
- Errors map to short reasons:
  - 401 → "Nieprawidłowy klucz API"
  - 429 or a `quota_exceeded` detail → "Limit ElevenLabs wyczerpany"
  - a fetch rejection → "Brak połączenia z internetem"
  - anything else → `Błąd ElevenLabs (<status>)`
- The key is never logged.

### Playback
- `useAudioPlayer(null)` from `expo-audio` on the pillbox screen. On read: `player.replace({ uri })`, `seekTo(0)`, `play()`. The hook releases the player on unmount, so leaving the screen stops audio.
- `useAudioPlayerStatus(player).playing` drives the Czytaj/Zatrzymaj label. Zatrzymaj calls `pause()` + `seekTo(0)`, so the next Czytaj starts over.
- `setAudioModeAsync({ playsInSilentMode: true })` is called once in the root layout. Otherwise the iOS silent switch would mute the reading.
- Replay cache: the screen keeps `{ script, uri }` in state. If the current `buildScript` equals the cached script, it replays; otherwise it synthesizes again. Files are left in the cache directory for the OS to purge. `shortcut: no cleanup of cache mp3s; add when caching across sessions lands.`

### Flow on "Czytaj"
1. If there are no medications, show the alert "Brak leków w tym pudełku" and stop.
2. Call `getApiKey()`. If it returns null, show the alert "Brak klucza API ElevenLabs" with [Anuluj, Przejdź do ustawień → `router.push("/settings")`].
3. Set `loading` (ActivityIndicator in place of the button). Then call `synthesize` or reuse the cached URI, and play.
4. On failure, show the alert "Nie udało się odczytać pudełka" with the reason and [Anuluj, Spróbuj ponownie → step 1].

### Settings screen
A masked TextInput (`secureTextEntry`) with Zapisz, plus Usuń klucz when one is saved. Status line: "Klucz zapisany (…abcd)" showing the last 4 characters, or "Brak klucza". The gear (`⚙` glyph, consistent with the text glyphs from change 1) goes in the home screen's `headerRight`.

### Tests
- `script.test.ts`: the count line, ordinals, `Lek 11:`, the amount omitted, breaks only between medications.
- `elevenlabs.test.ts`: mock `expo/fetch` and `expo-file-system`. Assert the URL, headers and body, that the file is written and its URI returned, and that 401, 429 and network failures produce the Polish reasons.
- Pillbox screen test: `jest.mock` `expo-audio`, `../features/reading/elevenlabs` and `expo-secure-store`. Cover:
  - empty → warning
  - no key → alert, then the action navigates to `/settings`
  - success → `play` called
  - second tap → no second `synthesize`
  - failure → Retry calls `synthesize` again
- Settings screen test: save → `setItemAsync` called with the trimmed key; clear → `deleteItemAsync`.

## Risks / Trade-offs

- [Polish pronunciation of drug names or "½"] → user-entered free text; acceptable. Noted for the README.
- [The hardcoded voice is unavailable for an account] → shows up as an ElevenLabs error alert. Making the voice selectable is deferred.
- [`expo/fetch` or `File.write` API drift in SDK 58] → apply verifies against the v58 docs. Fall back to global `fetch` + `blob` if needed.
- [Latency of 2–5 s for a long pillbox] → the spinner covers it. Streaming is deferred.
- [The API key lives in the device keychain/keystore] → a single-user device app; acceptable. It is never sent anywhere except ElevenLabs.
