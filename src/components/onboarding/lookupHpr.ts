/**
 * The HPR registry lookup.
 *
 * In production this asks the ABDM Health Professional Registry for the
 * practitioner behind an HPR id. The stub answers with the shape the screen
 * draws, so the sign-up flow can be walked end to end before the registry is
 * connected — and so the seam is obvious when it is.
 */

export type HprRecord = {
  name: string;
  qualification: string;
  council: string;
  /** The registration number the registry reports. */
  registration: string;
};

export async function lookupHpr(hprId: string): Promise<HprRecord> {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const digits = hprId.replace(/\D/g, "").padEnd(14, "0").slice(0, 14);
  return {
    name: "Dr. Ananya Rao",
    qualification: "MBBS, MD (General Medicine)",
    council: "Karnataka Medical Council",
    registration: `Reg. KMC ${digits.slice(-5)} · verified in HPR`,
  };
}
