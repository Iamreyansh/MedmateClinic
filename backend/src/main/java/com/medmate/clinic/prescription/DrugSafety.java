package com.medmate.clinic.prescription;

import com.medmate.clinic.patient.Patient;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * What the doctor should be warned about before signing.
 *
 * <p>Six checks, and each one can be explained in a sentence: a medicine
 * written twice, a medicine the patient is allergic to, a dose above the
 * daily maximum, two medicines that should not be given together, an antibiotic
 * for what looks viral, and a medicine that cannot be given to this patient.
 *
 * <p>The rules are deliberately small and named, not a model: a clinic can
 * argue with a named rule, and every note says which rule fired.
 */
public final class DrugSafety {

    public static final String DUPLICATE_INGREDIENT = "duplicate_ingredient";
    public static final String ALLERGY_CONFLICT = "allergy_conflict";
    public static final String DOSE_ABOVE_MAX = "dose_above_daily_max";
    public static final String DRUG_INTERACTION = "drug_interaction";
    public static final String ANTIBIOTIC_FOR_VIRAL = "antibiotic_for_viral_illness";
    public static final String NOT_FOR_PATIENT = "not_for_pregnancy_or_children";

    /** One thing the doctor should look at. */
    public record Alert(String kind, String label, String detail) {}

    /**
     * A drug the checker knows about: the daily maximum, the age below which
     * it cannot be given, and whether it is safe in pregnancy.
     */
    private record DrugRule(
            String generic,
            BigDecimal maxDailyMg,
            Integer minAge,
            boolean unsafeInPregnancy,
            String note) {}

    private static final Map<String, DrugRule> RULES = rules();

    /** Two medicines that should not be given together. */
    private static final List<String[]> INTERACTIONS =
            List.of(
                    new String[] {"warfarin", "aspirin", "bleeding risk"},
                    new String[] {"warfarin", "ibuprofen", "bleeding risk"},
                    new String[] {"clarithromycin", "simvastatin", "muscle breakdown"},
                    new String[] {"ciprofloxacin", "theophylline", "theophylline levels rise"},
                    new String[] {"methotrexate", "ibuprofen", "methotrexate toxicity"},
                    new String[] {"methotrexate", "trimethoprim", "methotrexate toxicity"});

    /** The antibiotics, so the report can say what share of prescriptions carry one. */
    private static final Set<String> ANTIBIOTICS =
            Set.of(
                    "amoxicillin",
                    "amoxclavulanate",
                    "augmentin",
                    "azithromycin",
                    "cefixime",
                    "cefuroxime",
                    "cefpodoxime",
                    "cephalexin",
                    "ciprofloxacin",
                    "clarithromycin",
                    "doxycycline",
                    "erythromycin",
                    "fusidicacid",
                    "gentamicin",
                    "isoniazid",
                    "levofloxacin",
                    "linezolid",
                    "metronidazole",
                    "nitrofurantoin",
                    "norfloxacin",
                    "ofloxacin",
                    "amikacin",
                    "cotrimoxazole",
                    "rifampicin",
                    "sulfamethoxazole",
                    "trimethoprim");

    /** A drug class, so an allergy to the class catches the drugs in it. */
    private static final Map<String, Set<String>> DRUG_CLASSES =
            Map.of(
                    "penicillin",
                            Set.of(
                                    "amoxicillin",
                                    "amoxicillinclavulanate",
                                    "ampicillin",
                                    "benzylpenicillin",
                                    "cloxacillin",
                                    "dicloxacillin",
                                    "flucloxacillin",
                                    "phenoxymethylpenicillin",
                                    "piperacillin"),
                    "sulfa",
                            Set.of(
                                    "co-trimoxazole",
                                    "sulfamethoxazole",
                                    "sulfasalazine",
                                    "sulfadiazine"),
                    "macrolide",
                            Set.of(
                                    "azithromycin",
                                    "clarithromycin",
                                    "erythromycin",
                                    "roxithromycin"),
                    "cephalosporin",
                            Set.of(
                                    "cefixime",
                                    "cefpodoxime",
                                    "cefuroxime",
                                    "cephalexin",
                                    "ceftriaxone"),
                    "fluoroquinolone",
                            Set.of(
                                    "ciprofloxacin",
                                    "levofloxacin",
                                    "moxifloxacin",
                                    "norfloxacin",
                                    "ofloxacin"));

