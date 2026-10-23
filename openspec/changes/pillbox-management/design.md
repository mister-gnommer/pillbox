# Design

## Context

Fresh Expo SDK 58 app with expo-router (routes in `src/app/`; the root layout is a bare `<Stack />`), React Compiler enabled, and no tests or state yet. Decisions come from `docs/context.md`. The data shape defined here is the contract for `pillbox-reading` and `reading-session`.

## Goals / Non-Goals

**Goals:** smallest code that meets the specs; a pure, unit-testable reducer; screen tests through the real routes.

**Non-Goals:** i18n layer, schema migrations, sync/backup, a design system, settings or reading entry points (later changes add the gear and ▶ buttons).

## Decisions

### Data model: one nested array
```ts
type Medication = { id: string; name: string; amount: string }   // amount "" = none
type Pillbox    = { id: string; name: string; medications: Medication[] }
type State      = Pillbox[]                                      // array order = display order
```
Array order *is* the order for both lists, so there is no `position` field to keep in sync. Alternative: normalized maps plus order arrays. Rejected, because it's more code at a scale of tens of items. IDs: `Date.now().toString(36) + Math.random().toString(36).slice(2)` (local only, no crypto dependency).

### Store: Context + `useReducer` in `src/features/pillboxes/store.tsx`
- The reducer is exported for unit tests. Actions: `hydrate`, `addPillbox`, `renamePillbox`, `deletePillbox`, `movePillbox(id, -1|1)`, `addMedication`, `updateMedication`, `deleteMedication`.
- `PillboxesProvider` wraps the root layout. `usePillboxes()` returns `{ pillboxes, ready, ...actionFns }`.
- The reducer trims names and amounts and ignores empty names, so unit tests cover the rule. The forms also disable Save for a better UX.

### Persistence: AsyncStorage, whole-state JSON
- Key `pillbox:v1`. Load once on mount, dispatch `hydrate`, set `ready`. Save the whole state on every change **only after hydration**, so an early empty state never overwrites stored data.
- Screens render a spinner until `ready`.
- Alternative: SecureStore. Rejected because of the ~2 KB value limit (see context Q3). expo-sqlite was rejected as overkill.

### Routes
| Route | File | Presentation |
|---|---|---|
| `/` | `src/app/index.tsx` | list of pillboxes |
| `/pillbox/[id]` | `src/app/pillbox/[id].tsx` | medications of one pillbox |
| `/pillbox-form?id=` | `src/app/pillbox-form.tsx` | modal; `id` present = rename |
| `/medication-form?pillboxId=&id=` | `src/app/medication-form.tsx` | modal; `id` present = edit |

The two forms are separate small screens following the same pattern (TextInput(s), Save disabled while the trimmed name is empty, `router.back()` on save). A generic form component was rejected for being premature with only two forms.

### UI
- `StyleSheet` + core RN components. Large touch targets (≥48 dp) and `accessibilityLabel` on icon buttons.
- Icon buttons use plain text glyphs (↑ ↓ ✎ 🗑) to avoid adding an icon dependency. A later change may switch to `expo-symbols` (already installed) if needed.
- Delete confirmation: `Alert.alert("Na pewno?", <name>, [Anuluj, Usuń (destructive)])`.
- Strings are hardcoded in Polish.

### Tests: jest-expo + React Native Testing Library
- Install with `npx expo install jest-expo jest @testing-library/react-native @types/jest -- --save-dev`, pinned exactly. Add a `"test": "jest"` script and `"jest": { "preset": "jest-expo" }`.
- AsyncStorage uses its official jest mock (`@react-native-async-storage/async-storage/jest/async-storage-mock`).
- Screen tests use `renderRouter` from `expo-router/testing-library` with the real screen modules mapped inline, wrapped in the provider. `Alert.alert` is spied to press the confirm button.
- Unit tests cover the reducer. One test covers hydrate → save (via the provider and the mocked storage).

## Risks / Trade-offs

- [Corrupt or unparseable stored JSON] → start empty and log it. Data loss is possible only for already-broken data; acceptable for v1.
- [Whole-state save on every change] → changes happen on Save/Delete/Move, not per keystroke, so the write volume is trivial.
- [Jest + SDK 58 / React 19.3 / RN 0.88 compatibility] → use the versions `expo install` resolves. If RNTL lags behind, fall back to the version the Expo docs pin and note it.
- [`Alert` buttons don't render on web] → web isn't supported (context Q4).
