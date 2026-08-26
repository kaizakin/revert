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
    card: "shadow-none border-0 px-8 pt-8 pb-5",

    header: "gap-1",
    headerTitle: "text-[22px] font-semibold tracking-tight",
    headerSubtitle: "text-[13px]",

    socialButtonsBlockButton: "rounded-lg border border-line transition-colors",
    socialButtonsBlockButtonText: "font-medium",

    dividerRow: "my-1",
    // Clerk's default divider is 7% alpha, which vanishes on a dark card.
    dividerLine: "bg-line h-px",
    dividerText: "text-[11px] uppercase tracking-widest px-3",

    formFieldLabel: "text-[13px] font-medium",
    formFieldInput: "rounded-lg py-2.5",
    formFieldHintText: "text-[11px]",
    formFieldErrorText: "text-[11px]",
    formFieldSuccessText: "text-[11px]",
    formFieldAction: "text-[12px] hover:underline",

    // Slight vertical gradient, so the primary action reads as raised.
    formButtonPrimary:
      "rounded-lg py-2.5 font-semibold normal-case shadow-none after:hidden bg-linear-to-b from-accent to-[color-mix(in_srgb,var(--rv-accent)_86%,black)]",

    /**
     * The code boxes need a border they can actually be seen by.
     *
     * With only a radius set they inherited Clerk's border from
     * --clerk-color-border, which is our `line` token: 1.24:1 against the card
     * on dark. Six small empty boxes at that contrast simply are not there —
     * only the focused one showed, because the accent focus ring was the one
     * edge with any contrast.
     *
     * `line-input` exists for this. The ramp had a gap where this needed a
     * value — line-strong reaches 1.72:1, under the 3:1 WCAG asks of a
     * control's boundary — and the first fix reached for `faint`, the next step
     * up, which cleared the bar at 5.43:1 and read as a stark white box against
     * a black card. The token sits between them at 3.52:1: findable without
     * shouting.
     */
    otpCodeFieldInput: "rounded-lg border border-line-input bg-canvas",

    /**
     * Explicit padding, because the hidden footerItem below was what provided
     * the bottom spacing — without it the last line sat flush against the card
     * edge.
     */
    footer: "border-t border-line px-8 py-4",
    footerAction: "py-0",
    /**
     * Hides the "Secured by Clerk" badge, and with it the "Development mode"
     * chip that shares this container. Note that removing Clerk branding is a
     * paid-plan feature; hiding it on the free tier is a terms question.
     */
    footerItem: "hidden",
    footerActionText: "text-[13px]",
    footerActionLink: "font-medium hover:underline",

    logoBox: "hidden",
  },
};
