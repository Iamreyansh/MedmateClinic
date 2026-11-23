import type { CSSProperties } from "react";
import icons from "@/assets/icons.json";

export type IconName = keyof typeof icons;

const paths = icons as Record<string, string>;

export type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * The product's icon set — 38 glyphs, byte-exact from the MVP.
 *
 * One set, one geometry. Do not mix in a second icon library: the set is part
 * of the product's texture, not an implementation detail.
 */
export function Icon({ name, size = 20, className, style }: IconProps) {
  const body = paths[name];
  if (!body) return null;

  return (
    <svg
      className={className ? `i ${className}` : "i"}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={style}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}
