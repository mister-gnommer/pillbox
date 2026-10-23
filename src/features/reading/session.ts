import { router } from "expo-router";
import { Alert } from "react-native";

import { getApiKey } from "@/features/settings/apiKey";

/** Tells the user no ElevenLabs key is stored and offers a jump to settings. */
export function alertMissingKey() {
  Alert.alert("Brak klucza API ElevenLabs", "Dodaj klucz w ustawieniach.", [
    { text: "Anuluj", style: "cancel" },
    { text: "Przejdź do ustawień", onPress: () => router.push("/settings") },
  ]);
}

/**
 * Opens a reading session at a pillbox, or shows the missing-key alert when no key is stored.
 * @param pillboxId pillbox the session starts at
 */
export async function startSession(pillboxId: string) {
  if (!(await getApiKey())) {
    alertMissingKey();
    return;
  }
  router.push({ pathname: "/session", params: { start: pillboxId } });
}
