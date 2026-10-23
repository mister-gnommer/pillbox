import { router, Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from "react-native";

import { usePillboxes } from "@/features/pillboxes/store";
import { Button, confirmDelete, IconButton, styles } from "@/features/pillboxes/ui";
import { startSession } from "@/features/reading/session";
import { useReader } from "@/features/reading/useReader";

export default function PillboxScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pillboxes, deleteMedication } = usePillboxes();
  const pillbox = pillboxes.find((p) => p.id === id);
  const reader = useReader();

  if (!pillbox) {
    return <Text style={styles.empty}>Nie znaleziono pudełka.</Text>;
  }
  const edit = (medicationId?: string) =>
    router.push({ pathname: "/medication-form", params: { pillboxId: pillbox.id, id: medicationId } });

  const read = () => {
    if (pillbox.medications.length === 0) {
      Alert.alert("Brak leków w tym pudełku");
      return;
    }
    reader.read(pillbox);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: pillbox.name }} />
      <FlatList
        data={pillbox.medications}
        keyExtractor={(m) => m.id}
        ListEmptyComponent={<Text style={styles.empty}>To pudełko jest puste.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable role="button" style={styles.rowMain} onPress={() => edit(item.id)}>
              <Text style={styles.name}>{item.name}</Text>
              {item.amount ? <Text style={styles.amount}>{item.amount}</Text> : null}
            </Pressable>
            <IconButton glyph="✎" label={`Edytuj: ${item.name}`} onPress={() => edit(item.id)} />
            <IconButton
              glyph="🗑"
              label={`Usuń: ${item.name}`}
              onPress={() => confirmDelete(item.name, () => deleteMedication(pillbox.id, item.id))}
            />
          </View>
        )}
      />
      {reader.status === "loading" ? (
        <ActivityIndicator size="large" aria-label="Pobieranie nagrania" />
      ) : (
        <Button
          title={reader.status === "playing" ? "Zatrzymaj" : "Czytaj"}
          onPress={reader.status === "playing" ? reader.stop : read}
        />
      )}
      <Button
        title="Start"
        onPress={() => {
          // This screen stays mounted under the session; its own reading must not overlap.
          reader.stop();
          startSession(pillbox.id);
        }}
      />
      <Button title="Dodaj lek" onPress={() => edit()} />
    </View>
  );
}
