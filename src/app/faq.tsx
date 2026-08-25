"use client";

import { useId, useState } from "react";

type Item = { q: string; a: string };

/**
 * Questions that open one at a time.
 *
 * Four answers laid out flat is a wall of text on a phone, and the whole point
 * of a FAQ is that you read the one line that is your question. The first is
 * open on load so the affordance is obvious without a tap.
 *
 * Built on buttons rather than <details> because the open height has to be
 * animatable in every browser, and ::details-content is not there yet.
 */
export function Faq({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();

  return (
    <div className="mt-6 divide-y divide-line border-y border-line">
      {items.map((item, index) => {
        const isOpen = open === index;
        const panelId = `${baseId}-panel-${index}`;
        const buttonId = `${baseId}-button-${index}`;

        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:text-accent"
              >
                <span className="text-[15px] font-semibold text-ink">{item.q}</span>

                <span
                  aria-hidden
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-transform duration-300 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4">
                    <path
                      d="M6 9.5l6 6 6-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
            </h3>

            {/*
              Animating grid rows from 0fr to 1fr is the one way to transition
              to a height nobody knows in advance. The inner div must own the
              overflow, or the text spills while it is collapsing.
            */}
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              // display:none would cancel the transition, so the collapsed
              // panel is hidden by height and taken out of the tab order and
              // the accessibility tree by inert instead.
              inert={!isOpen}
              className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <p className="max-w-2xl pb-5 pr-10 text-sm leading-relaxed text-muted">
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
