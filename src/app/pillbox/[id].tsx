import { router, Stack, useLocalSearchParams } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";

import { usePillboxes } from "@/features/pillboxes/store";
import { Button, confirmDelete, IconButton, styles } from "@/features/pillboxes/ui";

export default function PillboxScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pillboxes, deleteMedication } = usePillboxes();
  const pillbox = pillboxes.find((p) => p.id === id);

  if (!pillbox) {
    return <Text style={styles.empty}>Nie znaleziono pudełka.</Text>;
  }
  const edit = (medicationId?: string) =>
    router.push({ pathname: "/medication-form", params: { pillboxId: pillbox.id, id: medicationId } });

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
      <Button title="Dodaj lek" onPress={() => edit()} />
    </View>
  );
}
