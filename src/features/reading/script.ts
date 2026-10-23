import type { Pillbox } from "@/features/pillboxes/store";

const ORDINALS = ["Pierwszy", "Drugi", "Trzeci", "Czwarty", "Piąty", "Szósty", "Siódmy", "Ósmy", "Dziewiąty", "Dziesiąty"];
// ElevenLabs SSML-style pause; eleven_multilingual_v2 supports up to 3 s.
const BREAK = ' <break time="1.5s" /> ';

/**
 * Builds the Polish text read aloud for a pillbox: its name, the count, then each medication
 * with an ordinal, name and amount, separated by pauses.
 * @param pillbox pillbox to read
 * @returns text to send to ElevenLabs
 */
export function buildScript(pillbox: Pillbox): string {
  // shortcut: relies on TTS number normalization ("2" -> "dwa"), spell out in code if it mispronounces
  const header = `Pudełko: ${pillbox.name}. Liczba leków: ${pillbox.medications.length}.`;
  const lines = pillbox.medications.map((m, i) => {
    const intro = ORDINALS[i] ?? `Lek ${i + 1}`;
    return m.amount ? `${intro}: ${m.name}, ${m.amount}.` : `${intro}: ${m.name}.`;
  });
  return `${header} ${lines.join(BREAK)}`;
}
