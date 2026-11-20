import type { Metadata } from "next";
import "./globals.css";
import "./motion.css";
import "./theme.css";

export const metadata: Metadata = {
  title: "Bloom Connect | Office, in bloom",
  description: "A thoughtful home for your office team, weekly lunches, shared fund, and celebrations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
