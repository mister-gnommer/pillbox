import { Alert, Pressable, StyleSheet, Text } from "react-native";

/**
 * Asks "Na pewno?" before a destructive action.
 * @param name what is being deleted, shown as the message
 * @param onConfirm runs only when the user picks "Usuń"
 */
export function confirmDelete(name: string, onConfirm: () => void) {
  Alert.alert("Na pewno?", name, [
    { text: "Anuluj", style: "cancel" },
    { text: "Usuń", style: "destructive", onPress: onConfirm },
  ]);
}

type IconButtonProps = { glyph: string; label: string; onPress: () => void; disabled?: boolean };

/** Square text-glyph button with an accessible label, sized for a 48 dp touch target. */
export function IconButton({ glyph, label, onPress, disabled }: IconButtonProps) {
  return (
    <Pressable
      role="button"
      aria-label={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.iconButton, disabled && styles.disabled]}
    >
      <Text style={styles.glyph}>{glyph}</Text>
    </Pressable>
  );
}

type ButtonProps = { title: string; onPress: () => void; disabled?: boolean };

/** Full-width primary action button (add, save). */
export function Button({ title, onPress, disabled }: ButtonProps) {
  return (
    <Pressable role="button" disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.disabled]}>
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  empty: { fontSize: 18, textAlign: "center", marginVertical: 24 },
  row: { flexDirection: "row", alignItems: "center", minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth },
  rowMain: { flex: 1, justifyContent: "center", minHeight: 56, paddingVertical: 8 },
  name: { fontSize: 18 },
  amount: { fontSize: 15, opacity: 0.7 },
  label: { fontSize: 16 },
  input: { fontSize: 18, minHeight: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
  iconButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  glyph: { fontSize: 22 },
  button: { minHeight: 52, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#208AEF" },
  buttonText: { fontSize: 18, color: "white", fontWeight: "600" },
  disabled: { opacity: 0.3 },
});
