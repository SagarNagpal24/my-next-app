"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Add Sangat" },
  { href: "/customers", label: "Sangat Data" },
  { href: "/bulk-upload", label: "Bulk Upload" },
  { href:"/train-data", label: "Train Data" },
     { href:"/nominal-roll" ,label: "Nominal Roll" },
      { href:"/jatha-date" ,label: "Jatha Date" },

];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="w-full px-4 py-6 sm:px-6 lg:px-10 xl:px-14">
      <div className="app-card">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <div>
            <div className="text-lg font-semibold">Jatha Manager</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400"></div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            {tabs.map((t) => {
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
          </nav>
        </div>
      </div>
    </header>
  );
}
