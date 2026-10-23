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
import { synthesize, transcribe } from "@/features/reading/elevenlabs";

// Playback state the mocked status hook re-renders on and the player emits, so the screen sees play/pause like on a device.
type MockStatus = { playing: boolean; didJustFinish: boolean };
const mockAudio = {
  status: { playing: false, didJustFinish: false },
  micGranted: true,
  listeners: new Set<(status: MockStatus) => void>(),
};
const mockSetStatus = (playing: boolean, didJustFinish = false) => {
  mockAudio.status = { playing, didJustFinish };
  mockAudio.listeners.forEach((listener) => listener(mockAudio.status));
};
const mockSetPlaying = (playing: boolean) => mockSetStatus(playing);
const mockRecorder = {
  uri: "file:///cache/rec.m4a",
  prepareToRecordAsync: jest.fn(async () => {}),
  record: jest.fn(),
  stop: jest.fn(async () => {}),
};
const mockPlayer = {
  replace: jest.fn(),
  play: jest.fn(() => mockSetPlaying(true)),
  pause: jest.fn(() => mockSetPlaying(false)),
  seekTo: jest.fn(async () => {}),
  addListener: (_event: string, listener: (status: MockStatus) => void) => {
    mockAudio.listeners.add(listener);
    return { remove: () => mockAudio.listeners.delete(listener) };
  },
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
    useAudioPlayerStatus: () => useSyncExternalStore(subscribe, () => mockAudio.status),
    useAudioRecorder: () => mockRecorder,
    RecordingPresets: { HIGH_QUALITY: {} },
    requestRecordingPermissionsAsync: async () => ({ granted: mockAudio.micGranted }),
  };
});
const mockSecureStore = new Map<string, string>();
jest.mock("expo-secure-store", () => ({
  getItemAsync: async (key: string) => mockSecureStore.get(key) ?? null,
}));
jest.mock("@/features/reading/elevenlabs", () => ({ synthesize: jest.fn(), transcribe: jest.fn() }));
const mockSynthesize = jest.mocked(synthesize);
const mockTranscribe = jest.mocked(transcribe);

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
let user = userEvent.setup();

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockAudio.status = { playing: false, didJustFinish: false };
  mockAudio.micGranted = true;
  mockSecureStore.clear();
  mockSecureStore.set("elevenlabs-api-key", "k");
  mockSynthesize.mockImplementation(async (text) => `file:///cache/${text.length}.mp3`);
  mockTranscribe.mockResolvedValue("");
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

