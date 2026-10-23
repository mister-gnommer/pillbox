import { File } from "expo-file-system";

import { synthesize } from "./elevenlabs";

// Untyped on purpose: tests return partial responses with only the fields synthesize reads.
const mockFetch = jest.fn();
jest.mock("expo/fetch", () => ({ fetch: (...args: unknown[]) => mockFetch(...args) }));
jest.mock("expo-file-system", () => ({
  Paths: { cache: "file:///cache" },
  File: jest.fn().mockImplementation((dir: string, name: string) => ({
    uri: `${dir}/${name}`,
    write: jest.fn().mockResolvedValue(undefined),
  })),
}));

/**
 * Makes the mocked fetch resolve with a response of the given status and body.
 * @param status HTTP status
 * @param body response body text
 */
function respond(status: number, body = "") {
  const bytes = new Uint8Array([1, 2, 3]);
  mockFetch.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
    bytes: async () => bytes,
  });
  return bytes;
}

test("posts the script and saves the returned audio to a cache file", async () => {
  const bytes = respond(200);

  const uri = await synthesize("Pudełko: Rano.", "secret");

  const [url, init] = mockFetch.mock.calls[0];
  expect(url).toBe("https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb?output_format=mp3_44100_64");
  expect(init?.method).toBe("POST");
  expect(init?.headers).toEqual({ "xi-api-key": "secret", "Content-Type": "application/json" });
  expect(JSON.parse(String(init?.body))).toEqual({
    text: "Pudełko: Rano.",
    model_id: "eleven_multilingual_v2",
    voice_settings: { speed: 0.8 },
  });
  const file = jest.mocked(File).mock.results[0].value;
  expect(file.write).toHaveBeenCalledWith(bytes);
  expect(uri).toBe(file.uri);
  expect(uri).toMatch(/^file:\/\/\/cache\/reading-\d+\.mp3$/);
});

test.each([
  [401, '{"detail":{"status":"invalid_api_key","message":"Invalid API key"}}', "Nieprawidłowy klucz API"],
  [401, '{"detail":{"status":"detected_unusual_activity","message":"Unusual activity"}}', "Błąd ElevenLabs (401): Unusual activity"],
  [401, "", "Błąd ElevenLabs (401)"],
  [401, '{"detail":{"status":"quota_exceeded"}}', "Limit ElevenLabs wyczerpany"],
  [429, "", "Limit ElevenLabs wyczerpany"],
  [500, "", "Błąd ElevenLabs (500)"],
])("maps HTTP %i %s to a Polish reason", async (status, body, reason) => {
  respond(status, body);
  await expect(synthesize("x", "k")).rejects.toThrow(reason);
});

test("maps a network failure to a connection reason", async () => {
  mockFetch.mockRejectedValue(new TypeError("Network request failed"));
  await expect(synthesize("x", "k")).rejects.toThrow("Brak połączenia z internetem");
});

test("passes the abort signal to fetch", async () => {
  respond(200);
  const controller = new AbortController();

  await synthesize("x", "k", controller.signal);

  expect(mockFetch.mock.lastCall?.[1]?.signal).toBe(controller.signal);
});
