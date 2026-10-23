import type { Medication } from "@/features/pillboxes/store";

import { buildScript } from "./script";

const meds = (count: number): Medication[] =>
  Array.from({ length: count }, (_, i) => ({ id: `${i}`, name: `L${i + 1}`, amount: "" }));

test("reads the header, ordinals, amounts and pauses between medications", () => {
  const script = buildScript({
    id: "r",
    name: "Rano",
    medications: [
      { id: "1", name: "Metformina", amount: "1 tabletka" },
      { id: "2", name: "Witamina D", amount: "" },
    ],
  });
  expect(script).toBe(
    'Pudełko: Rano. Liczba leków: 2. Pierwszy: Metformina, 1 tabletka. <break time="1.5s" /> Drugi: Witamina D.',
  );
});

test("uses ordinal words up to ten, then 'Lek n'", () => {
  const script = buildScript({ id: "x", name: "X", medications: meds(11) });
  expect(script).toContain("Liczba leków: 11.");
  expect(script).toContain("Dziesiąty: L10.");
  expect(script).toMatch(/ Lek 11: L11\.$/);
  expect(script.match(/<break/g)).toHaveLength(10);
});
