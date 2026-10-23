import { parseCommand } from "./command";

test.each([
  ["Dalej.", "next"],
  ["POWTÓRZ", "repeat"],
  ["powtorz", "repeat"],
  ["stop!", "stop"],
  ["no dalej", "next"],
  ["dalej, dalej", "next"],
  ["dalej stop", null],
  ["", null],
  ["  ...  ", null],
  ["no to teraz dalej", null],
  ["jutro", null],
  ["stopień", null],
])("%j → %s", (text, command) => {
  expect(parseCommand(text)).toBe(command);
});
