"use client";

import { useEffect, useRef, useState } from "react";

type Step = { title: string; body: string };

/**
 * The three steps, drawn one after another when they scroll into view.
 *
 * A line travels from each number to the next and the step arrives behind it,
 * so the order reads as a sequence rather than three boxes that happen to be
 * numbered. It plays once — a loop would pull attention back every few seconds
 * while someone is still reading step two.
 */
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

  return (
    <ol ref={ref} className="mt-8 grid gap-9 sm:grid-cols-3 sm:gap-7">
      {steps.map((step, index) => (
        <li
          key={step.title}
          className={`relative flex flex-col gap-2.5 transition-all duration-500 ease-out motion-reduce:transition-none motion-reduce:translate-y-0 motion-reduce:opacity-100 ${
            shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
          style={{ transitionDelay: shown ? `${index * 260}ms` : "0ms" }}
        >
          {/*
            Connector to the next number. Lives inside the step rather than
            spanning the whole list, because only then does it know where the
            badges actually are — it starts at this badge's edge and reaches
            across the grid gap. Hidden on a phone, where the steps stack.
          */}
          {index < steps.length - 1 && (
            <span
              aria-hidden
              className={`absolute left-10 top-4 -right-5 hidden h-px origin-left bg-line transition-transform duration-500 ease-out motion-reduce:transition-none motion-reduce:scale-x-100 sm:block ${
                shown ? "scale-x-100" : "scale-x-0"
              }`}
              style={{ transitionDelay: shown ? `${index * 260 + 180}ms` : "0ms" }}
            />
          )}

          <span
            aria-hidden
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[13px] font-semibold text-accent-ink transition-transform duration-500 ease-out motion-reduce:transition-none motion-reduce:scale-100 ${
              shown ? "scale-100" : "scale-75"
            }`}
            style={{ transitionDelay: shown ? `${index * 260}ms` : "0ms" }}
          >
            {index + 1}
          </span>

          <span className="text-[15px] font-semibold text-ink">{step.title}</span>
          <span className="text-sm leading-relaxed text-muted">{step.body}</span>
        </li>
      ))}
    </ol>
  );
}
