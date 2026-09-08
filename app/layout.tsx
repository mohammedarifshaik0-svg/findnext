import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VXL — Your résumé, reimagined",
  description: "Turn your résumé into a story-led portfolio website. We Excel. We Grow Together.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
