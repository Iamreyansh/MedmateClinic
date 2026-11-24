import { LandingHero, LandingNav } from "@/features/landing/components/LandingHeader";
import {
  LandingFeatures,
  LandingRules,
  LandingStandards,
  LandingSteps,
} from "@/features/landing/components/LandingSections";
import { LandingCta, LandingFooter, LandingPricing } from "@/features/landing/components/LandingClosing";

/**
 * The landing page — the visitor's first screen.
 *
 * The sections live in `src/components/marketing/`; this file only says in what
 * order they appear.
 */
export function LandingScreen() {
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
