import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, userEvent } from "@testing-library/react-native";
import { act, renderRouter, screen, testRouter, waitFor } from "expo-router/testing-library";
import { Alert, type AlertButton } from "react-native";

import RootLayout from "@/app/_layout";
import Index from "@/app/index";
import MedicationForm from "@/app/medication-form";
import PillboxScreen from "@/app/pillbox/[id]";
import PillboxForm from "@/app/pillbox-form";
import Settings from "@/app/settings";
import { STORAGE_KEY, type State } from "@/features/pillboxes/store";
import { synthesize } from "@/features/reading/elevenlabs";

const mockPlayer = { replace: jest.fn(), play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(async () => {}) };
jest.mock("expo-audio", () => ({
  setAudioModeAsync: async () => {},
  useAudioPlayer: () => mockPlayer,
  useAudioPlayerStatus: () => ({ playing: false }),
}));
const mockSecureStore = new Map<string, string>();
jest.mock("expo-secure-store", () => ({
  getItemAsync: async (key: string) => mockSecureStore.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => void mockSecureStore.set(key, value),
  deleteItemAsync: async (key: string) => void mockSecureStore.delete(key),
}));
jest.mock("@/features/reading/elevenlabs", () => ({ synthesize: jest.fn() }));
const mockSynthesize = jest.mocked(synthesize);
const API_KEY = "elevenlabs-api-key";

const routes = {
  _layout: RootLayout,
  index: Index,
  "pillbox/[id]": PillboxScreen,
  "pillbox-form": PillboxForm,
  "medication-form": MedicationForm,
  settings: Settings,
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
  jest.clearAllMocks();
  mockSecureStore.clear();
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

describe("settings", () => {
  test("saves a trimmed API key, shows its end and clears it", async () => {
    await startApp([]);
    await user.press(screen.getByRole("button", { name: "Ustawienia" }));
    expect(await screen.findByText("Brak klucza")).toBeOnTheScreen();

    await user.type(screen.getByLabelText("Klucz API ElevenLabs"), "  sk_abcd1234 ");
    await user.press(screen.getByRole("button", { name: "Zapisz" }));
    expect(await screen.findByText("Klucz zapisany (…1234)")).toBeOnTheScreen();
    expect(mockSecureStore.get(API_KEY)).toBe("sk_abcd1234");

    await user.press(screen.getByRole("button", { name: "Usuń klucz" }));
    expect(await screen.findByText("Brak klucza")).toBeOnTheScreen();
    expect(mockSecureStore.has(API_KEY)).toBe(false);
  });
});

describe("reading a pillbox", () => {
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

  /** Taps Czytaj and waits until the read finishes and the button is back. */
  async function read() {
    await user.press(screen.getByRole("button", { name: "Czytaj" }));
    await screen.findByRole("button", { name: "Czytaj" });
  }

  test("warns about an empty pillbox without a request", async () => {
    mockSecureStore.set(API_KEY, "k");
    await startApp([{ id: "e", name: "Puste", medications: [] }], "/pillbox/e");
    await read();

    expect(alertSpy).toHaveBeenLastCalledWith("Brak leków w tym pudełku");
    expect(mockSynthesize).not.toHaveBeenCalled();
  });

  test("without a key, alerts and links to settings", async () => {
    await startApp(rano, "/pillbox/r");
    await read();

    expect(alertSpy).toHaveBeenLastCalledWith("Brak klucza API ElevenLabs", expect.any(String), expect.any(Array));
    expect(mockSynthesize).not.toHaveBeenCalled();
    await answerAlert("Przejdź do ustawień");
    expect(await screen.findByText("Brak klucza")).toBeOnTheScreen();
  });

  test("plays the audio, replays it without a new request, and re-requests after an edit", async () => {
    mockSecureStore.set(API_KEY, "k");
    mockSynthesize.mockResolvedValue("file:///cache/a.mp3");
    await startApp(rano, "/pillbox/r");

    await read();
    expect(mockSynthesize).toHaveBeenCalledWith(expect.stringMatching(/^Pudełko: Rano\. Liczba leków: 2\./), "k");
    expect(mockPlayer.replace).toHaveBeenCalledWith({ uri: "file:///cache/a.mp3" });
    expect(mockPlayer.play).toHaveBeenCalledTimes(1);

    await read();
    expect(mockSynthesize).toHaveBeenCalledTimes(1);
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(0);
    expect(mockPlayer.play).toHaveBeenCalledTimes(2);

    await user.press(screen.getByRole("button", { name: "Usuń: Witamina D" }));
    await answerAlert("Usuń");
    await read();
    expect(mockSynthesize).toHaveBeenCalledTimes(2);
  });

  test("ignores a download that finishes after leaving the screen", async () => {
    mockSecureStore.set(API_KEY, "k");
    let finish: (uri: string) => void = () => {};
    mockSynthesize.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await startApp(rano);
    await user.press(screen.getByText("Rano"));
    await user.press(await screen.findByRole("button", { name: "Czytaj" }));
    await screen.findByLabelText("Pobieranie nagrania");

    await act(async () => testRouter.back());
    await act(async () => finish("file:///cache/late.mp3"));

    expect(screen.getByRole("button", { name: "Dodaj pudełko" })).toBeOnTheScreen();
    expect(mockPlayer.replace).not.toHaveBeenCalled();
    expect(mockPlayer.play).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  test("shows the failure reason and retries", async () => {
    mockSecureStore.set(API_KEY, "k");
    mockSynthesize.mockRejectedValue(new Error("Nieprawidłowy klucz API"));
    await startApp(rano, "/pillbox/r");
    await read();

    expect(alertSpy).toHaveBeenLastCalledWith(
      "Nie udało się odczytać pudełka",
      "Nieprawidłowy klucz API",
      expect.any(Array),
    );
    expect(mockPlayer.play).not.toHaveBeenCalled();

    await answerAlert("Spróbuj ponownie");
    await waitFor(() => expect(mockSynthesize).toHaveBeenCalledTimes(2));
  });
});
