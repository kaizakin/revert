import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/nextjs";

type Appearance = NonNullable<ComponentProps<typeof ClerkProvider>["appearance"]>;

/**
 * Themes Clerk's built-in components to match the app.
 *
 * Deliberately done with `elements` classNames rather than `variables` colours.
 * The variables API takes concrete colour strings that Clerk then shades
 * programmatically for hover and active states, so a CSS `var()` cannot be
 * passed — meaning a palette set that way has to be hardcoded light or dark.
 * Tailwind classes pointing at our tokens inherit prefers-color-scheme for
 * free, so the sign-in card follows the rest of the app with no theme
 * detection and no hydration mismatch.
 *
 * Unknown element keys are ignored by Clerk, so this stays safe across
 * versions even if an internal name changes.
 */
export const clerkAppearance: Appearance = {
  /**
   * Puts Clerk's CSS in a named layer. globals.css orders that layer before
   * `utilities`, so the classNames below actually take effect.
   */
  cssLayerName: "clerk",

  elements: {
    rootBox: "w-full",
    cardBox: "shadow-none border border-line rounded-xl",
    card: "bg-surface shadow-none border-0",

    header: "gap-1",
    headerTitle: "text-ink text-xl font-semibold tracking-tight",
    headerSubtitle: "text-muted text-[13px]",

    socialButtonsBlockButton:
      "bg-canvas border border-line text-ink hover:bg-raised transition-colors",
    socialButtonsBlockButtonText: "text-ink font-medium",

    dividerLine: "bg-line",
    dividerText: "text-faint text-[12px]",

    formFieldLabel: "text-ink text-[13px] font-medium",
    formFieldInput:
      "bg-canvas border border-line text-ink placeholder:text-faint focus:border-accent",
    formFieldInputShowPasswordButton: "text-muted hover:text-ink",
    formFieldHintText: "text-faint text-[11px]",
    formFieldErrorText: "text-danger text-[11px]",
    formFieldSuccessText: "text-accent text-[11px]",
    formFieldAction: "text-accent hover:underline text-[12px]",

    formButtonPrimary:
      "bg-accent text-accent-ink hover:opacity-90 transition-opacity normal-case font-semibold shadow-none after:hidden",
    formButtonReset: "text-muted hover:text-ink",

    otpCodeFieldInput: "bg-canvas border border-line text-ink",

    identityPreview: "bg-raised border border-line",
    identityPreviewText: "text-ink",
    identityPreviewEditButton: "text-accent",

    footer: "bg-transparent",
    footerAction: "bg-transparent",
    footerActionText: "text-muted text-[13px]",
    footerActionLink: "text-accent hover:underline font-medium",

    // Clerk's own badge. Left visible, just toned down to match.
    logoBox: "hidden",
    badge: "text-faint",
    footerPages: "text-faint",
  },
};
