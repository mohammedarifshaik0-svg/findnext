import type { Metadata } from "next";
import Script from "next/script";
import { VxlAnalytics } from "@/app/vxl-analytics";
import "./globals.css";
import "./vxl-enhancements.css";
import "./vxl-brand-v2.css";
import "./vxl-launch-polish.css";

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
      <body className="antialiased">
        <Script id="vxl-consent-default" strategy="beforeInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = window.gtag || gtag;
          gtag('consent', 'default', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            functionality_storage: 'granted',
            security_storage: 'granted',
            wait_for_update: 500
          });
        `}</Script>
        {children}
        <VxlAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      </body>
    </html>
  );
}
