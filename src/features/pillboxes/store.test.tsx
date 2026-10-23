import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { PillboxesProvider, reducer, STORAGE_KEY, usePillboxes, type State } from "./store";

const abc: State = ["A", "B", "C"].map((name) => ({ id: name, name, medications: [] }));
const names = (state: State) => state.map((p) => p.name);

describe("reducer: pillboxes", () => {
  test("adds a trimmed pillbox at the end", () => {
    const state = reducer(abc, { type: "addPillbox", id: "d", name: "  Rano  " });
    expect(state.at(-1)).toEqual({ id: "d", name: "Rano", medications: [] });
  });

  test("ignores whitespace-only names on add and rename", () => {
    expect(reducer(abc, { type: "addPillbox", id: "d", name: "   " })).toBe(abc);
    expect(reducer(abc, { type: "renamePillbox", id: "A", name: " " })).toBe(abc);
  });

  test("renames in place", () => {
    expect(names(reducer(abc, { type: "renamePillbox", id: "B", name: "Wieczór" }))).toEqual(["A", "Wieczór", "C"]);
  });

  test("deletes only the given pillbox", () => {
    expect(names(reducer(abc, { type: "deletePillbox", id: "B" }))).toEqual(["A", "C"]);
  });

  test("moves one position and treats the edges as no-ops", () => {
    expect(names(reducer(abc, { type: "movePillbox", id: "A", direction: 1 }))).toEqual(["B", "A", "C"]);
    expect(names(reducer(abc, { type: "movePillbox", id: "C", direction: -1 }))).toEqual(["A", "C", "B"]);
    expect(reducer(abc, { type: "movePillbox", id: "A", direction: -1 })).toBe(abc);
    expect(reducer(abc, { type: "movePillbox", id: "C", direction: 1 })).toBe(abc);
  });
});

describe("reducer: medications", () => {
  const withMeds = reducer(
    reducer(abc, { type: "addMedication", pillboxId: "B", id: "m1", name: " Metformina ", amount: " 1 tabletka " }),
    { type: "addMedication", pillboxId: "B", id: "m2", name: "Witamina D", amount: "   " },
  );
  const meds = (state: State) => state.find((p) => p.id === "B")?.medications;

  test("appends trimmed medications to the right pillbox, empty amount as empty string", () => {
    expect(meds(withMeds)).toEqual([
      { id: "m1", name: "Metformina", amount: "1 tabletka" },
      { id: "m2", name: "Witamina D", amount: "" },
    ]);
    expect(withMeds[0].medications).toEqual([]);
  });

  test("rejects whitespace-only names on add and update", () => {
    expect(reducer(withMeds, { type: "addMedication", pillboxId: "B", id: "m3", name: " ", amount: "x" })).toBe(withMeds);
    expect(reducer(withMeds, { type: "updateMedication", pillboxId: "B", id: "m1", name: "", amount: "x" })).toBe(withMeds);
  });

  test("updates in place", () => {
    const state = reducer(withMeds, { type: "updateMedication", pillboxId: "B", id: "m1", name: "Metformina", amount: "½ tabletki" });
    expect(meds(state)?.map((m) => m.amount)).toEqual(["½ tabletki", ""]);
  });

  test("deletes only the given medication", () => {
    const state = reducer(withMeds, { type: "deleteMedication", pillboxId: "B", id: "m1" });
    expect(meds(state)?.map((m) => m.id)).toEqual(["m2"]);
  });
});

describe("PillboxesProvider persistence", () => {
  beforeEach(() => AsyncStorage.clear());

  let api: ReturnType<typeof usePillboxes>;
  function Probe() {
    api = usePillboxes();
    return <Text>{`[${names(api.pillboxes).join(",")}]`}</Text>;
  }

  test("hydrates from storage, then saves changes", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(abc));
    await render(<PillboxesProvider><Probe /></PillboxesProvider>);
    expect(await screen.findByText("[A,B,C]")).toBeOnTheScreen();
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(STORAGE_KEY, "[]");

    await act(async () => api.addPillbox("Rano"));

    const stored: unknown = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? "null");
    expect(Array.isArray(stored) && stored.map((p) => p.name)).toEqual(["A", "B", "C", "Rano"]);
  });

  test("never saves when the stored data could not be read", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error("disk"));
    jest.mocked(AsyncStorage.setItem).mockClear();
    await render(<PillboxesProvider><Probe /></PillboxesProvider>);
    expect(await screen.findByText("[]")).toBeOnTheScreen();

    await act(async () => api.addPillbox("Rano"));

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  test("starts empty on corrupt JSON", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    await AsyncStorage.setItem(STORAGE_KEY, "{not json");
    await render(<PillboxesProvider><Probe /></PillboxesProvider>);
    expect(await screen.findByText("[]")).toBeOnTheScreen();
    expect(api.pillboxes).toEqual([]);
  });
});
