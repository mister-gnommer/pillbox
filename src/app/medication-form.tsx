import { router, Stack, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { usePillboxes } from "@/features/pillboxes/store";
import { Button, styles } from "@/features/pillboxes/ui";

export default function MedicationForm() {
  const { pillboxId, id } = useLocalSearchParams<{ pillboxId: string; id?: string }>();
  const { pillboxes, addMedication, updateMedication } = usePillboxes();
  const existing = pillboxes.find((p) => p.id === pillboxId)?.medications.find((m) => m.id === id);
  const [name, setName] = useState(existing?.name ?? "");
  const [amount, setAmount] = useState(existing?.amount ?? "");

  // A fast double tap would otherwise add twice and go back twice.
  const saved = useRef(false);
  const save = () => {
    if (saved.current) {
      return;
    }
    saved.current = true;
    if (existing) {
      updateMedication(pillboxId, existing.id, name, amount);
    } else {
      addMedication(pillboxId, name, amount);
    }
    router.back();
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: existing ? "Edytuj lek" : "Nowy lek" }} />
      <Text style={styles.label}>Nazwa</Text>
      <TextInput
        aria-label="Nazwa"
        style={styles.input}
        value={name}
        onChangeText={setName}
        autoFocus
        placeholder="np. Metformina"
      />
      <Text style={styles.label}>Ilość (opcjonalnie)</Text>
      <TextInput
        aria-label="Ilość"
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        placeholder="np. 1 tabletka"
      />
      <Button title="Zapisz" disabled={!name.trim()} onPress={save} />
    </View>
  );
}
