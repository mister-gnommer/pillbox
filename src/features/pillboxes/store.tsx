import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, use, useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export type Medication = { id: string; name: string; amount: string };
export type Pillbox = { id: string; name: string; medications: Medication[] };
export type State = Pillbox[];

export type Action =
  | { type: "hydrate"; state: State }
  | { type: "addPillbox"; id: string; name: string }
  | { type: "renamePillbox"; id: string; name: string }
  | { type: "deletePillbox"; id: string }
  | { type: "movePillbox"; id: string; direction: -1 | 1 }
  | { type: "addMedication"; pillboxId: string; id: string; name: string; amount: string }
  | { type: "updateMedication"; pillboxId: string; id: string; name: string; amount: string }
  | { type: "deleteMedication"; pillboxId: string; id: string };

export const STORAGE_KEY = "pillbox:v1";

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

/**
 * Applies a change to one pillbox's medication list, leaving other pillboxes untouched.
 * @param state current pillboxes
 * @param pillboxId pillbox to change
 * @param change maps the old medication list to the new one
 */
function withMedications(state: State, pillboxId: string, change: (meds: Medication[]) => Medication[]): State {
  return state.map((p) => (p.id === pillboxId ? { ...p, medications: change(p.medications) } : p));
}

/**
 * Pure state transition for all pillbox and medication edits. Names and amounts are trimmed;
 * actions with an empty name are ignored and return the same state.
 * @param state current pillboxes
 * @param action the edit to apply
 * @returns the next pillboxes
 */
export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "addPillbox": {
      const name = action.name.trim();
      return name ? [...state, { id: action.id, name, medications: [] }] : state;
    }
    case "renamePillbox": {
      const name = action.name.trim();
      return name ? state.map((p) => (p.id === action.id ? { ...p, name } : p)) : state;
    }
    case "deletePillbox":
      return state.filter((p) => p.id !== action.id);
    case "movePillbox": {
      const from = state.findIndex((p) => p.id === action.id);
      const to = from + action.direction;
      if (from === -1 || to < 0 || to >= state.length) {
        return state;
      }
      const next = [...state];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    }
    case "addMedication": {
      const name = action.name.trim();
      if (!name) {
        return state;
      }
      const medication = { id: action.id, name, amount: action.amount.trim() };
      return withMedications(state, action.pillboxId, (meds) => [...meds, medication]);
    }
    case "updateMedication": {
      const name = action.name.trim();
      if (!name) {
        return state;
      }
      const amount = action.amount.trim();
      return withMedications(state, action.pillboxId, (meds) =>
        meds.map((m) => (m.id === action.id ? { ...m, name, amount } : m)),
      );
    }
    case "deleteMedication":
      return withMedications(state, action.pillboxId, (meds) => meds.filter((m) => m.id !== action.id));
  }
}

/**
 * Parses stored JSON, falling back to an empty list when it is missing or broken.
 * @param raw value read from AsyncStorage
 */
function parseStored(raw: string | null): State {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    // shortcut: only checks for an array, not each item's shape; add a schema check if the format ever changes
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Stored pillboxes are not valid JSON, starting empty", error);
    return [];
  }
}

/**
 * Builds the state and action functions exposed by the provider.
 * @param pillboxes current state
 * @param dispatch reducer dispatch
 */
function createValue(pillboxes: State, dispatch: (action: Action) => void) {
  return {
    pillboxes,
    addPillbox: (name: string) => dispatch({ type: "addPillbox", id: newId(), name }),
    renamePillbox: (id: string, name: string) => dispatch({ type: "renamePillbox", id, name }),
    deletePillbox: (id: string) => dispatch({ type: "deletePillbox", id }),
    movePillbox: (id: string, direction: -1 | 1) => dispatch({ type: "movePillbox", id, direction }),
    addMedication: (pillboxId: string, name: string, amount: string) =>
      dispatch({ type: "addMedication", pillboxId, id: newId(), name, amount }),
    updateMedication: (pillboxId: string, id: string, name: string, amount: string) =>
      dispatch({ type: "updateMedication", pillboxId, id, name, amount }),
    deleteMedication: (pillboxId: string, id: string) => dispatch({ type: "deleteMedication", pillboxId, id }),
  };
}

const PillboxesContext = createContext<ReturnType<typeof createValue> | null>(null);

/**
 * Holds the pillboxes, loads them from AsyncStorage on mount and saves every change after that.
 * Children are not rendered until the stored data is loaded.
 */
export function PillboxesProvider({ children }: { children: ReactNode }) {
  const [pillboxes, dispatch] = useReducer(reducer, []);
  const [ready, setReady] = useState(false);
  const readFailed = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .catch((error: unknown) => {
        console.error("Could not read stored pillboxes, not saving this session", error);
        readFailed.current = true;
        return null;
      })
      .then((raw) => {
        dispatch({ type: "hydrate", state: parseStored(raw) });
        setReady(true);
      });
  }, []);

  useEffect(() => {
    // Saving before hydration, or after a failed read, would overwrite intact stored data.
    if (!ready || readFailed.current) {
      return;
    }
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pillboxes)).catch((error: unknown) => {
      console.error("Could not save pillboxes", error);
    });
  }, [ready, pillboxes]);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  return <PillboxesContext value={createValue(pillboxes, dispatch)}>{children}</PillboxesContext>;
}

/** Returns the pillboxes and the functions that edit them; must be used inside `PillboxesProvider`. */
export function usePillboxes() {
  const value = use(PillboxesContext);
  if (!value) {
    throw new Error("usePillboxes must be used inside PillboxesProvider");
  }
  return value;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
