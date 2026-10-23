import { setAudioModeAsync } from "expo-audio";
import { Stack } from "expo-router";
import { useEffect } from "react";

import { PillboxesProvider } from "@/features/pillboxes/store";

export default function RootLayout() {
  useEffect(() => {
    // Without playsInSilentMode the iOS silent switch mutes the reading; doNotMix pauses music so it is heard.
    // shortcut: no lock-screen controls, so Android stops background audio after ~3 min; add setActiveForLockScreen if a reading can get that long
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" }).catch((error: unknown) => {
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
        <Stack.Screen name="session" options={{ title: "Sesja" }} />
      </Stack>
    </PillboxesProvider>
  );
}
