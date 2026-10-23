# Tasks

## 1. Setup

- [ ] 1.1 Install AsyncStorage with `npx expo install @react-native-async-storage/async-storage`, then pin the exact version. Verify `npx expo-doctor` passes.
- [ ] 1.2 Install `jest-expo`, `jest`, `@testing-library/react-native` and `@types/jest` as devDependencies with `npx expo install … -- --save-dev`, pinned exactly. Add the `test` script and the `jest-expo` preset, plus the AsyncStorage jest mock in a setup file. Verify `npx jest --listTests` runs without config errors.

## 2. Store and persistence

- [ ] 2.1 Create `src/features/pillboxes/store.tsx` with the types, the reducer (all actions in design.md, trimming, ignoring empty names) and `PillboxesProvider`/`usePillboxes`. Verify `npx tsc --noEmit` passes.
- [ ] 2.2 Write reducer unit tests covering: add/rename/delete pillbox, move with edges as no-ops, add/update/delete medication, empty amount kept as "", whitespace name rejected. Verify `npm test` passes.
- [ ] 2.3 Add persistence (hydrate on mount, save after `ready` only, `pillbox:v1` key, corrupt JSON → empty) and a test that seeds the mocked storage, renders the provider, mutates and asserts the stored JSON. Verify `npm test` passes.

## 3. Pillbox screens

- [ ] 3.1 Replace `src/app/_layout.tsx`: provider around a `Stack`, both form routes presented as modals, Polish titles. Verify the app boots in Expo Go with no errors.
- [ ] 3.2 Build `src/app/index.tsx` (list, empty state, add button, row tap → `/pillbox/[id]`, ↑/↓ with disabled edges, rename ✎, delete 🗑 with "Na pewno?") and `src/app/pillbox-form.tsx`. Verify by screen test: create → appears; rename; move down; delete confirm/cancel; Save disabled on empty name.

## 4. Medication screens

- [ ] 4.1 Build `src/app/pillbox/[id].tsx` (medications in order with amount, empty state, add, tap/✎ → edit, 🗑 with "Na pewno?") and `src/app/medication-form.tsx`. Verify by screen test: add with amount; add without amount; edit keeps position; delete confirm/cancel; Save disabled on empty name.

## 5. Integration check

- [ ] 5.1 Run `npx tsc --noEmit`, `npm run lint`, `npm test` and `npx expo-doctor`; all pass.
- [ ] 5.2 Manually in Expo Go: create two pillboxes with medications, reorder, kill and reopen the app. Verify the data and order are restored.

## Workflow follow-up

- Commit the apply step; then sync and archive after user approval, one commit each.
