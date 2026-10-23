# Spec Delta

## Purpose

Guides the user through filling pillboxes one after another: each pillbox is read aloud in turn, controlled by three large Repeat, Next and Stop buttons.

## ADDED Requirements

### Requirement: Start a session
The user SHALL be able to start a session at any pillbox, from a ▶ action on its row in the list or from a "Start" action on its pillbox screen. Starting without a stored API key SHALL show the missing-key alert instead (as in `pillbox-reading`).

#### Scenario: Start from the list
- **WHEN** the user taps ▶ on "Wieczór", the second of three pillboxes
- **THEN** a session opens on "Wieczór"

#### Scenario: Start from the pillbox screen
- **WHEN** the user taps "Start" on the "Rano" screen
- **THEN** a session opens on "Rano"

#### Scenario: No key
- **WHEN** no API key is stored and the user starts a session
- **THEN** the missing-key alert is shown and no session opens

### Requirement: Auto-read on arrival
On arriving at a pillbox that has medications, the session SHALL read it aloud without a tap, using the same script, voice and speed as `pillbox-reading`, and show a spinner while the audio downloads.

#### Scenario: Arrive
- **WHEN** the session opens on, or moves to, a pillbox with medications
- **THEN** a spinner shows, then its script plays automatically

### Requirement: Show the current pillbox's medications
The session screen SHALL list the current pillbox's medications in reading order, numbered, each with its name and amount (if any), so the user can also follow along by looking.

#### Scenario: Medications visible
- **WHEN** the session is on "Rano" with "Metformina" (1 tabletka) and "Witamina D"
- **THEN** the screen lists "1. Metformina" with "1 tabletka" and "2. Witamina D"

### Requirement: Empty pillbox in a session
On arriving at a pillbox with no medications, the session SHALL show "Brak leków w tym pudełku" on screen, SHALL NOT contact ElevenLabs, and SHALL keep the controls usable. Empty pillboxes are not skipped.

#### Scenario: Empty
- **WHEN** the session moves to an empty pillbox
- **THEN** the warning is shown, nothing is requested, and Dalej and Stop still work

### Requirement: Repeat
"Powtórz" SHALL restart the current pillbox's reading from the beginning, whether or not audio is playing, reusing audio already downloaded in this session. If no audio was downloaded (for example after a failure), it SHALL request it.

#### Scenario: Repeat while playing
- **WHEN** audio is playing and the user taps Powtórz
- **THEN** playback restarts from the beginning with no new request

#### Scenario: Repeat after stop
- **WHEN** playback was stopped and the user taps Powtórz
- **THEN** it plays from the beginning with no new request

### Requirement: Next
"Dalej" SHALL stop any current audio, with no confirmation, and move to the next pillbox in list order. On the last pillbox it SHALL end the session and return to the pillbox list. A session started on the last pillbox treats it as the last.

#### Scenario: Next while playing
- **WHEN** "Rano" is playing and the user taps Dalej
- **THEN** the audio stops and the session moves to the next pillbox, which auto-reads

#### Scenario: Next on the last pillbox
- **WHEN** the current pillbox is the last in the list and the user taps Dalej
- **THEN** the session ends and the pillbox list is shown

### Requirement: Stop
"Stop" SHALL behave in two ways. While audio is downloading or playing, it aborts the download or stops playback (the next play starts from the beginning) and stays on the current pillbox. When idle, it ends the session and returns to the pillbox list, regardless of where the session was started.

#### Scenario: Stop while playing
- **WHEN** audio is playing and the user taps Stop
- **THEN** playback stops and the session stays on the same pillbox

#### Scenario: Stop while downloading
- **WHEN** the current pillbox's audio is still downloading and the user taps Stop
- **THEN** the download is aborted, nothing plays, no error is shown, and the session stays on the same pillbox

#### Scenario: Stop while idle
- **WHEN** nothing is downloading or playing and the user taps Stop
- **THEN** the session ends and the pillbox list is shown

### Requirement: Only the current pillbox plays
Audio from a pillbox the user has already moved away from SHALL never play. A download still in progress when the user taps Dalej SHALL be aborted without showing an error.

#### Scenario: Next during download
- **WHEN** a pillbox's audio is still downloading and the user taps Dalej
- **THEN** that download is aborted, no error is shown, and only the new pillbox is read

### Requirement: Background playback
Playback SHALL continue when the app goes to the background or the screen is locked.

#### Scenario: Screen locked
- **WHEN** a pillbox is being read and the user locks the phone
- **THEN** the reading continues to the end

### Requirement: Session errors
A failed read in a session SHALL show the same alert as `pillbox-reading` ("Nie udało się odczytać pudełka", reason, Anuluj / Spróbuj ponownie). Cancelling it SHALL leave the session on the current pillbox with the controls usable.

#### Scenario: Offline in a session
- **WHEN** the network is unavailable on arrival at a pillbox
- **THEN** the alert is shown, and after Anuluj the user can still tap Powtórz, Dalej or Stop
