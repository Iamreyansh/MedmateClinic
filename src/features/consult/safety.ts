/**
 * The safety checks.
 *
 * Before a prescription is signed, the doctor is asked to look at it once more.
 * These are the checks that list is made of: does this medicine clash with an
 * allergy on record, does it clash with another medicine on the same
 * prescription, and is an antibiotic the right call for these symptoms.
 *
 * The engine lives here, apart from the screen, because a rule that is buried in
 * a component cannot be tested. The consult screen asks this module what to
 * warn about; the sign dialog shows the answer.
 */

import { ALLERGY_CLASHES, ANTIBIOTICS, DUPLICATES, INTERACTIONS } from "@/features/consult/safetyRules";
import type { DiagnosisLine, MedicineLine, VisitPatient } from "@/types/visit";

/** How serious a finding is. `block` means the medicine should not go on. */
export type SafetyLevel = "block" | "warn" | "info";

export type SafetyFinding = {
  /** A stable key, so the same finding is the same finding on every render. */
  id: string;
  level: SafetyLevel;
  /** The short label on the badge — "Allergy", "Interaction", "Antibiotic". */
  label: string;
  /** The sentence the doctor reads. */
  message: string;
  /** The medicine the finding is about, when it is about one. */
  medicine?: string;
};

/** The generic names of the medicines on the prescription, lowercased. */
function genericNames(medicines: MedicineLine[]): string[] {
  return medicines
    .flatMap((medicine) => [medicine.name, medicine.generic])
    .filter((name): name is string => Boolean(name))
    .map((name) => name.toLowerCase());
}

/** Does a medicine name match a generic? Substring, so "azithromycin 500" matches. */
function mentions(names: string[], generic: string): boolean {
  return names.some((name) => name.includes(generic));
}

/**
 * The Centor score — how likely a sore throat is bacterial.
 *
 * Each point counts for one: tonsillar swelling, exudate on the tonsils, tender
 * cervical nodes, and fever above 38 °C. The score is a guide, not a verdict,
 * so it is reported as a warning and never blocks the prescription.
 */
export type CentorScore = {
  score: number;
  points: string[];
  /** What the score means, in words the doctor can act on. */
  reading: string;
};

/**
 * The Centor score for this visit.
 *
 * The signs come from the examination that was recorded. A complaint of "sore
 * throat" alone is not a point — the score is about signs.
 */
export function centorScore(examination: Array<Record<string, string>>): CentorScore {
  const points: string[] = [];

  const text = examination
    .map((entry) => Object.values(entry).join(" ").toLowerCase())
    .join(" · ");

  const has = (word: string) => text.includes(word);

  if (has("exudate")) points.push("exudate on the tonsils");
  if (has("tonsillar swelling") || has("swollen tonsil") || has("tonsils enlarged")) {
    points.push("swollen tonsils");
  }
  if (has("tender node") || has("tender cervical")) points.push("tender neck nodes");

  // A temperature above 38 °C (100.4 °F) is the fourth point. The note may
  // be in either scale, so the number is read against both.
  const fever = examination.some((entry) => {
    const values = Object.values(entry).join(" ").toLowerCase();
    if (!values.includes("fever")) return false;
    const numbers = values.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    return numbers.some((value) => (value >= 100.4 && value <= 115) || (value >= 38 && value < 41));
  });
  if (fever) points.push("fever above 38 °C");

  const score = points.length;

  const reading =
    score >= 4
      ? "a bacterial cause is likely — an antibiotic is reasonable"
      : score === 3
        ? "a bacterial cause is possible — the signs sit on the line"
        : score === 2
          ? "a bacterial cause is less likely"
          : "a bacterial cause is unlikely";

  return { score, points, reading };
}

/**
 * Every finding for this prescription.
 *
 * The checks run in the order the doctor should read them: a clash that blocks
 * comes before a warning, and a warning comes before a note.
 */
