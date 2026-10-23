import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from "react-native";

import { usePillboxes } from "@/features/pillboxes/store";
import { Button, confirmDelete, IconButton, styles } from "@/features/pillboxes/ui";
import { synthesize } from "@/features/reading/elevenlabs";
import { buildScript } from "@/features/reading/script";
import { getApiKey } from "@/features/settings/apiKey";

export default function PillboxScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pillboxes, deleteMedication } = usePillboxes();
  const pillbox = pillboxes.find((p) => p.id === id);
  // Released on unmount, which also stops playback when leaving the screen.
  const player = useAudioPlayer(null);
  const { playing } = useAudioPlayerStatus(player);
  const [loading, setLoading] = useState(false);
  const [lastRead, setLastRead] = useState<{ script: string; uri: string } | null>(null);
  // The player is released on unmount; a download finishing after that must not touch it or alert.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  if (!pillbox) {
    return <Text style={styles.empty}>Nie znaleziono pudełka.</Text>;
  }
  const edit = (medicationId?: string) =>
    router.push({ pathname: "/medication-form", params: { pillboxId: pillbox.id, id: medicationId } });

  const read = async () => {
    if (pillbox.medications.length === 0) {
      Alert.alert("Brak leków w tym pudełku");
      return;
    }
    setLoading(true);
    try {
      const apiKey = await getApiKey();
      if (!apiKey) {
        Alert.alert("Brak klucza API ElevenLabs", "Dodaj klucz w ustawieniach.", [
          { text: "Anuluj", style: "cancel" },
          { text: "Przejdź do ustawień", onPress: () => router.push("/settings") },
        ]);
        return;
      }
      const script = buildScript(pillbox);
      if (lastRead?.script === script) {
        await player.seekTo(0);
      } else {
        const uri = await synthesize(script, apiKey);
        if (!mounted.current) {
          return;
        }
        setLastRead({ script, uri });
        player.replace({ uri });
      }
      player.play();
    } catch (error) {
      if (!mounted.current) {
        return;
      }
      Alert.alert("Nie udało się odczytać pudełka", error instanceof Error ? error.message : undefined, [
        { text: "Anuluj", style: "cancel" },
        { text: "Spróbuj ponownie", onPress: read },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const stop = () => {
    player.pause();
    player.seekTo(0).catch((error: unknown) => console.error("Could not rewind the reading", error));
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
      {loading ? (
        <ActivityIndicator size="large" aria-label="Pobieranie nagrania" />
      ) : (
        <Button title={playing ? "Zatrzymaj" : "Czytaj"} onPress={playing ? stop : read} />
      )}
      <Button title="Dodaj lek" onPress={() => edit()} />
    </View>
  );
}
