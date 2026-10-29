"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

type AppRole = "admin" | "user";



type Tab = {
  href: string;
  label: string;
  key?: string; // permission key
    visible?: boolean; // ✅ IMPORTANT
};

const BASE_TABS: Tab[] = [
  { href: "/", label: "Add Sangat" }, // always visible
  { href: "/customers", label: "Sangat Data", key: "customers" },
  { href: "/bulk-upload", label: "Sangat Bulk Upload", key: "bulkUpload" },
  { href: "/train-data", label: "Ticket Data", key: "trainData" },
  { href: "/nominal-roll", label: "Nominal Roll", key: "nominalRoll" },
  { href: "/reports", label: "Reports", key: "reports" },
  { href: "/jatha-date", label: "Jatha Date", key: "jathaDate" },
  { href: "/calling", label: "Calling", key: "calling" }, // ✅ new
  { href: "/followup", label: "Followup", key: "followup" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const email = session?.user?.email || "";
  const role = ((session as any)?.role as AppRole) || "user";
  const isAdmin = role === "admin";

  const perms = (((session as any)?.permissions as Record<string, boolean>) || {}) as Record<
    string,
    boolean
  >;


  React.useEffect(() => {
  console.log("NAVBAR email:", session?.user?.email);
  console.log("NAVBAR role:", role);
  console.log("NAVBAR perms:", perms);
}, [session?.user?.email, role, perms]);
  const can = (key: string) => isAdmin || perms[key] === true;

  // ✅ build visible tabs each render (avoid stale memo deps)
  const tabs: Tab[] = [
    ...BASE_TABS.filter((t) => !t.key || can(t.key)),
    // ...(isAdmin ? [{ href: "/admin/users", label: "Admin" }] : []),
  ];

  const [open, setOpen] = React.useState(false);

  // ✅ fixed dropdown position
  const btnRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = React.useState<{ top: number; left: number } | null>(null);

  // ✅ close dropdown when route changes
  React.useEffect(() => setOpen(false), [pathname]);

  // ✅ close dropdown on outside click (but allow clicks inside dropdown)
  React.useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      if (!open) return;
      const target = e.target as Node;

      if (btnRef.current && btnRef.current.contains(target)) return;
      if (menuRef.current && menuRef.current.contains(target)) return;

      setOpen(false);
    }

    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [open]);

  async function onLogout() {
    const ok = window.confirm("Are you sure you want to logout?");
    if (!ok) return;
    await signOut({ callbackUrl: "/login" });
  }

  function toggleMenu() {
    const el = btnRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();

    const width = 256; // w-64
    const leftRaw = r.left;
    const left = Math.min(leftRaw, window.innerWidth - width - 12);

    setMenuPos({
      top: r.bottom + 8,
      left: Math.max(12, left),
    });

    setOpen((v) => !v);
  }

  return (
    <header className="sticky top-0 z-50 w-full px-4 py-2 sm:px-6 lg:px-10 xl:px-14 bg-white dark:bg-black">
      <div className="app-card">
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 sm:p-3">
          {/* Left: Title + Email/Role */}
          <div>
            <div className="text-base font-semibold">Jatha Manager</div>
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-tight">
              {email ? (
                <>
                  <span className="font-medium">{email}</span>
                  <span className="mx-2">•</span>
                  <span className="uppercase">{role}</span>
                </>
              ) : null}
            </div>
          </div>

          {/* Center: Tabs */}
          <nav className="flex flex-wrap items-center gap-2">
            {tabs.map((t) => {
              const active = pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={[
                    "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
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

          {/* Right: Profile dropdown trigger */}
          <div>
            <button
              ref={btnRef}
              type="button"
              onClick={toggleMenu}
              className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900/30 transition"
              aria-expanded={open}
              aria-haspopup="menu"
            >
              Profile ▾
            </button>
          </div>
        </div>
      </div>

      {/* ✅ Fixed dropdown (not clipped) */}
      {open && menuPos ? (
        <div
          ref={menuRef}
          className="fixed z-[9999] w-64 rounded-xl border border-black/10 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-zinc-950"
          style={{ top: menuPos.top, left: menuPos.left }}
          role="menu"
        >
          <div className="px-3 py-2">
            <div className="text-sm font-semibold">Signed in</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 break-all">{email || "-"}</div>
            <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-500 uppercase">{role}</div>
          </div>

          <div className="my-2 h-px bg-black/10 dark:bg-white/10" />

          {isAdmin ? (
            <Link
              href="/admin/users"
              className="block rounded-lg px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/30"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              Admin Users
            </Link>
          ) : null}

          <button
            onClick={onLogout}
            className="w-full text-left rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            role="menuitem"
          >
            Logout
          </button>
        </div>
      ) : null}
    </header>
  );
}
