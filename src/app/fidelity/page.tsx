import { notFound } from "next/navigation";
import { FidelityGuide } from "@/components/dev/FidelityGuide";

/**
 * The style guide: every component in the kit, rendered as the product renders
 * it. It is the fixture the fidelity harness measures, so it does not ship —
 * in a production build the route is not found.
 */
export default function FidelityPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <FidelityGuide />;
}
