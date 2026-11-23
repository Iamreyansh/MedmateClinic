import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

export type PlanCardProps = HTMLAttributes<HTMLElement> & {
  name: string;
  tagline: string;
  price: string;
  period?: string;
  /** The line under the price — yearly billing, savings, GST. */
  summary?: string;
  features: ReactNode[];
  /** "Most popular" — the badge that sits on the card's shoulder. */
  popular?: boolean;
  /** `hi` is the green-bordered card the product highlights; `cur` is the one you are on. */
  variant?: "hi" | "cur";
  action?: string;
};

/**
 * The pricing card. `hi` is the highlighted card: a green border, a soft
 * shadow, and the forest "Most popular" badge on its shoulder.
 *
 * The Figma file also shows a forest-filled variant of this card; the deployed
 * product renders the highlighted card white with a green border, so that is
 * what this component emits.
 */
export function PlanCard({
  name,
  tagline,
  price,
  period = "/ month",
  summary,
  features,
  popular,
  variant,
  action = "Choose plan",
  className,
  ...rest
}: PlanCardProps) {
  return (
    <article className={cn("pz-card", variant, className)} {...rest}>
      {popular ? <span className="pz-badge">Most popular</span> : null}
      <h3>{name}</h3>
      <p className="pz-tag">{tagline}</p>
      <div className="pz-price">
        <b>{price}</b>
        <span>{period}</span>
      </div>
      {summary ? <p className="pz-sub">{summary}</p> : null}
      <button type="button" className={cn("btn block", variant !== "hi" && "sec")}>
        {action}
      </button>
      <ul>
        {features.map((feature, index) => (
          <li key={index}>
            <Icon name="check" size={14} />
            {feature}
          </li>
        ))}
      </ul>
    </article>
  );
}