describe("voice commands", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    user = userEvent.setup();
  });

  const listening = () => screen.queryByText("🎤 Słucham…");

  /** Starts a session on Rano and lets its reading play to the end, which opens a listening window. */
  async function finishFirstReading() {
    await startAt("Rano");
    await waitFor(() => expect(mockPlayer.play).toHaveBeenCalledTimes(1));
    expect(mockRecorder.record).not.toHaveBeenCalled();
    // The native player follows the finish with a plain status in the same batch.
    await act(async () => {
      mockSetStatus(false, true);
      mockSetStatus(false);
    });
    await waitFor(() => expect(listening()).toBeOnTheScreen());
  }

  /** Ends the 5 s recording window. */
  const endWindow = () => act(() => jest.advanceTimersByTimeAsync(5000));

  /** Makes the next transcription wait until the test resolves it, ignoring aborts like a late response. */
  function lateTranscript() {
    let signal: AbortSignal | undefined;
    let resolve: (text: string) => void = () => {};
    mockTranscribe.mockImplementationOnce(
      (_uri, _key, s) =>
        new Promise((r) => {
          signal = s;
          resolve = r;
        }),
    );
    return { signal: () => signal, resolve: (text: string) => act(async () => resolve(text)) };
  }

  test("listens for 5 s after a reading finishes, then Dalej by voice moves on", async () => {
    mockTranscribe.mockResolvedValueOnce("Dalej.");
    await finishFirstReading();
    expect(mockRecorder.record).toHaveBeenCalledTimes(1);

    await act(() => jest.advanceTimersByTimeAsync(4999));
    expect(mockTranscribe).not.toHaveBeenCalled();
    await act(() => jest.advanceTimersByTimeAsync(1));

    expect(mockRecorder.stop).toHaveBeenCalled();
    expect(mockTranscribe).toHaveBeenCalledWith("file:///cache/rec.m4a", "k", expect.any(AbortSignal));
    expect(await screen.findByText("Pudełko 2 z 3")).toBeOnTheScreen();
    // An empty pillbox has nothing to read, so it listens straight away.
    await waitFor(() => expect(mockRecorder.record).toHaveBeenCalledTimes(2));
  });

  test("stop by voice after Dalej during playback ends the session", async () => {
    // On a device the paused status arrives after the next pillbox has rendered.
    mockPlayer.pause.mockImplementationOnce(() => setTimeout(() => mockSetPlaying(false), 0));
    mockTranscribe.mockResolvedValueOnce("stop");
    await startAt("Rano");
    await waitFor(() => expect(mockPlayer.play).toHaveBeenCalledTimes(1));

    await user.press(button("Dalej"));
    expect(await screen.findByText("Brak leków w tym pudełku")).toBeOnTheScreen();
    await endWindow();

    expect(await atList()).toBeOnTheScreen();
  });

  test("powtorz by voice on an empty pillbox reads nothing", async () => {
    mockTranscribe.mockResolvedValueOnce("Dalej.").mockResolvedValueOnce("powtórz");
    await finishFirstReading();
    await endWindow();
    expect(await screen.findByText("Pudełko 2 z 3")).toBeOnTheScreen();

    await endWindow();

    await waitFor(() => expect(listening()).not.toBeOnTheScreen());
    expect(mockSynthesize).toHaveBeenCalledTimes(1);
  });

  test("powtorz by voice reads the pillbox again", async () => {
    mockTranscribe.mockResolvedValueOnce("powtorz");
    await finishFirstReading();
    await endWindow();

    await waitFor(() => expect(mockPlayer.play).toHaveBeenCalledTimes(2));
    expect(listening()).not.toBeOnTheScreen();
  });

  test("stop by voice ends the session", async () => {
    mockTranscribe.mockResolvedValueOnce("Stop!");
    await finishFirstReading();
    await endWindow();

    expect(await atList()).toBeOnTheScreen();
  });

  test("an unrecognised transcript does nothing", async () => {
    mockTranscribe.mockResolvedValueOnce("dalej, stop");
    await finishFirstReading();
    await endWindow();

    await waitFor(() => expect(listening()).not.toBeOnTheScreen());
    expect(screen.getByText("Pudełko 1 z 3")).toBeOnTheScreen();
    expect(mockPlayer.play).toHaveBeenCalledTimes(1);
  });

  test("a tap while recording stops the recorder and never transcribes that window", async () => {
    await finishFirstReading();
    expect(button("Powtórz")).toBeEnabled();

    await user.press(button("Powtórz"));

    expect(mockRecorder.stop).toHaveBeenCalled();
    expect(listening()).not.toBeOnTheScreen();
    await waitFor(() => expect(mockPlayer.play).toHaveBeenCalledTimes(2));
    await endWindow();
    expect(mockTranscribe).not.toHaveBeenCalled();
  });

  test.each([
    ["Dalej", () => screen.findByText("Pudełko 2 z 3")],
    ["Powtórz", () => waitFor(() => expect(mockPlayer.play).toHaveBeenCalledTimes(2))],
    ["Stop", atList],
  ])("%s while transcribing aborts it, acts, and ignores the late transcript", async (name, acted) => {
    const transcript = lateTranscript();
    await finishFirstReading();
    await endWindow();
    expect(button(name)).toBeEnabled();

    await user.press(button(name));
    await acted();
    expect(transcript.signal()?.aborted).toBe(true);
    await transcript.resolve("dalej");

    expect(screen.queryByText("Pudełko 3 z 3")).not.toBeOnTheScreen();
    if (name !== "Stop") {
      expect(screen.getByText(name === "Dalej" ? "Pudełko 2 z 3" : "Pudełko 1 z 3")).toBeOnTheScreen();
    }
  });

  test("with the microphone denied, readings finish without listening", async () => {
    mockAudio.micGranted = false;
    await startAt("Rano");
    await waitFor(() => expect(mockPlayer.play).toHaveBeenCalledTimes(1));

    await act(async () => mockSetStatus(false, true));
    await endWindow();

    expect(mockRecorder.record).not.toHaveBeenCalled();
    expect(listening()).not.toBeOnTheScreen();
    expect(alertSpy).not.toHaveBeenCalled();
    await user.press(button("Dalej"));
    expect(await screen.findByText("Pudełko 2 z 3")).toBeOnTheScreen();
  });

  test("a failed transcription ends listening without an alert", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockTranscribe.mockRejectedValueOnce(new Error("Brak połączenia z internetem"));
    await finishFirstReading();
    await endWindow();

    await waitFor(() => expect(listening()).not.toBeOnTheScreen());
    expect(alertSpy).not.toHaveBeenCalled();
    await user.press(button("Dalej"));
    expect(await screen.findByText("Pudełko 2 z 3")).toBeOnTheScreen();
  });
});
