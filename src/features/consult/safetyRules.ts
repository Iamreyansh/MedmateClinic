/**
 * The rules the safety checks run on.
 *
 * They live apart from the screen and apart from the engine, because a rule is
 * a fact about medicines — not about the product — and it should be readable
 * on its own and changed on its own.
 *
 * The lists are deliberately small. A checker that guesses about a drug it has
 * not been taught is worse than no checker: it either misses a real clash or
 * invents one, and both cost the doctor trust in the whole panel.
 */

/**
 * The allergies the checker knows how to reason about.
 *
 * The key is a fragment of the allergy as it is written on the record, so
 * "Penicillin (rash)" matches.
 */
export const ALLERGY_CLASHES: Array<{
  allergen: string;
  clashes: string[];
  note: string;
}> = [
  {
    allergen: "penicillin",
    clashes: ["amoxicillin", "amoxycillin", "benzylpenicillin", "penicillin"],
    note: "a penicillin allergy also rules out the amoxicillin family",
  },
  {
    allergen: "amoxicillin",
    clashes: ["amoxicillin", "amoxycillin"],
    note: "the amoxicillin family is on the allergy",
  },
  {
    allergen: "cephalexin",
    clashes: ["cephalexin", "cefuroxime", "ceftriaxone", "cefixime"],
    note: "a cephalosporin allergy rules out this class",
  },
  {
    allergen: "sulfa",
    clashes: ["sulfamethoxazole", "co-trimoxazole", "cotrimoxazole"],
    note: "a sulfa allergy rules out the co-trimoxazole family",
  },
  {
    allergen: "aspirin",
    clashes: ["aspirin", "acetylsalicylic"],
    note: "aspirin is on the allergy",
  },
  {
    allergen: "ibuprofen",
    clashes: ["ibuprofen", "naproxen", "diclofenac"],
    note: "an NSAID allergy rules out this class",
  },
  {
    allergen: "metformin",
    clashes: ["metformin"],
    note: "metformin is on the allergy",
  },
  {
    allergen: "azithromycin",
    clashes: ["azithromycin"],
    note: "azithromycin is on the allergy",
  },
  {
    allergen: "chlorhexidine",
    clashes: ["chlorhexidine"],
    note: "chlorhexidine is on the allergy",
  },
];

/**
 * The medicine pairs that should not be on one prescription together.
 *
 * Each pair carries the reason, so the doctor is told why and not only told no.
 */
export const INTERACTIONS: Array<{ a: string; b: string; reason: string }> = [
  {
    a: "warfarin",
    b: "aspirin",
    reason: "bleeding risk — warfarin and aspirin together",
  },
  {
    a: "warfarin",
    b: "ibuprofen",
    reason: "bleeding risk — warfarin and ibuprofen together",
  },
  {
    a: "warfarin",
    b: "diclofenac",
    reason: "bleeding risk — warfarin and diclofenac together",
  },
  {
    a: "clarithromycin",
    b: "simvastatin",
    reason: "clarithromycin raises simvastatin levels — the risk is rhabdomyolysis",
  },
  {
    a: "azithromycin",
    b: "digoxin",
    reason: "azithromycin can raise digoxin levels",
  },
  {
    a: "sildenafil",
    b: "nitroglycerin",
    reason: "the blood pressure can fall too far",
  },
  {
    a: "lisinopril",
    b: "spironolactone",
    reason: "the potassium can rise too far",
  },
];

/** The medicines that must not appear twice on one prescription. */
export const DUPLICATES: Array<{ drug: string; reason: string }> = [
  { drug: "metformin", reason: "the dose would be doubled — metformin is already on the prescription" },
  { drug: "paracetamol", reason: "the daily dose would be doubled — paracetamol is already on the prescription" },
  { drug: "ibuprofen", reason: "the daily dose would be doubled — ibuprofen is already on the prescription" },
];

/**
 * The antibiotics.
 *
 * An explicit list, because an antibiotic is not anything with "-in" in the
 * name, and the check that matters most must not be a guess.
 */
export const ANTIBIOTICS = [
  "amoxicillin",
  "amoxycillin",
  "azithromycin",
  "cephalexin",
  "cefuroxime",
  "cefixime",
  "ceftriaxone",
  "doxycycline",
  "ciprofloxacin",
  "metronidazole",
  "penicillin",
  "benzylpenicillin",
  "erythromycin",
  "clarithromycin",
  "trimethoprim",
  "sulfamethoxazole",
  "co-trimoxazole",
];
