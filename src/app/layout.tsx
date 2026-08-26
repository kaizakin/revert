import type { Metadata } from "next";
import { Nunito, Geist_Mono, Space_Grotesk } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import { clerkAppearance } from "@/lib/clerk-appearance";
import { QueryProvider } from "@/components/query-provider";

import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Display face, for headings only.
 *
 * Space Grotesk has enough character to carry a headline at 52px and, being
 * variable, costs one file to do it. Body and interface copy uses Nunito.
 */
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Revert",
  description:
    "Job alerts, questions and referrals for job seekers where you are a username, not a phone number.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html
        lang="en"
        className={`${nunito.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <QueryProvider>{children}</QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
