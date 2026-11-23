import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  /**
   * The dev server refuses its own dev resources when the browser's origin is
   * not on this list. Without it the page renders from the server but never
   * hydrates, so nothing that needs JavaScript — the pricing toggle, the
   * enquiry form — stays dead.
   */
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.0.5"],
};

export default nextConfig;
