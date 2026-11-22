import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource/inter-tight/500.css";
import "@fontsource/inter-tight/600.css";
import "@fontsource/inter-tight/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Product Finder · creator marketplace demo",
  description:
    "Clickable demo: a brand publishes a keyboard brief, a creator applies with a past video, AI screening ranks applicants, and brand and creator agents negotiate terms. Sample data only.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
