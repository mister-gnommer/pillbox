import { Stack } from "expo-router";

import { PillboxesProvider } from "@/features/pillboxes/store";

export default function RootLayout() {
  return (
    <PillboxesProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: "Pudełka" }} />
        <Stack.Screen name="pillbox/[id]" options={{ title: "Pudełko" }} />
        <Stack.Screen name="pillbox-form" options={{ presentation: "modal", title: "Pudełko" }} />
        <Stack.Screen name="medication-form" options={{ presentation: "modal", title: "Lek" }} />
      </Stack>
    </PillboxesProvider>
  );
}
