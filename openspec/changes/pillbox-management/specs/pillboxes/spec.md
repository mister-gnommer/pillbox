# Spec Delta

## Purpose

Lets the user keep an ordered list of freely named pillboxes (for example "Rano", "Pon wieczór") that survives app restarts.

## ADDED Requirements

### Requirement: Pillbox list
The home screen SHALL show all pillboxes in their stored order. When there are none, it SHALL show an empty-state message and a way to add one.

#### Scenario: List in stored order
- **WHEN** pillboxes "Rano" and "Wieczór" exist in that order
- **THEN** the home screen lists "Rano" above "Wieczór"

#### Scenario: Empty list
- **WHEN** no pillboxes exist
- **THEN** the home screen shows an empty-state message and an add action

### Requirement: Create pillbox
The user SHALL be able to create a pillbox by entering a name in a form. The name is required, and surrounding whitespace is trimmed. A new pillbox is appended at the end of the list.

#### Scenario: Create with a name
- **WHEN** the user adds a pillbox named "Rano"
- **THEN** "Rano" appears last in the list with no medications

#### Scenario: Empty name rejected
- **WHEN** the name field is empty or whitespace only
- **THEN** the form cannot be saved

### Requirement: Rename pillbox
The user SHALL be able to rename a pillbox through the same form, prefilled with the current name. The same validation applies.

#### Scenario: Rename
- **WHEN** the user renames "Rano" to "Rano – pon"
- **THEN** the list shows "Rano – pon" in the same position

### Requirement: Delete pillbox
The user SHALL be able to delete a pillbox after confirming a "Na pewno?" prompt. Deleting a pillbox deletes its medications.

#### Scenario: Confirmed delete
- **WHEN** the user deletes "Rano" and confirms
- **THEN** "Rano" and its medications are removed

#### Scenario: Cancelled delete
- **WHEN** the user deletes "Rano" and cancels the prompt
- **THEN** nothing changes

### Requirement: Reorder pillboxes
The user SHALL be able to move a pillbox one position up or down. Moving up is unavailable for the first pillbox, and moving down for the last.

#### Scenario: Move down
- **WHEN** the list is "A, B, C" and the user moves "A" down
- **THEN** the list is "B, A, C"

#### Scenario: Edges disabled
- **WHEN** the list is shown
- **THEN** the up action of the first pillbox and the down action of the last are disabled

### Requirement: Persistence
All pillboxes and their medications SHALL be stored on the device and restored, unchanged and in order, when the app starts again.

#### Scenario: Survives restart
- **WHEN** the user creates pillboxes and medications and restarts the app
- **THEN** the same pillboxes and medications appear in the same order
