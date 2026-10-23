import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, userEvent } from "@testing-library/react-native";
import { act, renderRouter, screen } from "expo-router/testing-library";
import { Alert, type AlertButton } from "react-native";

import RootLayout from "@/app/_layout";
import Index from "@/app/index";
import MedicationForm from "@/app/medication-form";
import PillboxScreen from "@/app/pillbox/[id]";
import PillboxForm from "@/app/pillbox-form";
import { STORAGE_KEY, type State } from "@/features/pillboxes/store";

const routes = {
  _layout: RootLayout,
  index: Index,
  "pillbox/[id]": PillboxScreen,
  "pillbox-form": PillboxForm,
  "medication-form": MedicationForm,
};

/**
 * Seeds storage, renders the real app at a URL and waits for the provider to load.
 * @param state pillboxes stored before the app starts
 * @param initialUrl route to open
 */
async function startApp(state: State, initialUrl = "/") {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  await renderRouter(routes, { initialUrl });
  await screen.findByRole("button", { name: /^Dodaj/ });
}

/**
 * Presses a button of the most recent `Alert.alert` call.
 * @param text the button's label
 */
async function answerAlert(text: string) {
  const buttons: AlertButton[] = alertSpy.mock.calls.at(-1)?.[2] ?? [];
  await act(async () => buttons.find((b) => b.text === text)?.onPress?.());
}

/**
 * Texts of the visible elements matching a pattern, in on-screen order.
 * @param pattern matches the listed names
 */
const listed = (pattern: RegExp) => screen.getAllByText(pattern).map((el) => el.props.children);

let alertSpy: jest.SpyInstance;
const user = userEvent.setup();

beforeEach(async () => {
  await AsyncStorage.clear();
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

const abc: State = ["A", "B", "C"].map((name) => ({ id: name, name, medications: [] }));

describe("pillbox list", () => {
  test("creates a pillbox from the empty state", async () => {
    await startApp([]);
    expect(screen.getByText("Nie masz jeszcze żadnych pudełek.")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Dodaj pudełko" }));
    const save = await screen.findByRole("button", { name: "Zapisz" });
    expect(save).toBeDisabled();
    await user.type(screen.getByLabelText("Nazwa"), "   ");
    expect(save).toBeDisabled();
    await user.type(screen.getByLabelText("Nazwa"), " Rano ");
    await user.press(save);

    expect(await screen.findByText("Rano")).toBeOnTheScreen();
  });

  test("a double tap on Zapisz adds only once", async () => {
    await startApp([]);
    await user.press(screen.getByRole("button", { name: "Dodaj pudełko" }));
    await user.type(await screen.findByLabelText("Nazwa"), "Rano");
    const save = screen.getByRole("button", { name: "Zapisz" });
    await act(async () => {
      fireEvent.press(save);
      fireEvent.press(save);
    });

    expect(await screen.findAllByText("Rano")).toHaveLength(1);
  });

  test("renames in place", async () => {
    await startApp(abc);
    await user.press(screen.getByRole("button", { name: "Zmień nazwę: B" }));
    const input = await screen.findByLabelText("Nazwa");
    expect(input).toHaveDisplayValue("B");
    await user.clear(input);
    await user.type(input, "Wieczór");
    await user.press(screen.getByRole("button", { name: "Zapisz" }));

    expect(await screen.findByText("Wieczór")).toBeOnTheScreen();
    expect(listed(/^(A|Wieczór|C)$/)).toEqual(["A", "Wieczór", "C"]);
  });

  test("moves down and disables the edge actions", async () => {
    await startApp(abc);
    expect(screen.getByRole("button", { name: "W górę: A" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "W dół: C" })).toBeDisabled();

    await user.press(screen.getByRole("button", { name: "W dół: A" }));

    expect(listed(/^[ABC]$/)).toEqual(["B", "A", "C"]);
    expect(screen.getByRole("button", { name: "W górę: B" })).toBeDisabled();
  });

  test("deletes only after confirmation", async () => {
    await startApp(abc);
    await user.press(screen.getByRole("button", { name: "Usuń: A" }));
    expect(alertSpy).toHaveBeenLastCalledWith("Na pewno?", "A", expect.any(Array));

    await answerAlert("Anuluj");
    expect(listed(/^[ABC]$/)).toEqual(["A", "B", "C"]);

    await answerAlert("Usuń");
    expect(listed(/^[ABC]$/)).toEqual(["B", "C"]);
  });
});

describe("pillbox medications", () => {
  const rano: State = [
    {
      id: "r",
      name: "Rano",
      medications: [
        { id: "m1", name: "Metformina", amount: "1 tabletka" },
        { id: "m2", name: "Witamina D", amount: "" },
      ],
    },
  ];
  const names = /^(Metformina|Witamina D|Magnez)$/;

  test("shows the empty state", async () => {
    await startApp([{ id: "e", name: "Puste", medications: [] }], "/pillbox/e");
    expect(screen.getByText("To pudełko jest puste.")).toBeOnTheScreen();
  });

  test("adds medications at the end, with and without amount", async () => {
    await startApp([{ id: "e", name: "Puste", medications: [] }], "/pillbox/e");

    await user.press(screen.getByRole("button", { name: "Dodaj lek" }));
    const save = await screen.findByRole("button", { name: "Zapisz" });
    expect(save).toBeDisabled();
    await user.type(screen.getByLabelText("Ilość"), "2");
    expect(save).toBeDisabled();
    await user.type(screen.getByLabelText("Nazwa"), "Metformina");
    await user.type(screen.getByLabelText("Ilość"), " tabletki");
    await user.press(save);
    expect(await screen.findByText("2 tabletki")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Dodaj lek" }));
    await user.type(await screen.findByLabelText("Nazwa"), "Magnez");
    await user.press(screen.getByRole("button", { name: "Zapisz" }));

    expect(await screen.findByText("Magnez")).toBeOnTheScreen();
    expect(listed(names)).toEqual(["Metformina", "Magnez"]);
  });

  test("edits a medication in place", async () => {
    await startApp(rano, "/pillbox/r");
    await user.press(screen.getByRole("button", { name: "Edytuj: Metformina" }));
    const amount = await screen.findByLabelText("Ilość");
    expect(amount).toHaveDisplayValue("1 tabletka");
    await user.clear(amount);
    await user.type(amount, "½ tabletki");
    await user.press(screen.getByRole("button", { name: "Zapisz" }));

    expect(await screen.findByText("½ tabletki")).toBeOnTheScreen();
    expect(listed(names)).toEqual(["Metformina", "Witamina D"]);
  });

  test("deletes only after confirmation", async () => {
    await startApp(rano, "/pillbox/r");
    await user.press(screen.getByRole("button", { name: "Usuń: Metformina" }));

    await answerAlert("Anuluj");
    expect(listed(names)).toEqual(["Metformina", "Witamina D"]);

    await answerAlert("Usuń");
    expect(listed(names)).toEqual(["Witamina D"]);
  });
});
