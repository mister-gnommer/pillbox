import { setAudioModeAsync } from "expo-audio";
import { Stack } from "expo-router";
import { useEffect } from "react";

import { PillboxesProvider } from "@/features/pillboxes/store";

export default function RootLayout() {
  useEffect(() => {
    // Without this the iOS silent switch mutes the reading.
    setAudioModeAsync({ playsInSilentMode: true }).catch((error: unknown) => {
      console.error("Could not set the audio mode", error);
    });
  }, []);

  return (
    <PillboxesProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: "Pudełka" }} />
        <Stack.Screen name="pillbox/[id]" options={{ title: "Pudełko" }} />
        <Stack.Screen name="pillbox-form" options={{ presentation: "modal", title: "Pudełko" }} />
        <Stack.Screen name="medication-form" options={{ presentation: "modal", title: "Lek" }} />
        <Stack.Screen name="settings" options={{ title: "Ustawienia" }} />
      </Stack>
    </PillboxesProvider>
  );
}
