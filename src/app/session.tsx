import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useEffectEvent, useState } from "react";
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, useAnimatedValue, View } from "react-native";

import { type Pillbox, usePillboxes } from "@/features/pillboxes/store";
import { styles } from "@/features/pillboxes/ui";
import { useReader } from "@/features/reading/useReader";
import { useListener } from "@/features/voice/useListener";

type ControlProps = { glyph: string; label: string; onPress: () => void; disabled?: boolean };

/** Large full-width session control; the glyph is decoration, the label is the accessible name. */
function Control({ glyph, label, onPress, disabled }: ControlProps) {
  return (
    <Pressable
      role="button"
      aria-label={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, local.control, disabled && styles.disabled]}
    >
      <Text style={local.controlText}>{`${glyph}  ${label}`}</Text>
    </Pressable>
  );
}

/** Pulsing microphone shown while a spoken command is being listened for. */
function Listening() {
  const opacity = useAnimatedValue(1);
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);
  return (
    <Animated.Text aria-live="polite" style={[local.listening, { opacity }]}>
      🎤 Słucham…
    </Animated.Text>
  );
}

export default function Session() {
  const { start } = useLocalSearchParams<{ start: string }>();
  const { pillboxes } = usePillboxes();
  const [index, setIndex] = useState(() => pillboxes.findIndex((p) => p.id === start));
  const reader = useReader();
  // Undefined for an unknown start (index -1); not `.at()`, which would wrap to the last pillbox.
  const current: Pillbox | undefined = pillboxes[index];
  const empty = current?.medications.length === 0;

  const repeat = () => {
    if (current && !empty) {
      reader.read(current);
    }
  };

  const next = () => {
    reader.stop();
    if (index >= pillboxes.length - 1) {
      router.dismissTo("/");
    } else {
      setIndex(index + 1);
    }
  };

  const stop = () => {
    if (reader.status === "idle") {
      router.dismissTo("/");
    } else {
      reader.stop();
    }
  };

  // Voice runs the same handlers as the buttons.
  const listener = useListener((command) => ({ repeat, next, stop })[command]());
  // A tap first drops the listening window, so a transcript from it can't act too.
  const tap = (action: () => void) => () => {
    listener.cancel();
    action();
  };

  const arrive = useEffectEvent(() => {
    if (empty) {
      listener.listen();
    } else if (current) {
      reader.read(current);
    }
  });
  useEffect(() => arrive(), [current?.id]);

  const finished = useEffectEvent(() => listener.listen());
  useEffect(() => {
    if (reader.finishes > 0) {
      finished();
    }
  }, [reader.finishes]);

  if (!current) {
    return <Text style={styles.empty}>Nie znaleziono pudełka.</Text>;
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: current.name }} />
      <Text style={styles.label}>{`Pudełko ${index + 1} z ${pillboxes.length}`}</Text>
      <ScrollView style={local.status}>
        {empty ? <Text style={styles.empty}>Brak leków w tym pudełku</Text> : null}
        {current.medications.map((m, i) => (
          <View key={m.id} style={styles.row}>
            <Text style={styles.name}>{`${i + 1}. ${m.name}`}</Text>
            {m.amount ? <Text style={styles.amount}>{m.amount}</Text> : null}
          </View>
        ))}
        {reader.status === "loading" ? <ActivityIndicator size="large" aria-label="Pobieranie nagrania" /> : null}
      </ScrollView>
      {listener.listening ? <Listening /> : null}
      <Control glyph="↻" label="Powtórz" disabled={empty} onPress={tap(repeat)} />
      <Control glyph="⏭" label="Dalej" onPress={tap(next)} />
      <Control glyph="■" label="Stop" onPress={tap(stop)} />
    </View>
  );
}

const local = StyleSheet.create({
  status: { flex: 1 },
  control: { minHeight: 80 },
  controlText: { fontSize: 24, color: "white", fontWeight: "600" },
  listening: { fontSize: 24, textAlign: "center", paddingVertical: 8 },
});
