import { useEventListener } from "expo";
import { type AudioMode, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

import type { Pillbox } from "@/features/pillboxes/store";
import { synthesize } from "@/features/reading/elevenlabs";
import { buildScript } from "@/features/reading/script";
import { alertMissingKey } from "@/features/reading/session";
import { getApiKey } from "@/features/settings/apiKey";

// Without playsInSilentMode the iOS silent switch mutes the reading; doNotMix pauses music so it is heard.
// Spread it when changing one field: iOS resets every field left out of a setAudioModeAsync call.
export const PLAYBACK_MODE: Partial<AudioMode> = {
  playsInSilentMode: true,
  shouldPlayInBackground: true,
  interruptionMode: "doNotMix",
};

/**
 * Reads pillboxes aloud with one audio player. Audio downloaded by this hook is reused for the
 * same script, and a new read, a stop or unmounting aborts the download in progress.
 * @returns the reading status, `finishes` (counts readings played to the end, not stops),
 * plus `read` (assumes a pillbox with medications) and `stop`
 */
export function useReader() {
  // Released on unmount, which also stops playback when leaving the screen.
  const player = useAudioPlayer(null);
  const { playing } = useAudioPlayerStatus(player);
  const [loading, setLoading] = useState(false);
  // Counted from the event: the status state can batch a didJustFinish:true away before it renders.
  const [finishes, setFinishes] = useState(0);
  useEventListener(player, "playbackStatusUpdate", (status) => {
    if (status.didJustFinish) {
      setFinishes((n) => n + 1);
    }
  });
  const cache = useRef(new Map<string, string>());
  const download = useRef<AbortController | null>(null);
  // An aborted read returns without touching the released player or alerting.
  useEffect(() => () => download.current?.abort(), []);

  const read = async (pillbox: Pillbox) => {
    download.current?.abort();
    const controller = new AbortController();
    download.current = controller;
    setLoading(true);
    try {
      const apiKey = await getApiKey();
      if (!apiKey) {
        alertMissingKey();
        return;
      }
      const script = buildScript(pillbox);
      const uri = cache.current.get(script) ?? (await synthesize(script, apiKey, controller.signal));
      // A mid-download abort can still resolve (e.g. while the file is being written).
      if (controller.signal.aborted) {
        return;
      }
      cache.current.set(script, uri);
      player.replace({ uri });
      await player.seekTo(0);
      if (controller.signal.aborted) {
        return;
      }
      player.play();
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      Alert.alert("Nie udało się odczytać pudełka", error instanceof Error ? error.message : undefined, [
        { text: "Anuluj", style: "cancel" },
        { text: "Spróbuj ponownie", onPress: () => read(pillbox) },
      ]);
    } finally {
      // A newer read owns the spinner now.
      if (download.current === controller) {
        setLoading(false);
      }
    }
  };

  const stop = () => {
    download.current?.abort();
    player.pause();
    player.seekTo(0).catch((error: unknown) => console.error("Could not rewind the reading", error));
  };

  const status = loading ? "loading" : playing ? "playing" : "idle";
  return { status, finishes, read, stop };
}
