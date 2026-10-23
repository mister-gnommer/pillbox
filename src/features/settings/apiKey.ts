import * as SecureStore from "expo-secure-store";

const KEY = "elevenlabs-api-key";

/** Returns the stored ElevenLabs API key, or null when none is saved. */
export const getApiKey = () => SecureStore.getItemAsync(KEY);

/**
 * Stores the ElevenLabs API key in secure storage, trimmed.
 * @param apiKey key as typed by the user
 */
export const saveApiKey = (apiKey: string) => SecureStore.setItemAsync(KEY, apiKey.trim());

/** Removes the stored ElevenLabs API key. */
export const clearApiKey = () => SecureStore.deleteItemAsync(KEY);
