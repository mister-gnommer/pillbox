import { useEffect, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";

import { Button, styles } from "@/features/pillboxes/ui";
import { clearApiKey, getApiKey, saveApiKey } from "@/features/settings/apiKey";

export default function Settings() {
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    getApiKey()
      .then(setSavedKey)
      .catch((error: unknown) => console.error("Could not read the API key", error));
  }, []);

  const save = async () => {
    try {
      await saveApiKey(input);
      setSavedKey(input.trim());
      setInput("");
    } catch {
      Alert.alert("Nie udało się zapisać klucza");
    }
  };

  const clear = async () => {
    try {
      await clearApiKey();
      setSavedKey(null);
    } catch {
      Alert.alert("Nie udało się usunąć klucza");
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.name}>{savedKey ? `Klucz zapisany (…${savedKey.slice(-4)})` : "Brak klucza"}</Text>
      <Text style={styles.label}>Klucz API ElevenLabs</Text>
      <TextInput
        aria-label="Klucz API ElevenLabs"
        style={styles.input}
        value={input}
        onChangeText={setInput}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Button title="Zapisz" disabled={!input.trim()} onPress={save} />
      {savedKey ? <Button title="Usuń klucz" onPress={clear} /> : null}
    </View>
  );
}