    /** What a viral illness looks like in a complaint. */
    private static final List<String> VIRAL_WORDS =
            List.of("fever", "cough", "cold", "viral", "sore throat", "runny nose", "congestion", "coryza");

    private static final Pattern DOSE_PATTERN = Pattern.compile("(\\d+(?:\\.\\d+)?)\\s*mg");
    private static final Pattern TIMES_PATTERN = Pattern.compile("(\\d)\\s*-\\s*(\\d)\\s*-\\s*(\\d)");
    private static final Pattern EVERY_HOURS_PATTERN = Pattern.compile("every\\s*(\\d+)\\s*hours?");

    private DrugSafety() {}

    /**
     * Every note for one prescription.
     *
     * @param patient who the prescription is for
     * @param medicines what the doctor wrote
     * @param diagnoses what the doctor thinks it is
     * @param complaints what the patient said
     */
    public static List<Alert> check(
            Patient patient,
            List<PrescriptionMedicine> medicines,
            List<PrescriptionDiagnosis> diagnoses,
            String complaints) {

        List<Alert> alerts = new ArrayList<>();
        if (medicines == null || medicines.isEmpty()) {
            return alerts;
        }

        duplicateIngredient(medicines, alerts);
        allergyConflict(patient, medicines, alerts);
        dailyDose(patient, medicines, alerts);
        interactions(medicines, alerts);
        antibioticForViral(medicines, complaints, diagnoses, alerts);
        notForThisPatient(patient, medicines, alerts);
        return alerts;
    }

    /** Whether anything on the prescription is an antibiotic. */
    public static boolean hasAntibiotic(List<PrescriptionMedicine> medicines) {
        if (medicines == null) {
            return false;
        }
        return medicines.stream().anyMatch(medicine -> isAntibiotic(medicine.getGenericName(), medicine.getDrugName()));
    }

    /** Whether a medicine is an antibiotic. */
    public static boolean isAntibiotic(String genericName, String drugName) {
        String generic = normalise(genericName);
        if (generic.isEmpty()) {
            generic = normalise(drugName);
        }
        return ANTIBIOTICS.contains(generic) || ANTIBIOTICS.contains(baseOfSalt(generic));
    }

    /** The name a report shows for a kind of note. */
    public static String labelFor(String kind) {
        return switch (kind) {
            case DUPLICATE_INGREDIENT -> "Duplicate ingredient";
            case ALLERGY_CONFLICT -> "Allergy conflict";
            case DOSE_ABOVE_MAX -> "Dose above daily max";
            case DRUG_INTERACTION -> "Drug interaction";
            case ANTIBIOTIC_FOR_VIRAL -> "Antibiotic for likely viral illness";
            case NOT_FOR_PATIENT -> "Not for pregnancy or children";
            default -> kind;
        };
    }

    // ---------------------------------------------------------------- checks

    private static void duplicateIngredient(List<PrescriptionMedicine> medicines, List<Alert> alerts) {
        Map<String, PrescriptionMedicine> seen = new LinkedHashMap<>();
        for (PrescriptionMedicine medicine : medicines) {
            String generic = normalise(medicine.getGenericName());
            if (generic.isEmpty()) {
                continue;
            }
            PrescriptionMedicine first = seen.get(generic);
            if (first != null) {
                alerts.add(
                        new Alert(
                                DUPLICATE_INGREDIENT,
                                labelFor(DUPLICATE_INGREDIENT),
                                medicine.getDrugName() + " is written twice — once as "
                                        + first.getDrugName()
                                        + "."));
                return;
            }
            seen.put(generic, medicine);
        }
    }

    private static void allergyConflict(
            Patient patient, List<PrescriptionMedicine> medicines, List<Alert> alerts) {
        if (patient == null || patient.getAllergies() == null) {
            return;
        }
        for (String allergy : patient.getAllergies()) {
            if (allergy == null || allergy.isBlank()) {
                continue;
            }
            String term = normalise(allergy.contains("(") ? allergy.substring(0, allergy.indexOf('(')) : allergy);
            if (term.isEmpty()) {
                continue;
            }
            Set<String> drugsInClass = DRUG_CLASSES.getOrDefault(term, Set.of());
            for (PrescriptionMedicine medicine : medicines) {
                String generic = normalise(medicine.getGenericName());
                String base = baseOfSalt(generic);
                boolean matches =
                        generic.contains(term)
                                || base.contains(term)
                                || term.contains(base)
                                || drugsInClass.contains(base)
                                || drugsInClass.contains(generic);
                if (matches) {
                    alerts.add(
                            new Alert(
                                    ALLERGY_CONFLICT,
                                    labelFor(ALLERGY_CONFLICT),
                                    medicine.getDrugName() + " — the record lists a "
                                            + allergy.trim() + " allergy."));
                    return;
                }
            }
        }
    }