export function safetyFindings(
  patient: VisitPatient | null,
  medicines: MedicineLine[],
  diagnoses: DiagnosisLine[] = [],
  examination: Array<Record<string, string>> = [],
): SafetyFinding[] {
  const findings: SafetyFinding[] = [];
  const names = genericNames(medicines);
  const name = patient?.name ?? "This patient";

  // 1 · An allergy on record that this medicine runs into.
  for (const recorded of patient?.allergies ?? []) {
    const allergy = recorded.toLowerCase();
    for (const rule of ALLERGY_CLASHES) {
      if (!allergy.includes(rule.allergen)) continue;
      for (const clash of rule.clashes) {
        if (!mentions(names, clash)) continue;
        findings.push({
          id: `allergy-${rule.allergen}-${clash}`,
          level: "block",
          label: "Allergy",
          medicine: clash,
          message: `${name} is recorded as allergic to ${recorded} — ${clash} must not be prescribed. (${rule.note}.)`,
        });
      }
    }
  }

  // 2 · Two medicines on one prescription that should not be together.
  for (const rule of INTERACTIONS) {
    if (!mentions(names, rule.a) || !mentions(names, rule.b)) continue;
    findings.push({
      id: `interaction-${rule.a}-${rule.b}`,
      level: "warn",
      label: "Interaction",
      message: `Check ${rule.a} and ${rule.b} together — ${rule.reason}.`,
    });
  }

  // 3 · The same medicine twice.
  for (const rule of DUPLICATES) {
    const count = medicines.filter((medicine) =>
      [medicine.name, medicine.generic].some((value) => value?.toLowerCase().includes(rule.drug)),
    ).length;
    if (count <= 1) continue;
    findings.push({
      id: `dup-${rule.drug}`,
      level: "warn",
      label: "Duplicate",
      medicine: rule.drug,
      message: `${rule.drug} appears ${count} times on this prescription — ${rule.reason}.`,
    });
  }

  // 4 · An antibiotic for a sore throat that may not be bacterial.
  const hasAntibiotic = names.some((value) => ANTIBIOTICS.some((drug) => value.includes(drug)));
  const isSoreThroat =
    diagnoses.some((diagnosis) => /pharyngitis|tonsillitis|sore throat/i.test(diagnosis.label)) ||
    examination.some((entry) => Object.values(entry).join(" ").toLowerCase().includes("throat"));

  if (hasAntibiotic && isSoreThroat) {
    const centor = centorScore(examination);
    findings.push({
      id: "antibiotic-sore-throat",
      level: "warn",
      label: "Antibiotic",
      message:
        `Antibiotic for a sore throat: is a bacterial cause likely? ` +
        `(Centor score ${centor.score} — ${centor.reading}. ` +
        `${centor.points.length ? `Points: ${centor.points.join(", ")}.` : "No Centor points recorded."})`,
    });
  }

  // 5 · A note, not a warning: the patient's own conditions.
  const conditions = patient?.conditions ?? [];
  const diabetes = conditions.find((condition) => /diabet/i.test(condition));
  if (diabetes && hasAntibiotic) {
    findings.push({
      id: "diabetes-antibiotic",
      level: "info",
      label: "Note",
      message: `${name} has ${diabetes}. Check the sugar before and during the antibiotic course.`,
    });
  }

  return findings;
}

/** The findings that stop the prescription being signed until the doctor says so. */
export function blockingFindings(findings: SafetyFinding[]): SafetyFinding[] {
  return findings.filter((finding) => finding.level === "block");
}

/** How many findings the doctor has to acknowledge before signing. */
export function acknowledgementsNeeded(findings: SafetyFinding[]): number {
  return findings.filter((finding) => finding.level !== "info").length;
}

/** The one-line summary the consult screen shows above the sign button. */
export function safetySummary(findings: SafetyFinding[]): string {
  if (findings.length === 0) return "Nothing to check before signing.";
  const blocking = blockingFindings(findings).length;
  if (blocking > 0) {
    return `${blocking} thing${blocking === 1 ? "" : "s"} to fix before signing.`;
  }
  const count = acknowledgementsNeeded(findings);
  return `${count} thing${count === 1 ? "" : "s"} to check before signing.`;
}
