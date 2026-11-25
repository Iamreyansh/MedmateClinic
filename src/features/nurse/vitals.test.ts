/**
 * The vitals ranges.
 *
 * A reading is read against its range while the nurse types, so a number that
 * is out of range is seen before it is saved. These are the rules behind that
 * reading — the product's promise that a fever or a low saturation is marked
 * as it is typed.
 */
import { describe, expect, it } from "vitest";
import { readVital, VITAL_RANGES } from "@/features/nurse/types";

describe("reading a vital against its range", () => {
  it("says nothing when the number is missing", () => {
    expect(readVital("tempF", null)).toBeNull();
  });

  it("says nothing when the number is inside the range", () => {
    expect(readVital("tempF", 98.4)).toBeNull();
    expect(readVital("pulse", 72)).toBeNull();
    expect(readVital("spo2", 98)).toBeNull();
    expect(readVital("bpSystolic", 120)).toBeNull();
    expect(readVital("bpDiastolic", 80)).toBeNull();
    expect(readVital("breathRate", 16)).toBeNull();
    expect(readVital("sugarMg", 92)).toBeNull();
  });

  it("marks a temperature that is too high", () => {
    expect(readVital("tempF", 101.2)).toBe("high");
  });

  it("marks a temperature that is dangerously high", () => {
    expect(readVital("tempF", 104)).toBe("danger");
  });

  it("marks a temperature that is too low", () => {
    expect(readVital("tempF", 95)).toBe("low");
  });

  it("marks a pulse that is too fast, and one that is dangerously slow", () => {
    expect(readVital("pulse", 110)).toBe("high");
    expect(readVital("pulse", 42)).toBe("danger");
  });

  it("marks a saturation that is low, and one that is dangerous", () => {
    expect(readVital("spo2", 93)).toBe("low");
    expect(readVital("spo2", 88)).toBe("danger");
  });

  it("marks a blood pressure out of range", () => {
    expect(readVital("bpSystolic", 150)).toBe("high");
    expect(readVital("bpSystolic", 82)).toBe("low");
    expect(readVital("bpDiastolic", 95)).toBe("high");
    // a hypertensive crisis is a diastolic of 120 or more
    expect(readVital("bpDiastolic", 120)).toBe("danger");
  });

  it("marks a breathing rate out of range", () => {
    expect(readVital("breathRate", 24)).toBe("high");
    expect(readVital("breathRate", 10)).toBe("low");
  });

  it("marks a random sugar out of range", () => {
    expect(readVital("sugarMg", 160)).toBe("high");
    expect(readVital("sugarMg", 60)).toBe("low");
    expect(readVital("sugarMg", 240)).toBe("danger");
  });

  it("has a range to print for every reading the nurse types", () => {
    for (const field of [
      "tempF",
      "pulse",
      "spo2",
      "bpSystolic",
      "bpDiastolic",
      "breathRate",
      "weightKg",
      "heightCm",
      "sugarMg",
    ]) {
      expect(VITAL_RANGES[field]).toBeTruthy();
    }
  });
});
