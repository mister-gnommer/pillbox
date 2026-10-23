export type Command = "repeat" | "next" | "stop";

const WORDS: Record<string, Command> = { powtorz: "repeat", dalej: "next", stop: "stop" };

/**
 * Finds the session command in a short transcript, ignoring case, punctuation and Polish diacritics.
 * @param text transcript of what the user said
 * @returns the command when the transcript has 1–3 words and exactly one distinct command, else null
 */
export function parseCommand(text: string): Command | null {
  const words = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0 || words.length > 3) {
    return null;
  }
  const commands = new Set(words.flatMap((word) => WORDS[word] ?? []));
  return commands.size === 1 ? [...commands][0] : null;
}
