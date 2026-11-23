import { LandingHero, LandingNav } from "@/components/marketing/LandingHeader";
import {
  LandingFeatures,
  LandingRules,
  LandingStandards,
  LandingSteps,
} from "@/components/marketing/LandingSections";
import { LandingCta, LandingFooter, LandingPricing } from "@/components/marketing/LandingClosing";

/**
 * The landing page — the visitor's first screen.
 *
 * The sections live in `src/components/marketing/`; this file only says in what
 * order they appear.
 */
export default function LandingPage() {
  return (
    <div className="lp">
      <LandingNav />
      <LandingHero />
      <LandingStandards />
      <LandingSteps />
      <LandingFeatures />
      <LandingRules />
      <LandingPricing />
      <LandingCta />
      <LandingFooter />
    </div>
  );
}