    private static void dailyDose(
            Patient patient, List<PrescriptionMedicine> medicines, List<Alert> alerts) {
        for (PrescriptionMedicine medicine : medicines) {
            DrugRule rule = RULES.get(baseOfSalt(normalise(medicine.getGenericName())));
            if (rule == null || rule.maxDailyMg() == null) {
                continue;
            }
            BigDecimal doseMg = doseInMg(medicine.getDose());
            if (doseMg == null) {
                continue;
            }
            int times = timesPerDay(medicine.getWhenText());
            BigDecimal daily = doseMg.multiply(BigDecimal.valueOf(times));
            if (daily.compareTo(rule.maxDailyMg()) > 0) {
                alerts.add(
                        new Alert(
                                DOSE_ABOVE_MAX,
                                labelFor(DOSE_ABOVE_MAX),
                                medicine.getDrugName() + " — "
                                        + daily.stripTrailingZeros().toPlainString()
                                        + " mg a day, above the "
                                        + rule.maxDailyMg().stripTrailingZeros().toPlainString()
                                        + " mg maximum."));
            }
        }
    }

    private static void interactions(List<PrescriptionMedicine> medicines, List<Alert> alerts) {
        List<String> generics = new ArrayList<>();
        List<String> names = new ArrayList<>();
        for (PrescriptionMedicine medicine : medicines) {
            String generic = baseOfSalt(normalise(medicine.getGenericName()));
            if (generic.isEmpty()) {
                continue;
            }
            generics.add(generic);
            names.add(medicine.getDrugName());
        }
        for (String[] pair : INTERACTIONS) {
            int first = generics.indexOf(pair[0]);
            int second = generics.indexOf(pair[1]);
            if (first >= 0 && second >= 0) {
                alerts.add(
                        new Alert(
                                DRUG_INTERACTION,
                                labelFor(DRUG_INTERACTION),
                                names.get(first) + " with " + names.get(second) + " — " + pair[2] + "."));
                return;
            }
        }
    }

    private static void antibioticForViral(
            List<PrescriptionMedicine> medicines,
            String complaints,
            List<PrescriptionDiagnosis> diagnoses,
            List<Alert> alerts) {

        String complaint = complaints == null ? "" : complaints.toLowerCase(Locale.ROOT);
        boolean viral = VIRAL_WORDS.stream().anyMatch(complaint::contains);
        if (!viral && diagnoses != null) {
            viral =
                    diagnoses.stream()
                            .map(PrescriptionDiagnosis::getIcdCode)
                            .filter(code -> code != null)
                            .anyMatch(code -> code.startsWith("J00") || code.startsWith("J06"));
        }
        if (!viral) {
            return;
        }
        for (PrescriptionMedicine medicine : medicines) {
            if (isAntibiotic(medicine.getGenericName(), medicine.getDrugName())) {
                alerts.add(
                        new Alert(
                                ANTIBIOTIC_FOR_VIRAL,
                                labelFor(ANTIBIOTIC_FOR_VIRAL),
                                medicine.getDrugName() + " — the complaint reads like a viral illness."));
                return;
            }
        }
    }

    private static void notForThisPatient(
            Patient patient, List<PrescriptionMedicine> medicines, List<Alert> alerts) {
        if (patient == null) {
            return;
        }
        Integer age = patient.getAge();
        for (PrescriptionMedicine medicine : medicines) {
            DrugRule rule = RULES.get(baseOfSalt(normalise(medicine.getGenericName())));
            if (rule == null) {
                continue;
            }
            if (rule.minAge() != null && age != null && age < rule.minAge()) {
                alerts.add(
                        new Alert(
                                NOT_FOR_PATIENT,
                                labelFor(NOT_FOR_PATIENT),
                                medicine.getDrugName() + " — not for a child of "
                                        + age + "; it is for " + rule.minAge() + " and above."));
                return;
            }
            if (rule.unsafeInPregnancy() && patient.isPregnant()) {
                alerts.add(
                        new Alert(
                                NOT_FOR_PATIENT,
                                labelFor(NOT_FOR_PATIENT),
                                medicine.getDrugName() + " — not in pregnancy."));
                return;
            }
        }
    }

