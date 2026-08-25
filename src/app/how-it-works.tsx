"use client";

import { useEffect, useRef, useState } from "react";

type Step = { title: string; body: string };

/**
 * The three steps, drawn one after another when they scroll into view.
 *
 * Each step is a cascade rather than a single fade: the number arrives, the
 * title follows it, the body follows that, and a line travels on to the next
 * number. So the section reads as a sequence being laid out, not three boxes
 * that happen to be numbered.
 *
 * The whole thing runs about three and a half seconds, which is slow on
 * purpose — this is the section that answers "what happens when I tap Join",
 * and it is worth watching once. It plays once and stops: a loop would pull
 * attention back every few seconds while someone is still reading step two.
 *
 * Every element also carries motion-reduce classes that force the finished
 * state. That is not only for the reduced-motion setting — it is the fallback
 * that keeps the copy visible if the observer never fires.
 */

/** Milliseconds between one step starting and the next. */
const STEP_GAP = 900;

/** Offsets within a single step, so its three parts arrive in reading order. */
const TITLE_OFFSET = 250;
const BODY_OFFSET = 420;
const LINE_OFFSET = 550;

export function HowItWorks({ steps }: { steps: Step[] }) {
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // No observer support: show it on the next frame rather than leaving the
    // section blank. Setting state straight from an effect body would cascade
    // a second render before paint.
    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      // Waits until a fifth of the section is up, so the animation is not
      // already over by the time it is worth looking at.
      { threshold: 0.2 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /** No delays until it has been seen, so nothing is mid-flight on first paint. */
  const delay = (ms: number) => ({ transitionDelay: shown ? `${ms}ms` : "0ms" });

  return (
    <ol ref={ref} className="mt-10 grid gap-9 sm:grid-cols-3 sm:gap-7">
      {steps.map((step, index) => {
        const start = index * STEP_GAP;

        return (
          <li key={step.title} className="relative flex flex-col gap-2.5">
            {/*
              Connector to the next number. Lives inside the step rather than
              spanning the whole list, because only then does it know where the
              badges actually are — it starts at this badge's edge and reaches
              across the grid gap. Hidden on a phone, where the steps stack.
            */}
            {index < steps.length - 1 && (
              <span
                aria-hidden
                className={`absolute left-10 top-4 -right-5 hidden h-px origin-left bg-line-strong transition-transform duration-[900ms] ease-out motion-reduce:scale-x-100 motion-reduce:transition-none sm:block ${
                  shown ? "scale-x-100" : "scale-x-0"
                }`}
                style={delay(start + LINE_OFFSET)}
              />
            )}

            <span
              aria-hidden
              className={`flex h-8 w-8 items-center justify-center rounded-full bg-accent font-display text-[13px] font-semibold text-accent-ink transition-[transform,opacity] duration-[900ms] ease-out motion-reduce:scale-100 motion-reduce:opacity-100 motion-reduce:transition-none ${
                shown ? "scale-100 opacity-100" : "scale-50 opacity-0"
              }`}
              style={delay(start)}
            >
              {index + 1}
            </span>

            <span
              className={`font-display text-[16px] font-semibold text-ink transition-[transform,opacity] duration-[800ms] ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${
                shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
              style={delay(start + TITLE_OFFSET)}
            >
              {step.title}
            </span>

            <span
              className={`text-[15px] leading-[1.6] text-muted transition-[transform,opacity] duration-[800ms] ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${
                shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
              style={delay(start + BODY_OFFSET)}
            >
              {step.body}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
