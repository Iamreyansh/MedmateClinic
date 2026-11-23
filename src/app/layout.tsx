import type { Metadata } from "next";
import "@/styles/medmate.css";
import "@/styles/app.css";

export const metadata: Metadata = {
  title: "MedMate Doctor",
  description: "The clinic dashboard for a doctor's practice.",
};

/**
 * Outfit is loaded the way the MVP loads it: from Google Fonts with a swap
 * fallback. The product stylesheet names it directly (`font-family: Outfit,
 * system-ui, sans-serif`), so no font variable is introduced here — a
 * different loading path would change the rendering.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- the product stylesheet names Outfit directly, so the font is loaded the way the MVP loads it */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
