import { router, Stack, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { usePillboxes } from "@/features/pillboxes/store";
import { Button, styles } from "@/features/pillboxes/ui";

export default function PillboxForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { pillboxes, addPillbox, renamePillbox } = usePillboxes();
  const existing = pillboxes.find((p) => p.id === id);
  const [name, setName] = useState(existing?.name ?? "");

  // A fast double tap would otherwise add twice and go back twice.
  const saved = useRef(false);
  const save = () => {
    if (saved.current) {
      return;
    }
    saved.current = true;
    if (existing) {
      renamePillbox(existing.id, name);
    } else {
      addPillbox(name);
    }
    router.back();
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: existing ? "Zmień nazwę" : "Nowe pudełko" }} />
      <Text style={styles.label}>Nazwa</Text>
      <TextInput
        aria-label="Nazwa"
        style={styles.input}
        value={name}
        onChangeText={setName}
        autoFocus
        placeholder="np. Rano"
      />
      <Button title="Zapisz" disabled={!name.trim()} onPress={save} />
    </View>
  );
}
