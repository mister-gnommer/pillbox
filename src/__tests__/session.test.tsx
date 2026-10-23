import AsyncStorage from "@react-native-async-storage/async-storage";
import { userEvent } from "@testing-library/react-native";
import { act, renderRouter, screen, waitFor } from "expo-router/testing-library";
import { Alert, type AlertButton } from "react-native";

import RootLayout from "@/app/_layout";
import Index from "@/app/index";
import MedicationForm from "@/app/medication-form";
import PillboxScreen from "@/app/pillbox/[id]";
import PillboxForm from "@/app/pillbox-form";
import Session from "@/app/session";
import Settings from "@/app/settings";
import { STORAGE_KEY, type State } from "@/features/pillboxes/store";
import { synthesize } from "@/features/reading/elevenlabs";

// Playback state the mocked status hook re-renders on, so the screen sees play/pause like on a device.
const mockAudio = { playing: false, listeners: new Set<() => void>() };
const mockSetPlaying = (playing: boolean) => {
  mockAudio.playing = playing;
  mockAudio.listeners.forEach((listener) => listener());
};
const mockPlayer = {
  replace: jest.fn(),
  play: jest.fn(() => mockSetPlaying(true)),
  pause: jest.fn(() => mockSetPlaying(false)),
  seekTo: jest.fn(async () => {}),
};
jest.mock("expo-audio", () => {
  const { useSyncExternalStore } = jest.requireActual("react");
  const subscribe = (listener: () => void) => {
    mockAudio.listeners.add(listener);
    return () => mockAudio.listeners.delete(listener);
  };
  return {
    setAudioModeAsync: async () => {},
    useAudioPlayer: () => mockPlayer,
    useAudioPlayerStatus: () => ({ playing: useSyncExternalStore(subscribe, () => mockAudio.playing) }),
  };
});
const mockSecureStore = new Map<string, string>();
jest.mock("expo-secure-store", () => ({
  getItemAsync: async (key: string) => mockSecureStore.get(key) ?? null,
}));
jest.mock("@/features/reading/elevenlabs", () => ({ synthesize: jest.fn() }));
const mockSynthesize = jest.mocked(synthesize);

const routes = {
  _layout: RootLayout,
  index: Index,
  "pillbox/[id]": PillboxScreen,
  "pillbox-form": PillboxForm,
  "medication-form": MedicationForm,
  session: Session,
  settings: Settings,
};

const meds = [{ id: "m", name: "Metformina", amount: "" }];
const state: State = [
  { id: "a", name: "Rano", medications: meds },
  { id: "b", name: "Południe", medications: [] },
  { id: "c", name: "Wieczór", medications: meds },
];

let alertSpy: jest.SpyInstance;
const user = userEvent.setup();

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockAudio.playing = false;
  mockSecureStore.clear();
  mockSecureStore.set("elevenlabs-api-key", "k");
  mockSynthesize.mockImplementation(async (text) => `file:///cache/${text.length}.mp3`);
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

/**
 * Opens the list and starts a session with ▶ on the named pillbox.
 * @param name pillbox to start at
 */
async function startAt(name: string) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  await renderRouter(routes, { initialUrl: "/" });
  await user.press(await screen.findByRole("button", { name: `Rozpocznij od: ${name}` }));
}

/** Makes the next synthesize call hang until its signal aborts, then reject like the real one. */
function hangUntilAborted() {
  let signal: AbortSignal | undefined;
  mockSynthesize.mockImplementationOnce(
    (_text, _key, s) =>
      new Promise((_resolve, reject) => {
        signal = s;
        s?.addEventListener("abort", () => reject(new Error("Brak połączenia z internetem")));
      }),
  );
  return () => signal;
}

const button = (name: string) => screen.getByRole("button", { name });
const atList = () => screen.findByRole("button", { name: "Dodaj pudełko" });

test("▶ opens the session on that pillbox and reads it", async () => {
  await startAt("Wieczór");

  expect(await screen.findByText("Pudełko 3 z 3")).toBeOnTheScreen();
  expect(screen.getByText("1. Metformina")).toBeOnTheScreen();
  await waitFor(() => expect(mockPlayer.play).toHaveBeenCalledTimes(1));
  expect(mockSynthesize).toHaveBeenCalledWith(expect.stringMatching(/^Pudełko: Wieczór\./), "k", expect.any(AbortSignal));
});

test("Start opens the session on the open pillbox", async () => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  await renderRouter(routes, { initialUrl: "/pillbox/c" });
  await user.press(await screen.findByRole("button", { name: "Czytaj" }));
  await waitFor(() => expect(mockPlayer.play).toHaveBeenCalledTimes(1));
  await user.press(await screen.findByRole("button", { name: "Start" }));

  expect(await screen.findByText("Pudełko 3 z 3")).toBeOnTheScreen();
  // The pillbox screen's own reading was stopped before the session started.
  expect(mockPlayer.pause).toHaveBeenCalled();
  await waitFor(() => expect(mockPlayer.play).toHaveBeenCalledTimes(2));

  await user.press(button("Stop"));
  await user.press(button("Stop"));
  expect(await atList()).toBeOnTheScreen();
});

test("without a key, alerts and opens no session", async () => {
  mockSecureStore.clear();
  await startAt("Rano");

  expect(alertSpy).toHaveBeenLastCalledWith("Brak klucza API ElevenLabs", expect.any(String), expect.any(Array));
  expect(screen.queryByText(/^Pudełko \d z/)).not.toBeOnTheScreen();
});

