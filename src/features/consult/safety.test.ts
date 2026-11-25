import { describe, expect, it } from "vitest";
import {
  acknowledgementsNeeded,
  blockingFindings,
  centorScore,
  safetyFindings,
  safetySummary,
} from "@/features/consult/safety";
import type { MedicineLine, VisitPatient } from "@/types/visit";

/** A patient with nothing on record, so each test states only what it means. */
function patient(overrides: Partial<VisitPatient> = {}): VisitPatient {
  return {
    id: "pt_1",
    name: "Kavya Nair",
    age: 34,
    sex: "F",
    phone: "9845001122",
    abha: "kavya.nair@abdm",
    allergies: [],
    conditions: [],
    ...overrides,
  };
}

function medicine(name: string, generic?: string): MedicineLine {
  return { name, generic, dose: "1 tablet", when: "Once a day", forDays: "3 days" };
}

describe("the safety checks", () => {
  it("finds nothing when there is nothing to find", () => {
    const findings = safetyFindings(patient(), [medicine("Paracetamol 650 mg tablet", "Paracetamol")]);
    expect(findings).toEqual([]);
    expect(safetySummary(findings)).toBe("Nothing to check before signing.");
  });

  it("blocks a medicine that clashes with an allergy on record", () => {
    const findings = safetyFindings(patient({ allergies: ["Penicillin"] }), [
      medicine("Amoxicillin 500 mg capsule", "Amoxicillin"),
    ]);

    expect(findings).toHaveLength(1);
    expect(findings[0].level).toBe("block");
    expect(findings[0].label).toBe("Allergy");
    expect(findings[0].message).toContain("Penicillin");
    expect(blockingFindings(findings)).toHaveLength(1);
  });

  it("blocks the amoxicillin family for a penicillin allergy", () => {
    const findings = safetyFindings(patient({ allergies: ["Penicillin (rash)"] }), [
      medicine("Amoxycillin 250 mg syrup", "Amoxicillin"),
    ]);

    expect(findings[0].level).toBe("block");
  });

  it("does not block a medicine that has nothing to do with the allergy", () => {
    const findings = safetyFindings(patient({ allergies: ["Penicillin"] }), [
      medicine("Paracetamol 650 mg tablet", "Paracetamol"),
    ]);

    expect(findings).toEqual([]);
  });

  it("warns about two medicines that should not be together", () => {
    const findings = safetyFindings(patient(), [
      medicine("Warfarin 5 mg tablet", "Warfarin"),
      medicine("Aspirin 75 mg tablet", "Aspirin"),
    ]);

    const interaction = findings.find((finding) => finding.label === "Interaction");
    expect(interaction).toBeDefined();
    expect(interaction?.level).toBe("warn");
    expect(interaction?.message).toContain("bleeding");
  });

  it("warns when the same medicine is prescribed twice", () => {
    const findings = safetyFindings(patient(), [
      medicine("Metformin 500 mg tablet", "Metformin"),
      medicine("Metformin 850 mg tablet", "Metformin"),
    ]);

    const duplicate = findings.find((finding) => finding.label === "Duplicate");
    expect(duplicate).toBeDefined();
    expect(duplicate?.message).toContain("2 times");
  });

  it("warns about an antibiotic for a sore throat and scores the Centor points", () => {
    const findings = safetyFindings(
      patient(),
      [medicine("Azithromycin 500 mg tablet", "Azithromycin")],
      [{ code: "J02.9", label: "Acute pharyngitis", kind: "primary" }],
      [
        {
          system: "Throat",
          findings: "Tonsillar swelling with exudate, tender cervical nodes, fever 102 °F",
        },
      ],
    );

    const antibiotic = findings.find((finding) => finding.label === "Antibiotic");
    expect(antibiotic).toBeDefined();
    expect(antibiotic?.message).toContain("Centor score");
    expect(antibiotic?.message).toContain("a bacterial cause is likely");
  });

  it("does not warn about an antibiotic when the illness is not a sore throat", () => {
    const findings = safetyFindings(patient(), [medicine("Azithromycin 500 mg tablet", "Azithromycin")], [
      { code: "J06.9", label: "Acute upper respiratory infection", kind: "primary" },
    ]);

    expect(findings.find((finding) => finding.label === "Antibiotic")).toBeUndefined();
  });

  it("notes diabetes when an antibiotic is prescribed", () => {
    const findings = safetyFindings(
      patient({ conditions: ["Type 2 diabetes"] }),
      [medicine("Azithromycin 500 mg tablet", "Azithromycin")],
    );

    const note = findings.find((finding) => finding.level === "info");
    expect(note).toBeDefined();
    expect(note?.message).toContain("Type 2 diabetes");
  });

  it("counts what has to be acknowledged, and leaves notes out of the count", () => {
    const findings = safetyFindings(
      patient({ conditions: ["Type 2 diabetes"] }),
      [medicine("Azithromycin 500 mg tablet", "Azithromycin")],
      [{ code: "J02.9", label: "Acute pharyngitis", kind: "primary" }],
    );

    // The antibiotic warning counts; the diabetes note does not.
    expect(acknowledgementsNeeded(findings)).toBe(1);
  });

  it("counts a note on its own as nothing to acknowledge", () => {
    const findings = safetyFindings(
      patient({ conditions: ["Type 2 diabetes"] }),
      [medicine("Azithromycin 500 mg tablet", "Azithromycin")],
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].level).toBe("info");
    expect(acknowledgementsNeeded(findings)).toBe(0);
  });

  it("counts a block as something to fix, not something to check", () => {
    const findings = safetyFindings(patient({ allergies: ["Penicillin"] }), [
      medicine("Amoxicillin 500 mg capsule", "Amoxicillin"),
    ]);

    expect(safetySummary(findings)).toBe("1 thing to fix before signing.");
  });
});

describe("the Centor score", () => {
  it("scores zero when no signs are recorded", () => {
    const score = centorScore([]);
    expect(score.score).toBe(0);
    expect(score.reading).toBe("a bacterial cause is unlikely");
  });

  it("counts each sign once", () => {
    const score = centorScore([
      { system: "Throat", findings: "Tonsillar swelling with exudate" },
      { system: "Neck", findings: "Tender cervical nodes" },
    ]);

    // Swollen tonsils and exudate are two points; the neck is the third.
    expect(score.score).toBe(3);
    expect(score.points).toHaveLength(3);
  });

  it("counts fever as a point", () => {
    const score = centorScore([{ system: "General", findings: "Fever 102 °F" }]);
    expect(score.score).toBe(1);
    expect(score.points[0]).toContain("fever");
  });

  it("does not count a normal temperature as fever", () => {
    const score = centorScore([{ system: "General", findings: "Fever 99.8 °F" }]);
    expect(score.score).toBe(0);
  });

  it("reads three as sitting on the line", () => {
    const score = centorScore([
      { system: "Throat", findings: "Tonsils enlarged" },
      { system: "Neck", findings: "Tender cervical nodes" },
      { system: "General", findings: "Fever 101 °F" },
    ]);

    expect(score.score).toBe(3);
    expect(score.reading).toContain("sit on the line");
  });
});
