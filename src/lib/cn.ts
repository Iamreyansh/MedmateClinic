/** Minimal class joiner. The product has no utility framework, so this is all. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