    // ---------------------------------------------------------------- helpers

    /** Lower case, letters and digits only. */
    private static String normalise(String text) {
        if (text == null) {
            return "";
        }
        return text.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    /** The part before a salt: "amoxicillin + clavulanic acid" → "amoxicillin". */
    private static String baseOfSalt(String generic) {
        if (generic == null) {
            return "";
        }
        if (generic.contains("clavulanic")) {
            return "amoxicillinclavulanate";
        }
        return generic;
    }

    /** The dose in milligrams, when the text gives one. */
    private static BigDecimal doseInMg(String dose) {
        if (dose == null) {
            return null;
        }
        Matcher matcher = DOSE_PATTERN.matcher(dose.toLowerCase(Locale.ROOT));
        if (!matcher.find()) {
            return null;
        }
        return new BigDecimal(matcher.group(1));
    }

    /** How many times a day the medicine is taken. */
    private static int timesPerDay(String when) {
        String text = when == null ? "" : when.toLowerCase(Locale.ROOT).trim();
        Matcher times = TIMES_PATTERN.matcher(text);
        if (times.find()) {
            return Integer.parseInt(times.group(1))
                    + Integer.parseInt(times.group(2))
                    + Integer.parseInt(times.group(3));
        }
        Matcher hours = EVERY_HOURS_PATTERN.matcher(text);
        if (hours.find()) {
            int every = Math.max(1, Integer.parseInt(hours.group(1)));
            return Math.max(1, Math.round(24f / every));
        }
        if (text.contains("four times") || text.contains("qid")) {
            return 4;
        }
        if (text.contains("thrice") || text.contains("tds") || text.contains("tid")) {
            return 3;
        }
        if (text.contains("twice") || text.contains("bd") || text.contains("bid")) {
            return 2;
        }
        return 1;
    }

    private static Map<String, DrugRule> rules() {
        List<DrugRule> all =
                List.of(
                        new DrugRule("paracetamol", new BigDecimal("4000"), null, false, ""),
                        new DrugRule("ibuprofen", new BigDecimal("2400"), null, false, ""),
                        new DrugRule("amoxicillin", new BigDecimal("3000"), null, false, ""),
                        new DrugRule("azithromycin", new BigDecimal("500"), null, false, ""),
                        new DrugRule("cefixime", new BigDecimal("400"), null, false, ""),
                        new DrugRule("pantoprazole", new BigDecimal("40"), null, false, ""),
                        new DrugRule("metformin", new BigDecimal("2000"), null, false, ""),
                        new DrugRule("cetirizine", new BigDecimal("10"), null, false, ""),
                        new DrugRule("montelukast", new BigDecimal("10"), null, false, ""),
                        new DrugRule("linezolid", new BigDecimal("1200"), null, false, ""),
                        new DrugRule("doxycycline", new BigDecimal("200"), 8, true, ""),
                        new DrugRule("ciprofloxacin", new BigDecimal("1000"), 12, true, ""),
                        new DrugRule("ofloxacin", new BigDecimal("400"), 12, true, ""),
                        new DrugRule("metronidazole", new BigDecimal("1200"), null, true, ""),
                        new DrugRule("cotrimoxazole", new BigDecimal("960"), null, true, ""),
                        new DrugRule("trimethoprim", null, null, true, ""),
                        new DrugRule("warfarin", null, null, true, ""),
                        new DrugRule("methotrexate", null, null, true, ""),
                        new DrugRule("isotretinoin", null, 12, true, ""),
                        new DrugRule("aspirin", null, 16, true, ""),
                        new DrugRule("carbamazepine", null, null, true, ""),
                        new DrugRule("phenytoin", null, null, true, ""),
                        new DrugRule("amikacin", null, null, true, ""));
        Map<String, DrugRule> byGeneric = new LinkedHashMap<>();
        for (DrugRule rule : all) {
            byGeneric.put(rule.generic(), rule);
        }
        return byGeneric;
    }
}
