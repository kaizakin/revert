import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/nextjs";

type Appearance = NonNullable<ComponentProps<typeof ClerkProvider>["appearance"]>;

/**
 * Themes Clerk's built-in components to match the app.
 *
 * Colour lives in globals.css, which maps Clerk's own `--clerk-color-*` custom
 * properties to our tokens. That reaches internal elements whose class names
 * are generated (`cl-internal-…`) and so cannot be targeted from here — which
 * is exactly what left the footer as a white band while every class in this
 * file looked correct in devtools.
 *
 * globals.css also declares `color-scheme`. Clerk's CSS is built on
 * light-dark(), which resolves against that property rather than the OS
 * preference, so without it the light value wins even in dark mode.
 *
 * What remains here is shape: radius, weight, spacing, and the few places we
 * deliberately diverge. `cssLayerName` still matters so these classNames
 * outrank Clerk's own rules; the layer order is set in globals.css.
 */
export const clerkAppearance: Appearance = {
  cssLayerName: "clerk",

  elements: {
    rootBox: "w-full",
    cardBox: "shadow-none rounded-2xl border border-line overflow-hidden",
    card: "shadow-none border-0 px-8 py-8",

    header: "gap-1",
    headerTitle: "text-[22px] font-semibold tracking-tight",
    headerSubtitle: "text-[13px]",

    socialButtonsBlockButton: "rounded-lg transition-colors",
    socialButtonsBlockButtonText: "font-medium",

    dividerText: "text-[11px] uppercase tracking-widest",

    formFieldLabel: "text-[13px] font-medium",
    formFieldInput: "rounded-lg py-2.5",
    formFieldHintText: "text-[11px]",
    formFieldErrorText: "text-[11px]",
    formFieldSuccessText: "text-[11px]",
    formFieldAction: "text-[12px] hover:underline",

    // Slight vertical gradient, so the primary action reads as raised.
    formButtonPrimary:
      "rounded-lg py-2.5 font-semibold normal-case shadow-none after:hidden bg-linear-to-b from-accent to-[color-mix(in_srgb,var(--rv-accent)_86%,black)]",

    otpCodeFieldInput: "rounded-lg",

    footer: "border-t border-line",
    footerAction: "py-1",
    footerActionText: "text-[13px]",
    footerActionLink: "font-medium hover:underline",

    // Header logo only. Clerk's "Secured by Clerk" badge stays: removing it
    // needs a paid plan, and hiding it on the free tier breaks their terms.
    logoBox: "hidden",
  },
};
