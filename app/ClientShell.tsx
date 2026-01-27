"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "./components/Navbar";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useSession();

  // hide on login page OR when not logged in
  const hideNavbar = pathname === "/login" || status !== "authenticated";

  return (
    <>
      {!hideNavbar ? <Navbar /> : null}
      {children}
    </>
  );
}
