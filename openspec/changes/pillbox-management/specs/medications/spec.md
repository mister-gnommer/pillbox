# Spec Delta

## Purpose

Lets the user record which medications go into a pillbox, and how much of each, in the order they will be read aloud.

## ADDED Requirements

### Requirement: Medication list
Opening a pillbox SHALL show its medications in the order they were added, each with its name and its amount (if any).

#### Scenario: Insertion order
- **WHEN** "Metformina" then "Witamina D" are added to a pillbox
- **THEN** the pillbox screen lists "Metformina" above "Witamina D"

#### Scenario: Empty pillbox
- **WHEN** a pillbox has no medications
- **THEN** its screen shows an empty-state message and an add action

### Requirement: Add medication
The user SHALL be able to add a medication with a required name and an optional amount, both free text and trimmed. It is appended at the end of the pillbox's list.

#### Scenario: Name and amount
- **WHEN** the user adds "Metformina" with amount "1 tabletka"
- **THEN** it appears last, showing "Metformina" and "1 tabletka"

#### Scenario: Amount omitted
- **WHEN** the user adds "Witamina D" with an empty amount
- **THEN** it is saved with no amount

#### Scenario: Empty name rejected
- **WHEN** the name field is empty or whitespace only
- **THEN** the form cannot be saved

### Requirement: Edit medication
The user SHALL be able to edit a medication's name and amount through the same form, prefilled. The same validation applies, and the medication keeps its position.

#### Scenario: Edit amount
- **WHEN** the user changes the amount of "Metformina" to "½ tabletki"
- **THEN** the list shows the new amount in the same position

### Requirement: Delete medication
The user SHALL be able to delete a medication after confirming a "Na pewno?" prompt.

#### Scenario: Confirmed delete
- **WHEN** the user deletes "Metformina" and confirms
- **THEN** it is removed and the order of the others is unchanged

#### Scenario: Cancelled delete
- **WHEN** the user cancels the prompt
- **THEN** nothing changes
