/**
 * The medicine catalogue.
 *
 * The doctor searches over brand and salt — "Dolo, azithro 500" — so each
 * entry carries both, plus what the line on the prescription shows: the form,
 * the usual dose, and what it is used for.
 *
 * In production this comes from the drug master the server holds. The shape
 * here is the same either way, so the screen is written against the shape and
 * not against this list.
 */

export type CatalogueMedicine = {
  /** The brand the doctor may type. */
  brand: string;
  /** The salt — the generic name. */
  generic: string;
  /** The form: tablet, capsule, syrup. */
  form: string;
  /** The usual adult dose. */
  dose: string;
  /** What it is used for, in a few words. */
  usedFor: string;
  /** The category, as the stylesheet's `.sug-row` shows it. */
  category: string;
  /** The number of tablets in the pack. */
  pack?: string;
  /** Whether a prescription is needed to buy it. */
  prescriptionOnly?: boolean;
};

/**
 * The catalogue.
 *
 * It is short on purpose: it holds the medicines a general practice actually
 * prescribes, so a search never returns something irrelevant and the doctor's
 * shortlist stays short.
 */
export const CATALOGUE: CatalogueMedicine[] = [
  {
    brand: "Dolo 650",
    generic: "Paracetamol",
    form: "Tablet",
    dose: "650 mg",
    usedFor: "Fever and pain",
    category: "Analgesic",
    pack: "15 tablets",
  },
  {
    brand: "Crocin",
    generic: "Paracetamol",
    form: "Tablet",
    dose: "500 mg",
    usedFor: "Fever and pain",
    category: "Analgesic",
    pack: "10 tablets",
  },
  {
    brand: "Azithral 500",
    generic: "Azithromycin",
    form: "Tablet",
    dose: "500 mg",
    usedFor: "Bacterial throat and chest infections",
    category: "Antibiotic",
    pack: "6 tablets",
    prescriptionOnly: true,
  },
  {
    brand: "Azicip 500",
    generic: "Azithromycin",
    form: "Tablet",
    dose: "500 mg",
    usedFor: "Bacterial throat and chest infections",
    category: "Antibiotic",
    pack: "6 tablets",
    prescriptionOnly: true,
  },
  {
    brand: "Augmentin 625",
    generic: "Amoxicillin + Clavulanic acid",
    form: "Tablet",
    dose: "625 mg",
    usedFor: "Bacterial infections of the ear, nose and throat",
    category: "Antibiotic",
    pack: "10 tablets",
    prescriptionOnly: true,
  },
  {
    brand: "Amoxil 500",
    generic: "Amoxicillin",
    form: "Capsule",
    dose: "500 mg",
    usedFor: "Bacterial throat, ear and urine infections",
    category: "Antibiotic",
    pack: "12 capsules",
    prescriptionOnly: true,
  },
  {
    brand: "Cetirizine",
    generic: "Cetirizine",
    form: "Tablet",
    dose: "10 mg",
    usedFor: "Sneezing, runny nose and itching",
    category: "Antihistamine",
    pack: "10 tablets",
  },
  {
    brand: "Montair-LC",
    generic: "Montelukast + Levocetirizine",
    form: "Tablet",
    dose: "5 mg + 10 mg",
    usedFor: "Allergic rhinitis and wheezing",
    category: "Antihistamine",
    pack: "10 tablets",
  },
  {
    brand: "Pan 40",
    generic: "Pantoprazole",
    form: "Tablet",
    dose: "40 mg",
    usedFor: "Acidity and stomach ulcers",
    category: "Antacid",
    pack: "10 tablets",
  },
  {
    brand: "Rantac 150",
    generic: "Ranitidine",
    form: "Tablet",
    dose: "150 mg",
    usedFor: "Acidity and indigestion",
    category: "Antacid",
    pack: "10 tablets",
  },
  {
    brand: "Meftal-P",
    generic: "Mefenamic acid",
    form: "Tablet",
    dose: "500 mg",
    usedFor: "Period pain and muscle pain",
    category: "Analgesic",
    pack: "10 tablets",
  },
  {
    brand: "Chloramphenicol eye drops",
    generic: "Chloramphenicol",
    form: "Eye drops",
    dose: "0.5 %",
    usedFor: "Conjunctivitis",
    category: "Ophthalmic",
    pack: "5 ml",
  },
  {
    brand: "Hexidine",
    generic: "Chlorhexidine",
    form: "Mouthwash",
    dose: "0.2 %",
    usedFor: "Sore throat and mouth ulcers",
    category: "Oral care",
    pack: "200 ml",
  },
  {
    brand: "Betadine",
    generic: "Povidone iodine",
    form: "Gargle",
    dose: "2 %",
    usedFor: "Sore throat and mouth ulcers",
    category: "Oral care",
    pack: "100 ml",
  },
  {
    brand: "Econorm",
    generic: "Ketoconazole",
    form: "Cream",
    dose: "2 %",
    usedFor: "Fungal skin infection",
    category: "Topical",
    pack: "30 g",
  },
  {
    brand: "Thyronorm 50",
    generic: "Levothyroxine",
    form: "Tablet",
    dose: "50 mcg",
    usedFor: "An underactive thyroid",
    category: "Hormone",
    pack: "100 tablets",
    prescriptionOnly: true,
  },
  {
    brand: "Glycomet GP1",
    generic: "Metformin",
    form: "Tablet",
    dose: "500 mg + 500 mg",
    usedFor: "Type 2 diabetes",
    category: "Antidiabetic",
    pack: "10 tablets",
    prescriptionOnly: true,
  },
  {
    brand: "Ecosprin AV 75",
    generic: "Aspirin",
    form: "Tablet",
    dose: "75 mg",
    usedFor: "Prevention of clots",
    category: "Antiplatelet",
    pack: "14 tablets",
    prescriptionOnly: true,
  },
];

