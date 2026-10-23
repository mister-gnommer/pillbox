# Spec Delta

## Purpose

Holds user-provided configuration, starting with the user's own ElevenLabs API key, kept securely on the device.

## ADDED Requirements

### Requirement: Open settings
The home screen header SHALL have a gear action that opens the settings screen.

#### Scenario: Open
- **WHEN** the user taps the gear on the home screen
- **THEN** the settings screen opens

### Requirement: Save API key
The settings screen SHALL let the user enter and save an ElevenLabs API key. The key is trimmed and stored in the device's secure storage. The input is masked, and a saved key is never shown in full.

#### Scenario: Save
- **WHEN** the user enters a key and saves
- **THEN** the key is stored securely and the screen shows that a key is saved

#### Scenario: Survives restart
- **WHEN** a key was saved and the app restarts
- **THEN** reading uses the saved key without asking again

### Requirement: Replace or clear API key
The user SHALL be able to replace the saved key by saving a new one, and to remove it.

#### Scenario: Clear
- **WHEN** the user removes the key
- **THEN** no key is stored and reading shows the missing-key alert
