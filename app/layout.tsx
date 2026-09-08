import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.thevxl.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "VXL — Your Resume, Reimagined",
  description: "Turn your résumé into a story-led portfolio website. We Excel. We Grow Together.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "VXL — Your Resume, Reimagined",
    description: "Turn your résumé into a story-led portfolio website. We Excel. We Grow Together.",
    url: "/",
    siteName: "VXL",
    type: "website",
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