/**
 * The catalogue as the doctor searched for it.
 *
 * The query matches the brand, the salt and the dose, in any order and with
 * the words separated — so "azithro 500" finds "Azithral 500", and "500
 * azithro" finds it too.
 */
export function searchMedicines(query: string, limit = 12): CatalogueMedicine[] {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return [];

  return CATALOGUE.filter((medicine) => {
    const haystack = [
      medicine.brand,
      medicine.generic,
      medicine.form,
      medicine.dose,
      medicine.usedFor,
      medicine.category,
    ]
      .join(" ")
      .toLowerCase();

    // Every word the doctor typed has to be somewhere in the entry.
    return words.every((word) => haystack.includes(word));
  }).slice(0, limit);
}

/**
 * The suggestion for a diagnosis.
 *
 * It is a small map rather than a rule engine: the common presentations and
 * the usual first-line medicine for each.
 */
const BY_DIAGNOSIS: Array<{ pattern: RegExp; generic: string }> = [
  { pattern: /pharyngitis|tonsillitis|sore throat/i, generic: "Azithromycin" },
  { pattern: /fever|viral fever/i, generic: "Paracetamol" },
  { pattern: /cough|cold|upper respiratory/i, generic: "Cetirizine" },
  { pattern: /diabet/i, generic: "Metformin" },
  { pattern: /acidity|gerd|gastritis|indigestion/i, generic: "Pantoprazole" },
  { pattern: /diarrh?oea|stomach/i, generic: "Metronidazole" },
  { pattern: /fungal|ringworm/i, generic: "Ketoconazole" },
  { pattern: /allergic rhinitis|sneeze|runny nose/i, generic: "Levocetirizine" },
];

/**
 * The medicines to suggest for these diagnoses.
 *
 * The doctor can ignore them — they are a starting point, not a decision.
 */
export function suggestMedicines(diagnoses: Array<{ label: string }>): CatalogueMedicine[] {
  const suggestions: CatalogueMedicine[] = [];

  for (const diagnosis of diagnoses) {
    for (const rule of BY_DIAGNOSIS) {
      if (!rule.pattern.test(diagnosis.label)) continue;
      const match = CATALOGUE.find((medicine) =>
        medicine.generic.toLowerCase().includes(rule.generic.toLowerCase()),
      );
      if (match && !suggestions.some((entry) => entry.generic === match.generic)) {
        suggestions.push(match);
      }
    }
  }

  return suggestions.slice(0, 4);
}

/**
 * The prescription line for a catalogue entry.
 *
 * The doctor's own dose wins; otherwise the catalogue's usual dose is used.
 */
export function toMedicineLine(medicine: CatalogueMedicine): {
  name: string;
  generic: string;
  form: string;
  dose: string;
  when: string;
  forDays: string;
  notes: string;
} {
  return {
    name: `${medicine.brand} ${medicine.dose} ${medicine.form.toLowerCase()}`,
    generic: medicine.generic,
    form: medicine.form,
    dose: medicine.dose,
    when: "Once a day (1-0-0)",
    forDays: "3 days",
    notes: medicine.usedFor,
  };
}
