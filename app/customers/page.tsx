"use client";

import React from "react";

type Gender = "M" | "F" | "Other" | "";
type Blacklisted = "Yes" | "No" | "";

type Customer = {
  _id: string;
  name: string;

  badgeNo?: string;
  fatherOrHusbandName?: string;
  gender?: Gender | string;
  age?: number | null;
  address?: string;
  mobile?: string;
  adhaarNumber?: string;

  blacklisted?: Blacklisted | string;

  emergencyNumber?: string;
  medicalDate?: string | null; // serialized ISO string OR "YYYY-MM-DD"
  notes?: string;
};

function fmtDate(d?: string | null) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "-";
  }
}

function toDateInputValue(d?: string | null) {
  if (!d) return "";
  return String(d).slice(0, 10);
}

// ✅ Strong id normalizer
function normalizeId(raw: any): string {
  const candidate =
    typeof raw === "string"
      ? raw
      : raw?.$oid
      ? raw.$oid
      : raw?.toString?.()
      ? raw.toString()
      : "";

  const s = String(candidate).trim();
  const match = s.match(/[a-fA-F0-9]{24}/);
  return (match?.[0] || "").trim();
}

function fmtExcelDate(d?: string | null) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function digitsOnly(s: string) {
  return (s || "").replace(/\D/g, "");
}

function validateCustomerInput(c: Customer) {
  const name = (c.name || "").trim();
  const badge = (c.badgeNo || "").trim();
  const aadhaar = digitsOnly(c.adhaarNumber || "").trim();
  const fh = (c.fatherOrHusbandName || "").trim();
  const addr = (c.address || "").trim();
  const mob = digitsOnly(c.mobile || "").trim();
  const gender = (c.gender as any) || "";
  const age = c.age;

  if (!name) return { ok: false, msg: "Name is required." };

  // ✅ One of Badge or Aadhaar must be filled
  if (!badge && !aadhaar) return { ok: false, msg: "Please fill either Badge No or Aadhaar (one is mandatory)." };

  // ✅ Mandatory fields
  if (!fh) return { ok: false, msg: "Father/Husband Name is mandatory." };
  if (!addr) return { ok: false, msg: "Address is mandatory." };
  if (!gender) return { ok: false, msg: "Gender is mandatory." };
  if (age === null || age === undefined || Number.isNaN(Number(age))) return { ok: false, msg: "Age is mandatory." };
  if (Number(age) <= 0) return { ok: false, msg: "Age must be a valid number." };
  if (!mob) return { ok: false, msg: "Mobile is mandatory." };

  if (aadhaar && aadhaar.length !== 12) return { ok: false, msg: "Aadhaar must be 12 digits (if provided)." };

  return { ok: true as const, msg: "" };
}

