import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { useEffect, useRef, useState } from "react";

import { transcribe } from "@/features/reading/elevenlabs";
import { PLAYBACK_MODE } from "@/features/reading/useReader";
import { getApiKey } from "@/features/settings/apiKey";
import { type Command, parseCommand } from "@/features/voice/command";

const WINDOW_MS = 5000;

/**
 * Resolves after `ms`, or as soon as the signal aborts.
 * @param ms how long to wait
 * @param signal cuts the wait short
 */
function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * Listens for one spoken session command at a time. Asks for the microphone on mount and allows
 * recording while mounted. Denied permission and every failure are silent: listening just ends.
 * @param onCommand runs the recognised command
 * @returns `listening` plus `listen` (one 5 s window, then transcription) and `cancel`, which drops any late transcript
 */
export function useListener(onCommand: (command: Command) => void) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [listening, setListening] = useState(false);
  const granted = useRef<Promise<boolean>>(Promise.resolve(false));
  const active = useRef<AbortController | null>(null);
  // A window outlives the render that opened it, so the transcript runs the newest handler.
  const latest = useRef(onCommand);
  useEffect(() => {
    latest.current = onCommand;
  });

  useEffect(() => {
    granted.current = requestRecordingPermissionsAsync().then(
      (permission) => permission.granted,
      () => false,
    );
    const log = (error: unknown) => console.error("Could not set the audio mode", error);
    setAudioModeAsync({ ...PLAYBACK_MODE, allowsRecording: true }).catch(log);
    return () => {
      active.current?.abort();
      setAudioModeAsync(PLAYBACK_MODE).catch(log);
    };
  }, []);

  const listen = async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    const { signal } = controller;
    try {
      const apiKey = await getApiKey();
      if (!(await granted.current) || !apiKey || signal.aborted) {
        return;
      }
      await recorder.prepareToRecordAsync();
      if (signal.aborted) {
        return;
      }
      recorder.record();
      setListening(true);
      // An abort ends the wait early, so a tap stops the recorder right away.
      await wait(WINDOW_MS, signal);
      await recorder.stop();
      if (signal.aborted || !recorder.uri) {
        return;
      }
      const command = parseCommand(await transcribe(recorder.uri, apiKey, signal));
      // A transcript can still arrive after a tap aborted the request.
      if (command && !signal.aborted) {
        latest.current(command);
      }
    } catch (error) {
      if (!signal.aborted) {
        console.error("Listening failed", error);
      }
    } finally {
      if (active.current === controller) {
        active.current = null;
        setListening(false);
      }
    }
  };

  const cancel = () => {
    active.current?.abort();
    active.current = null;
    setListening(false);
  };

  return { listening, listen, cancel };
}
