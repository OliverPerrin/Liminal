import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liminalml.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "LiminalML — Structured prep for ML and SWE interviews",
    template: "%s · LiminalML",
  },
  description:
    "Personalized ML, deep learning, RL, and software engineering interview prep. Upload your resume, study 130+ topics through rigorous 6-stage AI sessions grounded in your own project experience.",
  applicationName: "LiminalML",
  keywords: [
    "ML interview prep",
    "machine learning interview",
    "deep learning interview",
    "research engineer interview",
    "MLE interview",
    "system design interview",
    "STAR stories",
    "AI interview coach",
  ],
  openGraph: {
    title: "LiminalML — ML + SWE interview prep",
    description:
      "130+ topics across ML and SWE. 6-stage sessions. AI-personalized to your resume.",
    siteName: "LiminalML",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "LiminalML — ML + SWE interview prep",
    description:
      "130+ topics across ML and SWE. 6-stage sessions. AI-personalized to your resume.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      {/* Set theme before first paint to avoid flash */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('lml-theme');if(t==='light')document.documentElement.classList.add('light');}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-app-bg text-app-fg">{children}</body>
    </html>
  );
}