export default function CustomersPage() {
  const [items, setItems] = React.useState<Customer[]>([]);
  const [loading, setLoading] = React.useState(true);

  // search / filters
  const [q, setQ] = React.useState("");
  const [gender, setGender] = React.useState<Gender>("");
  const [blacklisted, setBlacklisted] = React.useState<Blacklisted>(""); // ✅ NEW
  const [ageMin, setAgeMin] = React.useState("");
  const [ageMax, setAgeMax] = React.useState("");
  const [medFrom, setMedFrom] = React.useState("");
  const [medTo, setMedTo] = React.useState("");

  // ✅ autocomplete
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [sugOpen, setSugOpen] = React.useState(false);
  const [highlightIndex, setHighlightIndex] = React.useState(-1);
  const sugBoxRef = React.useRef<HTMLDivElement | null>(null);

  // pagination
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  // edit modal
  const [editing, setEditing] = React.useState<Customer | null>(null);
  const [saving, setSaving] = React.useState(false);

  // export
  const [exporting, setExporting] = React.useState<"filtered" | "all" | null>(null);

  const columns = [
    { label: "S.No", width: "w-12" },
    { label: "Name", width: "w-32" },
    { label: "Badge No", width: "w-20" },
    { label: "Aadhaar", width: "w-28" },
    { label: "Father/Husband", width: "w-36" },
    { label: "Gender", width: "w-16" },
    { label: "Age", width: "w-12" },
    { label: "Address", width: "w-48" },
    { label: "Mobile", width: "w-28" },
    { label: "Blacklisted", width: "w-20" },
    { label: "Emergency", width: "w-28" },
    { label: "Medical Date", width: "w-24" },
    { label: "Notes", width: "w-40" },
    { label: "Actions", width: "w-28" },
  ];

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (gender) params.set("gender", gender);
      if (blacklisted) params.set("blacklisted", blacklisted); // ✅ NEW
      if (ageMin) params.set("ageMin", ageMin);
      if (ageMax) params.set("ageMax", ageMax);
      if (medFrom) params.set("medFrom", medFrom);
      if (medTo) params.set("medTo", medTo);

      const res = await fetch(`/api/customers?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      const safe: Customer[] = (data.items || [])
        .map((x: any) => {
          const _id = normalizeId(x._id);
          return { ...x, _id };
        })
        .filter((x: any) => /^[a-fA-F0-9]{24}$/.test(x._id));

      setItems(safe);
      setPage(1);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearFilters() {
    setQ("");
    setGender("");
    setBlacklisted("");
    setAgeMin("");
    setAgeMax("");
    setMedFrom("");
    setMedTo("");
    setPage(1);
    setSuggestions([]);
    setSugOpen(false);
    setHighlightIndex(-1);
  }

  async function onDelete(id: string) {
    const realId = normalizeId(id);
    if (!/^[a-fA-F0-9]{24}$/.test(realId)) {
      alert(`Invalid id in UI: "${String(id)}"`);
      return;
    }
    if (!confirm("Delete this record?")) return;

    const res = await fetch(`/api/customers/${realId}`, { method: "DELETE" });
    const txt = await res.text().catch(() => "");
    if (!res.ok) {
      alert(`Delete failed (${res.status}). ${txt}`);
      return;
    }
    await load();
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;

    const realId = normalizeId(editing._id);
    if (!/^[a-fA-F0-9]{24}$/.test(realId)) {
      alert(`Invalid id in edit: "${String(editing._id)}"`);
      return;
    }

    const v = validateCustomerInput(editing);
    if (!v.ok) {
      alert(v.msg);
      return;
    }

    setSaving(true);
    try {
      const { _id, ...rest } = editing;

      const payload = {
        ...rest,
        adhaarNumber: rest.adhaarNumber ? digitsOnly(String(rest.adhaarNumber)).slice(0, 12) : "",
        mobile: rest.mobile ? digitsOnly(String(rest.mobile)) : "",
        emergencyNumber: rest.emergencyNumber ? digitsOnly(String(rest.emergencyNumber)) : "",
        medicalDate: rest.medicalDate ? String(rest.medicalDate).slice(0, 10) : null,
        blacklisted: (rest.blacklisted as any) || "No",
      };

      const res = await fetch(`/api/customers/${realId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const txt = await res.text().catch(() => "");
      if (!res.ok) {
        alert(`Update failed (${res.status}). ${txt}`);
        return;
      }

      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  // --------- Export helpers ----------
  async function exportCustomersToExcel(rows: Customer[], filename: string) {
    const XLSX = await import("xlsx");

    const header = [
      "S.No",
      "Name",
      "Badge No",
      "Aadhaar",
      "Father/Husband",
      "Gender",
      "Age",
      "Address",
      "Mobile",
      "Blacklisted",
      "Emergency",
      "Medical Date",
      "Notes",
    ];

    const aoa: any[][] = [header];
    rows.forEach((c, idx) => {
      aoa.push([
        idx + 1,
        c.name || "",
        c.badgeNo || "",
        c.adhaarNumber || "",
        c.fatherOrHusbandName || "",
        c.gender || "",
        c.age ?? "",
        c.address || "",
        c.mobile || "",
        (c.blacklisted as any) || "No",
        c.emergencyNumber || "",
        fmtExcelDate(c.medicalDate),
        c.notes || "",
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, filename);
  }

  async function onExportFiltered() {
    try {
      setExporting("filtered");
      await exportCustomersToExcel(items, `customers_filtered_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e: any) {
      alert(e?.message || "Export failed");
    } finally {
      setExporting(null);
    }
  }

  async function onExportAll() {
    try {
      setExporting("all");
      const res = await fetch(`/api/customers?limit=10000`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      const safe: Customer[] = (data.items || [])
        .map((x: any) => ({ ...x, _id: normalizeId(x._id) }))
        .filter((x: any) => /^[a-fA-F0-9]{24}$/.test(x._id));

      await exportCustomersToExcel(safe, `customers_all_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e: any) {
      alert(e?.message || "Export failed");
    } finally {
      setExporting(null);
    }
  }

  // ---------- Pagination derived values ----------
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  React.useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageItems = items.slice(startIndex, endIndex);

  function getPageButtons() {
    const maxButtons = 7;
    if (totalPages <= maxButtons) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const left = Math.max(1, page - 2);
    const right = Math.min(totalPages, page + 2);

    const pages = new Set<number>([1, totalPages, page]);
    for (let p = left; p <= right; p++) pages.add(p);

    return Array.from(pages).sort((a, b) => a - b);
  }
  const pageButtons = getPageButtons();

  // ---------- Autocomplete (debounced) ----------
  React.useEffect(() => {
    const term = q.trim();
    setHighlightIndex(-1);

    if (!term) {
      setSuggestions([]);
      setSugOpen(false);
      return;
    }

    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers/suggest?q=${encodeURIComponent(term)}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data.suggestions) ? data.suggestions : [];
        setSuggestions(list);
        setSugOpen(list.length > 0);
      } catch {
        // ignore
      }
    }, 200);

    return () => window.clearTimeout(t);
  }, [q]);

  // close suggestions on outside click
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!sugBoxRef.current) return;
      if (!sugBoxRef.current.contains(e.target as Node)) {
        setSugOpen(false);
        setHighlightIndex(-1);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pickSuggestion(s: string) {
    setQ(s);
    setSugOpen(false);
    setHighlightIndex(-1);
    load();
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!sugOpen || suggestions.length === 0) {
      if (e.key === "Enter") load();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = highlightIndex >= 0 ? suggestions[highlightIndex] : suggestions[0];
      pickSuggestion(chosen);
    } else if (e.key === "Escape") {
      setSugOpen(false);
      setHighlightIndex(-1);
    }
  }

  return (
    <div className="app-page w-full max-w-none">
      <div className="app-card app-card-pad w-full max-w-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Sangat Data</h1>
            <p className="app-subtitle">Search, filter, edit and delete records.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                clearFilters();
                load();
              }}
              className="app-btn app-btn-secondary h-10 px-4"
            >
              Clear
            </button>

            <button onClick={load} className="app-btn app-btn-primary h-10 px-4">
              Search
            </button>

            <button
              onClick={onExportFiltered}
              disabled={exporting !== null || items.length === 0}
              className="app-btn app-btn-secondary h-10 px-4"
            >
              {exporting === "filtered" ? "Exporting..." : "Export Filtered"}
            </button>

            <button onClick={onExportAll} disabled={exporting !== null} className="app-btn app-btn-secondary h-10 px-4">
              {exporting === "all" ? "Exporting..." : "Export All"}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {/* Search with suggestions */}
          <div className="relative" ref={sugBoxRef}>
            <div className="app-label">Search</div>
            <input
              className="app-input app-input-sm"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSugOpen(true);
              }}
              onFocus={() => suggestions.length && setSugOpen(true)}
              onKeyDown={onSearchKeyDown}
              placeholder="Name / Mobile / Aadhaar / Badge"
            />

            {sugOpen && suggestions.length > 0 && (
              <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-zinc-950">
                {suggestions.map((s, idx) => (
                  <button
                    key={s + idx}
                    type="button"
                    onClick={() => pickSuggestion(s)}
                    className={[
                      "block w-full px-3 py-2 text-left text-sm",
                      idx === highlightIndex ? "bg-zinc-100 dark:bg-zinc-900/40" : "hover:bg-zinc-50 dark:hover:bg-zinc-900/30",
                    ].join(" ")}
                    title="Click to search"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="app-label">Gender</div>
            <select className="app-input app-input-sm" value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
              <option value="">All</option>
              <option value="M">M</option>
              <option value="F">F</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <div className="app-label">Blacklisted</div>
            <select className="app-input app-input-sm" value={blacklisted} onChange={(e) => setBlacklisted(e.target.value as Blacklisted)}>
              <option value="">All</option>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>

          <div>
            <div className="app-label">Age Min</div>
            <input className="app-input app-input-sm" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} inputMode="numeric" />
          </div>

          <div>
            <div className="app-label">Age Max</div>
            <input className="app-input app-input-sm" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} inputMode="numeric" />
          </div>

          <div>
            <div className="app-label">Medical From</div>
            <input type="date" className="app-input app-input-sm" value={medFrom} onChange={(e) => setMedFrom(e.target.value)} />
          </div>

          <div>
            <div className="app-label">Medical To</div>
            <input type="date" className="app-input app-input-sm" value={medTo} onChange={(e) => setMedTo(e.target.value)} />
          </div>
        </div>

        {/* Pagination bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Showing <span className="font-semibold">{total === 0 ? 0 : startIndex + 1}</span>–<span className="font-semibold">{Math.min(endIndex, total)}</span> of{" "}
            <span className="font-semibold">{total}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Rows:</div>
            <select
              className="app-input app-input-sm h-9"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <button className="app-btn app-btn-secondary h-9 px-3 text-xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Prev
            </button>

            <div className="flex items-center gap-1">
              {pageButtons.map((p, idx) => {
                const prev = pageButtons[idx - 1];
                const showDots = prev && p - prev > 1;
                return (
                  <React.Fragment key={p}>
                    {showDots && <span className="px-1 text-zinc-400">…</span>}
                    <button
                      className={[
                        "h-9 rounded-xl px-3 text-xs font-semibold",
                        p === page
                          ? "bg-black text-white dark:bg-white dark:text-black"
                          : "border border-black/10 bg-white hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900/40",
                      ].join(" ")}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            <button className="app-btn app-btn-secondary h-9 px-3 text-xs" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Next
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto mt-4">
          <table className="min-w-[1600px] table-fixed border-collapse text-xs">
            <thead className="thead">
              <tr>
                {columns.map((c) => (
                  <th key={c.label} className={`th ${c.width} whitespace-normal break-words px-2 py-2`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td className="td text-zinc-600 dark:text-zinc-400 whitespace-normal break-words px-2 py-2" colSpan={columns.length}>
                    Loading...
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td className="td text-zinc-600 dark:text-zinc-400 whitespace-normal break-words px-2 py-2" colSpan={columns.length}>
                    No records found.
                  </td>
                </tr>
              ) : (
                pageItems.map((c, i) => {
                  const serial = (page - 1) * pageSize + i + 1;

                  // ✅ FIX: TD order must match header order
                  return (
                    <tr key={c._id} className={["row", i % 2 === 0 ? "row-alt" : "row-alt2"].join(" ")}>
                      {/* S.No */}
                      <td className="td whitespace-nowrap px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setEditing({
                              ...c,
                              medicalDate: toDateInputValue(c.medicalDate),
                              blacklisted: (c.blacklisted as any) || "No",
                            })
                          }
                          className="rounded-lg px-2 py-1 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-900/40"
                          title="Click to edit"
                        >
                          {serial}
                        </button>
                      </td>

                      {/* Name */}
                      <td className="td whitespace-normal break-words px-2 py-2 font-medium">{c.name || "-"}</td>

                      {/* Badge No */}
                      <td className="td whitespace-normal break-words px-2 py-2">{c.badgeNo || "-"}</td>

                      {/* Aadhaar */}
                      <td className="td whitespace-normal break-all px-2 py-2">{c.adhaarNumber || "-"}</td>

                      {/* Father/Husband */}
                      <td className="td whitespace-normal break-words px-2 py-2">{c.fatherOrHusbandName || "-"}</td>

                      {/* Gender */}
                      <td className="td whitespace-normal break-words px-2 py-2">{(c.gender as any) || "-"}</td>

                      {/* Age */}
                      <td className="td whitespace-normal break-words px-2 py-2">{c.age ?? "-"}</td>

                      {/* Address */}
                      <td className="td whitespace-normal break-words px-2 py-2">{c.address || "-"}</td>

                      {/* Mobile */}
                      <td className="td whitespace-normal break-all px-2 py-2">{c.mobile || "-"}</td>

                      {/* Blacklisted */}
                      <td className="td whitespace-normal break-words px-2 py-2">{(c.blacklisted as any) || "No"}</td>

                      {/* Emergency */}
                      <td className="td whitespace-normal break-all px-2 py-2">{c.emergencyNumber || "-"}</td>

                      {/* Medical Date */}
                      <td className="td whitespace-normal break-words px-2 py-2">{fmtDate(c.medicalDate)}</td>

                      {/* Notes */}
                      <td className="td whitespace-normal break-words px-2 py-2">{c.notes || "-"}</td>

                      {/* Actions */}
                      <td className="td whitespace-nowrap px-2 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setEditing({
                                ...c,
                                medicalDate: toDateInputValue(c.medicalDate),
                                blacklisted: (c.blacklisted as any) || "No",
                              })
                            }
                            className="app-btn app-btn-secondary h-8 px-2 text-[11px]"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => onDelete(c._id)}
                            className="h-8 rounded-xl border border-red-200 bg-red-50 px-2 text-[11px] font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200 dark:hover:bg-red-900/30"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit Customer</h3>
              <button onClick={() => setEditing(null)} className="rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900/40">
                ✕
              </button>
            </div>

            <form onSubmit={onSaveEdit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* Name */}
              <input
                className="app-input app-input-sm"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Name"
                required
              />

              {/* Badge */}
              <input
                className="app-input app-input-sm"
                value={editing.badgeNo || ""}
                onChange={(e) => setEditing({ ...editing, badgeNo: e.target.value })}
                placeholder="Badge No"
              />

              {/* Aadhaar */}
              <input
                className="app-input app-input-sm"
                value={editing.adhaarNumber || ""}
                onChange={(e) => setEditing({ ...editing, adhaarNumber: digitsOnly(e.target.value).slice(0, 12) })}
                placeholder="Aadhaar"
                inputMode="numeric"
              />

              {/* Father/Husband */}
              <input
                className="app-input app-input-sm"
                value={editing.fatherOrHusbandName || ""}
                onChange={(e) => setEditing({ ...editing, fatherOrHusbandName: e.target.value })}
                placeholder="Father/Husband Name"
                required
              />

              {/* Gender */}
              <select
                className="app-input app-input-sm"
                value={(editing.gender as any) || ""}
                onChange={(e) => setEditing({ ...editing, gender: e.target.value as any })}
                required
              >
                <option value="">Gender</option>
                <option value="M">M</option>
                <option value="F">F</option>
                <option value="Other">Other</option>
              </select>

              {/* Age */}
              <input
                className="app-input app-input-sm"
                value={String(editing.age ?? "")}
                onChange={(e) => setEditing({ ...editing, age: e.target.value ? Number(e.target.value) : null })}
                placeholder="Age"
                inputMode="numeric"
                required
              />

              {/* Mobile */}
              <input
                className="app-input app-input-sm"
                value={editing.mobile || ""}
                onChange={(e) => setEditing({ ...editing, mobile: digitsOnly(e.target.value) })}
                placeholder="Mobile"
                inputMode="numeric"
                required
              />

              {/* Blacklisted */}
              <select
                className="app-input app-input-sm"
                value={(editing.blacklisted as any) || "No"}
                onChange={(e) => setEditing({ ...editing, blacklisted: e.target.value as any })}
              >
                <option value="No">Blacklisted: No</option>
                <option value="Yes">Blacklisted: Yes</option>
              </select>

              {/* Emergency */}
              <input
                className="app-input app-input-sm"
                value={editing.emergencyNumber || ""}
                onChange={(e) => setEditing({ ...editing, emergencyNumber: digitsOnly(e.target.value) })}
                placeholder="Emergency Number"
                inputMode="numeric"
              />

              {/* Medical Date */}
              <input
                type="date"
                className="app-input app-input-sm"
                value={(editing.medicalDate as any) || ""}
                onChange={(e) => setEditing({ ...editing, medicalDate: e.target.value })}
              />

              {/* Address */}
              <input
                className="app-input app-input-sm sm:col-span-2 lg:col-span-3"
                value={editing.address || ""}
                onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                placeholder="Address"
                required
              />

              {/* Notes */}
              <textarea
                className="app-textarea sm:col-span-2 lg:col-span-3"
                rows={4}
                value={editing.notes || ""}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                placeholder="Notes"
              />

              <div className="sm:col-span-2 lg:col-span-3 mt-2 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setEditing(null)} className="app-btn app-btn-secondary h-10 px-4">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="app-btn app-btn-primary h-10 px-4">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>

            <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Note: Either <span className="font-semibold">Badge No</span> or <span className="font-semibold">Aadhaar</span> must be filled.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
