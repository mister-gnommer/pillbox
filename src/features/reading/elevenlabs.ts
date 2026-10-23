import { fetch, type FetchRequestInit } from "expo/fetch";
import { File, Paths } from "expo-file-system";

// Premade voice from the ElevenLabs docs; premade voices work on the free tier.
const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const ENDPOINT = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_64`;
const STT_ENDPOINT = "https://api.elevenlabs.io/v1/speech-to-text";

/**
 * Turns text into slowed-down Polish speech with ElevenLabs and saves it as an mp3 in the cache.
 * Every failure is thrown as an `Error` whose message is a short Polish reason for the user.
 * @param text script to read, may contain `<break>` tags
 * @param apiKey user's ElevenLabs API key
 * @param signal aborts the request
 * @returns local file URI of the audio
 */
export async function synthesize(text: string, apiKey: string, signal?: AbortSignal): Promise<string> {
  const response = await post(ENDPOINT, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { speed: 0.8 } }),
    signal,
  });

  try {
    // shortcut: cache mp3s are never deleted, the OS purges them; add cleanup when caching across sessions lands
    const file = new File(Paths.cache, `reading-${Date.now()}.mp3`);
    await file.write(await response.bytes());
    return file.uri;
  } catch {
    throw new Error("Nie udało się pobrać nagrania");
  }
}

/**
 * Transcribes a Polish recording with ElevenLabs speech-to-text, biased towards the session commands.
 * Fails like `synthesize`, with a short Polish reason.
 * @param uri local file URI of the recording
 * @param apiKey user's ElevenLabs API key
 * @param signal aborts the request
 * @returns the transcript text
 */
export async function transcribe(uri: string, apiKey: string, signal?: AbortSignal): Promise<string> {
  const form = new FormData();
  form.append("model_id", "scribe_v2");
  form.append("language_code", "pl");
  // Tags like "(śmiech)" would count towards the 3-word limit of a command.
  form.append("tag_audio_events", "false");
  // A list field in multipart is sent as the same field repeated.
  for (const term of ["powtórz", "dalej", "stop"]) {
    form.append("keyterms", term);
  }
  // expo/fetch reads the bytes of an expo-file-system File; React Native's `{ uri, name, type }` form isn't supported.
  form.append("file", new File(uri));
  const response = await post(STT_ENDPOINT, { method: "POST", headers: { "xi-api-key": apiKey }, body: form, signal });

  const json: unknown = await response.json().catch(() => null);
  if (typeof json !== "object" || json === null || !("text" in json) || typeof json.text !== "string") {
    throw new Error("Nieoczekiwana odpowiedź ElevenLabs");
  }
  return json.text;
}

/**
 * Sends a request to ElevenLabs and turns network and HTTP failures into short Polish reasons.
 * @param url endpoint
 * @param init request options
 * @returns the successful response
 */
async function post(url: string, init: FetchRequestInit) {
  let response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new Error("Brak połączenia z internetem");
  }

  if (!response.ok) {
    // 401 covers a bad key, an exhausted quota, missing permissions and free-tier blocks; detail.status tells them apart.
    const detail = parseDetail(await response.text().catch(() => ""));
    if (response.status === 429 || detail.status === "quota_exceeded") {
      throw new Error("Limit ElevenLabs wyczerpany");
    }
    if (detail.status === "invalid_api_key") {
      throw new Error("Nieprawidłowy klucz API");
    }
    const suffix = detail.message ? `: ${detail.message}` : "";
    throw new Error(`Błąd ElevenLabs (${response.status})${suffix}`);
  }
  return response;
}

/**
 * Reads `detail.status` and `detail.message` from an ElevenLabs error body, if present.
 * @param body raw response text
 */
function parseDetail(body: string): { status?: string; message?: string } {
  try {
    const parsed: unknown = JSON.parse(body);
    const detail = typeof parsed === "object" && parsed !== null && "detail" in parsed ? parsed.detail : null;
    if (typeof detail !== "object" || detail === null) {
      return {};
    }
    return {
      status: "status" in detail && typeof detail.status === "string" ? detail.status : undefined,
      message: "message" in detail && typeof detail.message === "string" ? detail.message : undefined,
    };
  } catch {
    return {};
  }
}
