"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const subTabs = [
  { href: "/nominal-roll/ladoo", label: "Ladoo" },
  { href: "/nominal-roll/parantha", label: "Parantha" },
  { href: "/nominal-roll/bhati", label: "Bhati" },
];

export default function NominalRollLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-page">
      <div className="app-card app-card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="app-title">Nominal Roll</h1>
            <p className="app-subtitle">Choose a category: Ladoo, Parantha, or Bhati.</p>
          </div>

          {/* Subtabs */}
          <div className="flex flex-wrap items-center gap-2">
            {subTabs.map((t) => {
              const active = pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={[
                    "rounded-xl px-4 py-2 text-sm font-semibold transition",
                    active
                      ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-black"
                      : "border border-black/10 bg-white hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900/30",
                  ].join(" ")}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
