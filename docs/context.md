# Context

## Grilling ledger

Decision record from the planning interview.

- ✅ = final answer explicitly chosen by the user.
- ◐ = final outcome derived from a conditional answer or accepted follow-up.
- ↪ = an earlier answer that was later corrected or superseded.

### Round 0 — Setup & platform

#### Q1 — Expo template

- ✅ **A — default (TypeScript + expo-router).**
- B — blank-typescript.

#### Q2 — Session buttons

- ✅ **A — Repeat / Next / Stop.** Next on the last pillbox ends the session. (Refined semantics in Round 3 Q18 and Q20.)
- B — Repeat / Next / Finish.
- C — Repeat / Finish / Exit.

#### Q3 — Storage

- ✅ **A — API key in SecureStore, data in AsyncStorage.** SecureStore may reject values over ~2 KB on iOS and has no web support.
- B — everything in SecureStore.
- C — SecureStore split per pillbox.

#### Q4 — Platform

- A — Android / Expo Go.
- B — iOS / Expo Go.
- ✅ **C — both, test on one.** Web not supported.

#### Q5 — Git

- ✅ **Commit and push directly to main, one commit per approved OpenSpec step (propose / apply / sync / archive).**

### Round 1 — Core scope

#### Q1 — Medication fields

- A — name only.
- ✅ **B — name + amount, free text.** Fixed form list deferred.
- C — plus optional note.
- D — structured form / mg / count.

#### Q2 — Recording granularity

- ✅ **A — one recording per whole pillbox.**
- B — one per medication.

#### Q3 — Slow reading

- ✅ **A — ElevenLabs speed ≈0.8 + pauses in text.**
- B — normal speed + long pauses.
- C — user-chosen speed (deferred).

#### Q4 — Model and voice

- ✅ **A — `eleven_multilingual_v2` + hardcoded premade voice.**
- B — `eleven_flash_v2_5`.
- C — user-chosen voice.

#### Q5 — Session start

- A — always the first pillbox.
- ✅ **B — any pillbox, Next continues down the list.**
- C — selected pillbox only.

#### Q6 — Auto-play and empty pillboxes

- ✅ **Yes to both: auto-play on entering a pillbox, and skip empty pillboxes.** (Open question; recorded as worded.)
- ↪ The "skip empty pillboxes" part is superseded by Round 3 Q17. Auto-play stays.

#### Q7 — Reorder UX

- ✅ **A — ↑/↓ buttons.**
- B — drag-and-drop library.

#### Q8 — TTS failure

- ✅ **A — Polish alert with the error + Retry, no fallback.** On-device fallback deferred.
- B — fallback to `expo-speech`.

#### Q9 — Tests

- A — none.
- B — `jest-expo` for the script builder only.
- ✅ **C — broader, including store and screens.**

### Round 2 — Details

#### Q10 — Test scope

- ✅ **A — units (script builder, store) + RNTL screen tests for pillbox/medication CRUD and a session flow, with ElevenLabs and audio mocked.**
- B — units + CRUD only.
- C — units only.

#### Q11 — Spoken script

- ✅ **"Pudełko: Rano. Trzy leki." then per medication "Pierwszy: Metformina, jedna tabletka." with a pause between medications. Ordinals up to ~10, then numbers.**

#### Q12 — Repeat

- ✅ **Yes: Repeat replays the already downloaded file, no new request (session-scoped cache only).**

#### Q13 — End of session

- A — "Gotowe ✓" screen.
- B — screen + spoken summary.
- ✅ **C — return straight to the list.** Success screen deferred.

#### Q14 — API key entry

- ✅ **A — settings screen via header gear; starting a session without a key shows an alert linking to settings.**
- B — blocking onboarding.

#### Q15 — Add/edit UI

- ✅ **A — modal form route, same pattern for pillbox (name) and medication (name, amount).**
- B — inline row editing.

### Round 3 — Open questions & change split

#### Q16 — Delete confirmation

- ✅ **Always, simplest "Na pewno?" (Yes/No), for pillboxes and medications.**

#### Q17 — Empty pillbox

- A — skip empties on Next, warn only when a session starts on one.
- ✅ **B — no skipping. Next lands on the empty pillbox and shows a warning "Brak leków w tym pudełku" instead of reading.** Chosen as less code.
- C — other.

#### Q18 — Stop semantics

- ✅ **Stop during playback stops the audio (not pause), keeps the downloaded file, the session and the pillbox screen.**
- ✅ **Stop when nothing is playing ends the session.** Where it returns to:
  - ✅ **A — the pillbox list.**
  - B — the screen the session started from.

#### Q19 — Repeat

- ✅ **Rereads from the beginning immediately, whether playing or stopped (replays the downloaded file).**

#### Q20 — Next

- ✅ **Cuts the current audio and jumps to the next pillbox, no confirmation. Works playing or stopped.**
- ✅ **On the last pillbox, returns to the list. A session started on the last pillbox treats it as last.**

#### Q21 — Session entry point

- A — ▶ on each list row.
- B — Start on the pillbox detail screen.
- ✅ **C — both.**

#### Q22 — Validation

- ✅ **Name required, amount optional (the script omits the amount when empty).**

#### Q23 — Loading

- ✅ **Basic spinner while the recording downloads.** Nicer loading UI deferred (Design).

#### Q24 — Backgrounded or locked

- ✅ **Keep playing.**

#### Q25 — Offline / network / other failures

- ✅ **Same Polish alert + Retry as other TTS errors.**

#### Q26 — Buttons vs voice

