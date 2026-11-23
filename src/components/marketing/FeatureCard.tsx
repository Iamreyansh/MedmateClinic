import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/ui/Icon";

export type FeatureCardProps = HTMLAttributes<HTMLDivElement> & {
  icon: IconName;
  title: string;
  description: string;
};

/** The marketing feature card: a tile, a title, a paragraph. */
export function FeatureCard({ icon, title, description, className, ...rest }: FeatureCardProps) {
  return (
    <div className={cn("lp-feat", className)} {...rest}>
      <span>
        <Icon name={icon} size={20} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
