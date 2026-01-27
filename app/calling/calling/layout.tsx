import React from "react";
// import { requirePermission } from "../lib/requirePermission";

export default async function CallingLayout({ children }: { children: React.ReactNode }) {
//   await requirePermission("calling");
  return <>{children}</>;
}
