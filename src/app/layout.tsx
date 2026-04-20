import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ConversionCast — Zero-Knowledge Signal Gateway",
  description:
    "Connect your data silos to ad platform Conversion APIs with zero-knowledge PII hashing. Visualize signals pulsing in real-time on the Funnel Board.",
  keywords: [
    "conversion api",
    "meta capi",
    "server-side tracking",
    "zero knowledge",
    "signal gateway",
    "funnel visualization",
  ],
  openGraph: {
    title: "ConversionCast — Zero-Knowledge Signal Gateway",
    description:
      "Bypass browser-side signal loss. Cast 100% of your conversion data with privacy-first hashing.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
