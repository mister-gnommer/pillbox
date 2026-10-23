# Spec Delta

## Purpose

Reads a pillbox's contents aloud in Polish, slowly, through ElevenLabs text-to-speech, so the user can fill it without looking at the screen.

## ADDED Requirements

### Requirement: Spoken script
The system SHALL build a Polish script for a pillbox: `Pudełko: <name>.`, then `Liczba leków: <n>.`, then one line per medication in stored order with an ordinal, the name and the amount (omitted when empty). There SHALL be a pause between medications.

#### Scenario: Script with amounts
- **WHEN** pillbox "Rano" has "Metformina" (amount "1 tabletka") and "Witamina D" (no amount)
- **THEN** the script reads "Pudełko: Rano. Liczba leków: 2." then "Pierwszy: Metformina, 1 tabletka." then a pause, then "Drugi: Witamina D."

#### Scenario: More than ten medications
- **WHEN** a pillbox has an 11th medication
- **THEN** it is introduced as "Lek 11:" instead of an ordinal word

### Requirement: Read a pillbox aloud
The pillbox screen SHALL have a "Czytaj" action. It sends the script to ElevenLabs using the stored API key and plays the returned audio at a slowed speed, showing a spinner until playback starts.

#### Scenario: Successful read
- **WHEN** a key is stored, the pillbox has medications and the user taps "Czytaj"
- **THEN** a spinner shows, then the script is played aloud

#### Scenario: Plays in silent mode
- **WHEN** the iPhone's silent switch is on
- **THEN** the reading is still audible

### Requirement: Replay without a new request
Tapping "Czytaj" again on the same screen for an unchanged pillbox SHALL replay the downloaded audio from the beginning without contacting ElevenLabs. A changed script SHALL trigger a new request.

#### Scenario: Replay
- **WHEN** the pillbox was read once and the user taps "Czytaj" again
- **THEN** it plays from the start and no new request is sent

#### Scenario: Pillbox edited
- **WHEN** a medication was added since the last read
- **THEN** "Czytaj" sends a new request

### Requirement: Stop reading
While audio is playing, the "Czytaj" action SHALL become a stop action that ends playback. Leaving the pillbox screen SHALL also stop playback.

#### Scenario: Stop
- **WHEN** audio is playing and the user taps the stop action
- **THEN** playback stops and the "Czytaj" action returns

### Requirement: Empty pillbox
Reading a pillbox with no medications SHALL NOT contact ElevenLabs. It SHALL show the warning "Brak leków w tym pudełku".

#### Scenario: Empty
- **WHEN** the user taps "Czytaj" on an empty pillbox
- **THEN** the warning is shown and no request is sent

### Requirement: Missing API key
Reading without a stored API key SHALL NOT contact ElevenLabs. It SHALL show the alert "Brak klucza API ElevenLabs" with an action that opens settings.

#### Scenario: No key
- **WHEN** no key is stored and the user taps "Czytaj"
- **THEN** the alert appears, and its action opens the settings screen

### Requirement: Reading failure
Any failure (no network, rejected key, exhausted quota, unexpected response, playback error) SHALL show the alert "Nie udało się odczytać pudełka" with a short reason and the actions "Anuluj" and "Spróbuj ponownie". Retry repeats the read.

#### Scenario: Invalid key
- **WHEN** ElevenLabs rejects the key
- **THEN** the alert says the API key is invalid and offers Retry

#### Scenario: Offline
- **WHEN** the device has no network
- **THEN** the same alert appears with a connection reason, and Retry tries again
