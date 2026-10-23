// TS 6 no longer auto-includes @types/*; this reference makes the jest globals visible to every test file.
/// <reference types="jest" />

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