- ✅ **A — buttons are the v1 control and work during playback. Voice is the intended primary interface later.**
- Note for the deferred voice-commands change: the mic would pick up the playback, so voice commands likely only work after reading ends. No v1 change.

#### Q27 — Change split

- A — 2 changes (management; reading-session).
- ✅ **B — 3 OpenSpec changes.** Change 2 bundled all the integration risk. Splitting lands every hard assessment constraint in 2a, and 2b becomes the first cut if time runs out.

## Draft specification

Rough product-level spec to seed OpenSpec later. Not OpenSpec format.

### Pillboxes

- List screen shows all pillboxes in stored order.
- Add and rename through a modal form with one field: name (free text, e.g. "Rano").
- Name is required.
- Delete a pillbox (its medications go with it) after a "Na pewno?" (Yes/No) confirmation.
- Reorder with ↑/↓ buttons; first ↑ and last ↓ are disabled.
- Tapping a pillbox opens its medications.
- Each list row has a ▶ button that starts a session from that pillbox.

### Medications

- Live inside a pillbox, in insertion order.
- Fields: name (required) and amount (optional), both free text (e.g. "Metformina", "1 tabletka", "½").
- Add and edit through a modal form; delete from the pillbox screen after a "Na pewno?" (Yes/No) confirmation.
- The pillbox screen has a Start button that starts a session from that pillbox.

### Reading

- Script for a pillbox: `Pudełko: <name>. <N> leków.` then, per medication, `<Ordinal>: <name>, <amount>.` with a pause between medications. The amount is omitted when empty.
  - Example: "Pudełko: Rano. Trzy leki. Pierwszy: Metformina, jedna tabletka. …"
  - Ordinals ("Pierwszy", "Drugi", …) up to ~10, then plain numbers.
  - Polish plural agreement for the count ("Jeden lek", "Trzy leki", "Pięć leków").
- One ElevenLabs text-to-speech request per pillbox.
  - Model `eleven_multilingual_v2`, hardcoded premade voice, speed ≈0.8.
  - API key sent from the stored settings value.
- Audio is downloaded once and played from the local file.
- A basic spinner shows while the recording downloads.
- An empty pillbox is not read: a warning "Brak leków w tym pudełku" is shown instead.

### Session

- Start from the list (▶ on a row) or from a pillbox screen (Start); the session continues down the list from there.
- Entering a pillbox auto-plays its reading. Empty pillboxes are not skipped; they show the warning instead.
- Three large icon buttons, usable during playback:
  - Repeat: reread from the beginning immediately, playing or stopped. Replays the downloaded file, no new request.
  - Next: cut the current audio and jump to the next pillbox, no confirmation, playing or stopped. On the last pillbox, return to the list. A session started on the last pillbox treats it as last.
  - Stop: during playback, stop the audio (not pause); the downloaded file, the session and the pillbox screen stay. When nothing is playing, end the session and return to the pillbox list.
- Playback continues when the app is backgrounded or the screen is locked.
- Downloaded audio is session-scoped only; nothing is kept across sessions.

### Settings / API key

- Settings screen reached via a gear icon in the header.
- One field for the ElevenLabs API key, stored in SecureStore.
- Starting a session without a key shows an alert with a link to settings, e.g. "Brak klucza API ElevenLabs" / "Przejdź do ustawień".

### Errors

- ElevenLabs request or playback failure shows a Polish alert with the error message and a Retry action, e.g. "Nie udało się odczytać pudełka" / "Spróbuj ponownie".
- Offline, network and other failures use the same alert and Retry.
- No on-device fallback.

### Persistence

- React Context as the global store.
- Pillbox and medication data in AsyncStorage, loaded on start and saved on change.
- API key in SecureStore only.

### Tests

- Unit tests: script builder, store.
- React Native Testing Library screen tests: pillbox CRUD, medication CRUD, a session flow.
- ElevenLabs and audio playback are mocked.

### Out of scope

- Voice commands ("powtórz", "dalej", "stop").
- Audio caching across sessions.
- Fixed list for medication form (tabletka, kapsułka, …).
- User-adjustable reading speed and user-chosen voice.
- On-device speech fallback (`expo-speech`).
- "Gotowe ✓" success screen or spoken summary at session end.
- Nicer loading UI (animation or progress bar) instead of the basic spinner.
- Web support, drag-and-drop reorder, onboarding flow, medication notes or structured dosage.

### Open questions

None currently.

### Implementation plan — OpenSpec changes

1. `pillbox-management`
   - Context store persisted to AsyncStorage.
   - Pillbox CRUD + ↑/↓ reorder; medication CRUD.
   - Shared modal form, delete confirmation, validation.
   - `jest-expo` + React Native Testing Library setup; store + CRUD tests.
2. `pillbox-reading`
   - Settings screen (gear in header) with the ElevenLabs API key in SecureStore; missing-key alert.
   - Script builder (ordinals, Polish plural, optional amount).
   - ElevenLabs TTS request (`eleven_multilingual_v2`, hardcoded voice, speed ≈0.8), download to file, playback.
   - A "Czytaj" button on a single pillbox; spinner; error alert + Retry; empty-pillbox warning.
   - Script-builder unit tests + mocked request test.
   - Alone this meets all hard assessment constraints.
3. `reading-session`
   - Session across pillboxes from either entry point; auto-play.
   - Repeat/Next/Stop semantics (Q18–Q20); background playback.
   - Session flow test with ElevenLabs and audio mocked.
   - First cut if time runs out.
