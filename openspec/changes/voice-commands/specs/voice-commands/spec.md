# Spec Delta

## Purpose

Lets the user control a reading session by saying "powtórz", "dalej" or "stop", so a pillbox can be filled without touching the phone.

## ADDED Requirements

### Requirement: Listen after reading
In a session, the app SHALL listen for 5 seconds after a pillbox's reading finishes playing to the end, and on arriving at an empty pillbox. While listening it SHALL show a pulsing microphone indicator with the text "Słucham…". It SHALL NOT listen during playback or download.

#### Scenario: Reading finished
- **WHEN** a pillbox's reading plays to the end
- **THEN** the indicator appears and the app listens for 5 seconds

#### Scenario: Stopped, not finished
- **WHEN** the user stops playback with Stop
- **THEN** the app does not start listening

### Requirement: Recognise a command
The recording SHALL be transcribed with ElevenLabs speech-to-text in Polish, using the user's key. A transcript of 1–3 words containing exactly one of "powtórz", "dalej" or "stop" SHALL trigger that command, matched without regard to case, punctuation or Polish diacritics. Any other transcript SHALL do nothing.

#### Scenario: Next by voice
- **WHEN** the user says "Dalej." while listening
- **THEN** the session moves to the next pillbox exactly as if Dalej were tapped

#### Scenario: Without diacritics
- **WHEN** the transcript is "powtorz"
- **THEN** the current pillbox is read again

#### Scenario: Stop by voice
- **WHEN** the user says "stop" while listening
- **THEN** the session ends and the pillbox list is shown

#### Scenario: Not a command
- **WHEN** the transcript is empty, has more than 3 words, has no command, or has two different commands
- **THEN** nothing happens and the buttons still work

### Requirement: Buttons override listening
Powtórz, Dalej and Stop SHALL stay enabled while listening (recording or transcribing). Tapping one SHALL cancel the listening, so no transcript from that window is acted on, and then perform the button's normal action. Nothing is playing while listening, so Stop ends the session.

#### Scenario: Dalej during listening
- **WHEN** the app is listening and the user taps Dalej
- **THEN** listening stops, any pending transcription is discarded, and the session moves to the next pillbox

#### Scenario: Powtórz during listening
- **WHEN** the app is listening and the user taps Powtórz
- **THEN** listening stops and the current pillbox is read again from the start

#### Scenario: Stop during listening
- **WHEN** the app is listening and the user taps Stop
- **THEN** listening stops and the session ends on the pillbox list

#### Scenario: Late transcript after a tap
- **WHEN** the user taps a button while a transcription is in progress, and the transcript "dalej" arrives afterwards
- **THEN** only the button's action happens; the transcript is ignored

### Requirement: Microphone permission
The app SHALL request microphone permission when a session starts. If permission is denied, the session SHALL work with buttons only and SHALL NOT show an error or the listening indicator.

#### Scenario: Denied
- **WHEN** the user denies microphone access
- **THEN** readings finish without listening, and the buttons work

### Requirement: Silent listening failures
A recording or transcription failure (network, key, quota, unexpected response) SHALL end listening without an alert, leaving the buttons usable.

#### Scenario: Offline while listening
- **WHEN** transcription fails because the network is down
- **THEN** the indicator disappears, no alert is shown, and the buttons work
