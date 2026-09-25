"use client";

import { useState } from "react";
import { howItWorks } from "@/features/landing/data";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "buyers", label: "For Buyers" },
  { key: "sellers", label: "For Sellers" },
] as const;

export function HowItWorks() {
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("buyers");
  const steps = howItWorks[tab];

  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="mx-auto max-w-7xl scroll-mt-8 px-4 py-20 sm:px-6 sm:py-28">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 id="how-heading" className="text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl">
            How it works.
          </h2>
          <p className="mt-4 max-w-md text-base text-[var(--color-muted)]">
            Discover homes, follow sellers, and plan your next visit. Selling? Showcase your properties and manage
            buyer inquiries in one place.
          </p>
          <div role="tablist" aria-label="Audience" className="mt-8 inline-flex gap-1 rounded-full border border-[var(--color-border)] bg-white p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                type="button"
                id={`how-tab-${t.key}`}
                aria-selected={tab === t.key}
                aria-controls="how-panel"
                onClick={() => setTab(t.key)}
                className={cn(
                  "rounded-full px-5 py-2 text-sm transition-colors",
                  tab === t.key ? "bg-[var(--color-foreground)] font-medium text-white" : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <ol id="how-panel" role="tabpanel" aria-labelledby={`how-tab-${tab}`} className="space-y-4 lg:col-span-7">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-5 rounded-[24px] border border-[var(--color-border)] bg-white p-6">
              <span aria-hidden="true" className="text-3xl font-light leading-none text-[var(--color-muted-foreground)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-lg font-medium leading-snug">{step.title}</h3>
                <p className="mt-1.5 text-sm text-[var(--color-muted)]">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
