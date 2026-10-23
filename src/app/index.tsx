import { router, Stack } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";

import { usePillboxes } from "@/features/pillboxes/store";
import { Button, confirmDelete, IconButton, styles } from "@/features/pillboxes/ui";

export default function PillboxList() {
  const { pillboxes, movePillbox, deletePillbox } = usePillboxes();

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerRight: () => <IconButton glyph="⚙" label="Ustawienia" onPress={() => router.push("/settings")} />,
        }}
      />
      <FlatList
        data={pillboxes}
        keyExtractor={(p) => p.id}
        ListEmptyComponent={<Text style={styles.empty}>Nie masz jeszcze żadnych pudełek.</Text>}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Pressable
              role="button"
              style={styles.rowMain}
              onPress={() => router.push({ pathname: "/pillbox/[id]", params: { id: item.id } })}
            >
              <Text style={styles.name}>{item.name}</Text>
            </Pressable>
            <IconButton
              glyph="↑"
              label={`W górę: ${item.name}`}
              disabled={index === 0}
              onPress={() => movePillbox(item.id, -1)}
            />
            <IconButton
              glyph="↓"
              label={`W dół: ${item.name}`}
              disabled={index === pillboxes.length - 1}
              onPress={() => movePillbox(item.id, 1)}
            />
            <IconButton
              glyph="✎"
              label={`Zmień nazwę: ${item.name}`}
              onPress={() => router.push({ pathname: "/pillbox-form", params: { id: item.id } })}
            />
            <IconButton
              glyph="🗑"
              label={`Usuń: ${item.name}`}
              onPress={() => confirmDelete(item.name, () => deletePillbox(item.id))}
            />
          </View>
        )}
      />
      <Button title="Dodaj pudełko" onPress={() => router.push("/pillbox-form")} />
    </View>
  );
}