test("Powtórz replays the downloaded audio", async () => {
  await startAt("Rano");
  await waitFor(() => expect(mockPlayer.play).toHaveBeenCalledTimes(1));

  await user.press(button("Powtórz"));

  await waitFor(() => expect(mockPlayer.play).toHaveBeenCalledTimes(2));
  expect(mockSynthesize).toHaveBeenCalledTimes(1);
});

test("Dalej walks the list, shows an empty pillbox without a request, and ends after the last", async () => {
  await startAt("Rano");
  await waitFor(() => expect(mockPlayer.play).toHaveBeenCalledTimes(1));

  await user.press(button("Dalej"));
  expect(mockPlayer.pause).toHaveBeenCalled();
  expect(await screen.findByText("Brak leków w tym pudełku")).toBeOnTheScreen();
  expect(button("Powtórz")).toBeDisabled();
  expect(mockSynthesize).toHaveBeenCalledTimes(1);

  await user.press(button("Dalej"));
  expect(await screen.findByText("Pudełko 3 z 3")).toBeOnTheScreen();
  await waitFor(() => expect(mockPlayer.play).toHaveBeenCalledTimes(2));
  expect(mockSynthesize).toHaveBeenLastCalledWith(expect.stringMatching(/^Pudełko: Wieczór\./), "k", expect.any(AbortSignal));

  await user.press(button("Dalej"));
  expect(await atList()).toBeOnTheScreen();
});

test("Stop while playing stays, Stop when idle returns to the list", async () => {
  await startAt("Rano");
  await waitFor(() => expect(mockPlayer.play).toHaveBeenCalledTimes(1));

  await user.press(button("Stop"));
  expect(mockPlayer.pause).toHaveBeenCalled();
  expect(screen.getByText("Pudełko 1 z 3")).toBeOnTheScreen();

  await user.press(button("Stop"));
  expect(await atList()).toBeOnTheScreen();
});

test("Stop during a download aborts it silently and stays", async () => {
  const signal = hangUntilAborted();
  await startAt("Rano");
  await screen.findByLabelText("Pobieranie nagrania");

  await user.press(button("Stop"));

  expect(signal()?.aborted).toBe(true);
  expect(screen.queryByLabelText("Pobieranie nagrania")).not.toBeOnTheScreen();
  expect(screen.getByText("Pudełko 1 z 3")).toBeOnTheScreen();
  expect(mockPlayer.play).not.toHaveBeenCalled();
  expect(alertSpy).not.toHaveBeenCalled();
});

test("a download that resolves after Stop never plays", async () => {
  let finish: (uri: string) => void = () => {};
  mockSynthesize.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
  await startAt("Rano");
  await screen.findByLabelText("Pobieranie nagrania");

  await user.press(button("Stop"));
  await act(async () => finish("file:///cache/late.mp3"));

  expect(mockPlayer.replace).not.toHaveBeenCalled();
  expect(mockPlayer.play).not.toHaveBeenCalled();
});

test("Stop while rewinding before playback keeps it stopped", async () => {
  let rewound: () => void = () => {};
  mockPlayer.seekTo.mockImplementationOnce(() => new Promise<void>((resolve) => (rewound = resolve)));
  await startAt("Rano");
  await waitFor(() => expect(mockPlayer.replace).toHaveBeenCalled());

  await user.press(button("Stop"));
  await act(async () => rewound());

  expect(mockPlayer.play).not.toHaveBeenCalled();
});

test("Dalej during a download aborts it silently and reads the next pillbox", async () => {
  const signal = hangUntilAborted();
  await startAt("Rano");
  await screen.findByLabelText("Pobieranie nagrania");

  await user.press(button("Dalej"));
  expect(signal()?.aborted).toBe(true);
  await user.press(await screen.findByRole("button", { name: "Dalej" }));

  await waitFor(() => expect(mockPlayer.play).toHaveBeenCalledTimes(1));
  expect(mockSynthesize).toHaveBeenLastCalledWith(expect.stringMatching(/^Pudełko: Wieczór\./), "k", expect.any(AbortSignal));
  expect(alertSpy).not.toHaveBeenCalled();
});

test("Powtórz during a download restarts it and keeps the spinner", async () => {
  const first = hangUntilAborted();
  hangUntilAborted();
  await startAt("Rano");
  await screen.findByLabelText("Pobieranie nagrania");

  await user.press(button("Powtórz"));

  expect(first()?.aborted).toBe(true);
  expect(mockSynthesize).toHaveBeenCalledTimes(2);
  expect(screen.getByLabelText("Pobieranie nagrania")).toBeOnTheScreen();
  expect(alertSpy).not.toHaveBeenCalled();
});

test("a failure alerts and Anuluj leaves the controls working", async () => {
  mockSynthesize.mockRejectedValueOnce(new Error("Brak połączenia z internetem"));
  await startAt("Rano");

  await waitFor(() =>
    expect(alertSpy).toHaveBeenLastCalledWith(
      "Nie udało się odczytać pudełka",
      "Brak połączenia z internetem",
      expect.any(Array),
    ),
  );
  const buttons: AlertButton[] = alertSpy.mock.calls.at(-1)?.[2] ?? [];
  await act(async () => buttons.find((b) => b.text === "Anuluj")?.onPress?.());

  await user.press(button("Powtórz"));
  await waitFor(() => expect(mockPlayer.play).toHaveBeenCalledTimes(1));
  await user.press(button("Dalej"));
  expect(await screen.findByText("Pudełko 2 z 3")).toBeOnTheScreen();
  await user.press(button("Stop"));
  expect(await atList()).toBeOnTheScreen();
});
