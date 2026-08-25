import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import { clerkAppearance } from "@/lib/clerk-appearance";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Display face, for headings only.
 *
 * Geist is a good interface font and a flat one at large sizes — every heading
 * on the page came out looking like UI. Sora has enough character to carry a
 * headline at 52px and, being variable, costs one file to do it. Body text
 * stays on Geist: Sora at 15px is worse than Geist at 15px.
 */
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Revert",
  description:
    "Job alerts, questions and referrals for job seekers — where you are a username, not a phone number.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
